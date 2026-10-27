import { randomUUID } from "node:crypto";
import { constants as bufferConstants } from "node:buffer";
import http from "node:http";
import https from "node:https";
import { FileIdCache } from "./cache.js";
import { compressBody, decompressBody } from "./compression.js";
import { DeepSeekFilesClient } from "./deepseek-files.js";
import { ImageRewriter } from "./rewrite.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "host",
]);
const SERIALIZED_JSON_MAX_BYTES = Math.min(
  480 * 1024 * 1024,
  bufferConstants.MAX_STRING_LENGTH - 32 * 1024 * 1024,
);

function copyHeaders(headers, { omitContentLength = true } = {}) {
  const output = {};
  for (const [name, value] of Object.entries(headers || {})) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    if (omitContentLength && lower === "content-length") {
      continue;
    }
    if (value !== undefined) {
      output[lower] = value;
    }
  }
  return output;
}

function readBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) {
        return;
      }
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const error = new Error(
          `Request body exceeds the ${maxBytes}-byte proxy limit`,
        );
        error.statusCode = 413;
        chunks.length = 0;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks, total));
      }
    });
    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

function sendJson(response, statusCode, payload) {
  if (response.headersSent) {
    response.end();
    return;
  }
  const body = Buffer.from(`${JSON.stringify(payload)}\n`);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
  });
  response.end(body);
}

function buildUpstreamUrl(baseUrl, incomingUrl) {
  const base = new URL(baseUrl);
  const incoming = new URL(incomingUrl, "http://127.0.0.1");
  const basePath = base.pathname.replace(/\/+$/, "");
  const incomingPath = incoming.pathname.startsWith("/")
    ? incoming.pathname
    : `/${incoming.pathname}`;
  base.pathname = `${basePath}${incomingPath}`.replace(/\/{2,}/g, "/");
  base.search = incoming.search;
  return base;
}

function isResponsesPath(pathname) {
  return pathname === "/responses" || pathname === "/v1/responses";
}

export async function createProxyServer(config, dependencies = {}) {
  const logger = dependencies.logger || console;
  const serializedJsonMaxBytes =
    dependencies.serializedJsonMaxBytes ?? SERIALIZED_JSON_MAX_BYTES;
  const cache = dependencies.cache || new FileIdCache(config.cacheFile);
  if (!dependencies.cache) {
    await cache.init();
  }
  const filesClient =
    dependencies.filesClient ||
    new DeepSeekFilesClient({
      baseUrl: config.deepseekBaseUrl,
      fileTtlSeconds: config.fileTtlSeconds,
      retries: config.uploadRetries,
      timeoutMs: config.upstreamTimeoutMs,
    });
  const rewriter =
    dependencies.rewriter ||
    new ImageRewriter({
      cache,
      filesClient,
      maxImageBytes: config.maxImageBytes,
      uploadConcurrency: config.uploadConcurrency,
      allowInlineFallback: config.allowInlineFallback,
    });

  const stats = {
    startedAt: new Date().toISOString(),
    requests: 0,
    responsesRequests: 0,
    rewrittenRequests: 0,
    imagesSeen: 0,
    uniqueImages: 0,
    cacheHits: 0,
    uploadedImages: 0,
    uploadedImageBytes: 0,
    incomingResponsesBytes: 0,
    outgoingResponsesBytes: 0,
    inlineImageBytes: 0,
    rewrittenImageBytes: 0,
    fallbackImages: 0,
    upstreamErrors: 0,
    lastRequest: null,
    lastError: null,
  };

  async function forward(request, response, body, headers) {
    const upstreamUrl = buildUpstreamUrl(config.deepseekBaseUrl, request.url);
    const transport = upstreamUrl.protocol === "https:" ? https : http;
    const outgoingHeaders = copyHeaders(headers);
    outgoingHeaders.host = upstreamUrl.host;
    outgoingHeaders["content-length"] = String(body.length);

    await new Promise((resolve) => {
      const upstream = transport.request(
        upstreamUrl,
        {
          method: request.method,
          headers: outgoingHeaders,
        },
        (upstreamResponse) => {
          const responseHeaders = copyHeaders(upstreamResponse.headers, {
            omitContentLength: false,
          });
          response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
          upstreamResponse.pipe(response);
          upstreamResponse.on("error", (error) => {
            stats.upstreamErrors += 1;
            stats.lastError = {
              at: new Date().toISOString(),
              message: error.message,
            };
            response.destroy(error);
            resolve();
          });
          upstreamResponse.on("end", resolve);
        },
      );

      if (config.upstreamTimeoutMs > 0) {
        upstream.setTimeout(config.upstreamTimeoutMs, () => {
          upstream.destroy(new Error("Upstream request timed out"));
        });
      }
      upstream.on("error", (error) => {
        stats.upstreamErrors += 1;
        stats.lastError = {
          at: new Date().toISOString(),
          message: error.message,
        };
        if (!response.headersSent) {
          sendJson(response, 502, {
            error: {
              code: "media_proxy_upstream_error",
              message: error.message,
            },
          });
        } else {
          response.destroy(error);
        }
        resolve();
      });
      response.on("close", () => {
        if (!response.writableEnded) {
          upstream.destroy();
        }
      });
      upstream.end(body);
    });
  }

  const server = http.createServer(async (request, response) => {
    const requestId = randomUUID();
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");

    if (request.method === "GET" && requestUrl.pathname === "/__media_proxy/health") {
      sendJson(response, 200, {
        ok: true,
        service: "codex-deepseek-media-proxy",
        listening: `http://${config.host}:${config.port}`,
        upstream: config.deepseekBaseUrl,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/__media_proxy/stats") {
      sendJson(response, 200, {
        ...stats,
        cache: cache.stats(),
        memory: process.memoryUsage(),
      });
      return;
    }

    stats.requests += 1;

    try {
      let body = await readBody(request, config.maxRequestBytes);
      let headers = { ...request.headers };

      if (
        request.method === "POST" &&
        isResponsesPath(requestUrl.pathname) &&
        body.length > 0
      ) {
        stats.responsesRequests += 1;
        const contentEncoding = headers["content-encoding"];
        const decoded = await decompressBody(
          body,
          contentEncoding,
          config.maxRequestBytes,
        );

        let rewriteStats;
        let rewrittenBody;
        if (decoded.length <= serializedJsonMaxBytes) {
          let payload;
          try {
            payload = JSON.parse(decoded.toString("utf8"));
          } catch (error) {
            const wrapped = new Error(
              `Responses request is not valid JSON: ${error.message}`,
            );
            wrapped.statusCode = 400;
            throw wrapped;
          }
          rewriteStats = await rewriter.rewrite(payload, {
            headers,
          });
          rewrittenBody = Buffer.from(JSON.stringify(payload));
        } else {
          const rewritten = await rewriter.rewriteSerialized(decoded, {
            headers,
          });
          const { buffer: _buffer, ...serializedStats } = rewritten;
          rewriteStats = serializedStats;
          rewrittenBody = rewritten.buffer;
        }
        stats.imagesSeen += rewriteStats.imagesSeen;
        stats.uniqueImages += rewriteStats.uniqueImages;
        stats.cacheHits += rewriteStats.cacheHits;
        stats.uploadedImages += rewriteStats.uploadedImages;
        stats.uploadedImageBytes += rewriteStats.uploadedBytes;
        stats.inlineImageBytes += rewriteStats.inlineImageBytes;
        stats.rewrittenImageBytes += rewriteStats.rewrittenImageBytes;
        stats.fallbackImages += rewriteStats.fallbackImages;
        stats.incomingResponsesBytes += decoded.length;
        const wasRewritten = rewriteStats.imagesSeen > 0;
        body = await compressBody(rewrittenBody, contentEncoding);
        stats.outgoingResponsesBytes += body.length;
        stats.lastRequest = {
          id: requestId,
          at: new Date().toISOString(),
          path: requestUrl.pathname,
          incomingBodyBytes: decoded.length,
          outgoingBodyBytes: body.length,
          rewriteMode:
            decoded.length <= serializedJsonMaxBytes ? "json" : "buffer",
          ...rewriteStats,
        };
        if (wasRewritten) {
          stats.rewrittenRequests += 1;
          logger.info?.(
            `[rewrite] request=${requestId} images=${rewriteStats.imagesSeen} ` +
              `unique=${rewriteStats.uniqueImages} uploaded=${rewriteStats.uploadedImages} ` +
              `cacheHits=${rewriteStats.cacheHits} bytes=${rewriteStats.inlineImageBytes}->` +
              `${rewriteStats.rewrittenImageBytes} body=${decoded.length}->${body.length} ` +
              `durationMs=${rewriteStats.durationMs}`,
          );
        }
        headers = {
          ...headers,
          "content-type": headers["content-type"] || "application/json",
        };
      }

      await forward(request, response, body, headers);
    } catch (error) {
      stats.lastError = {
        at: new Date().toISOString(),
        message: error.message,
      };
      const statusCode = error.statusCode || 502;
      logger.error?.(`[error] request=${requestId} status=${statusCode} ${error.message}`);
      sendJson(response, statusCode, {
        error: {
          code:
            statusCode === 413
              ? "media_proxy_request_too_large"
              : "media_proxy_error",
          message: error.message,
        },
      });
    }
  });

  server.on("clientError", (error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  return {
    server,
    cache,
    stats,
    config,
    listen() {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => {
          server.off("error", reject);
          const address = server.address();
          resolve({
            host: address.address,
            port: address.port,
            url: `http://${address.address}:${address.port}`,
          });
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
