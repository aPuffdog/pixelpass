import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { zstdCompress, zstdDecompress } from "node:zlib";
import { loadConfig } from "../src/config.js";
import { createProxyServer } from "../src/proxy-server.js";

const zstdCompressAsync = promisify(zstdCompress);
const zstdDecompressAsync = promisify(zstdDecompress);
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);
const IMAGE_DATA_URL = `data:image/png;base64,${PNG.toString("base64")}`;

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("rewrites repeated inline images to one cached DeepSeek file id", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ds-media-proxy-test-"));
  let uploadCount = 0;
  const upstreamBodies = [];

  const upstream = http.createServer(async (request, response) => {
    if (request.method === "POST" && request.url === "/files") {
      uploadCount += 1;
      await collectBody(request);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: "file-api-test", bytes: PNG.length }));
      return;
    }

    if (request.method === "POST" && request.url === "/responses") {
      let body = await collectBody(request);
      if (request.headers["content-encoding"] === "zstd") {
        body = await zstdDecompressAsync(body);
      }
      const payload = JSON.parse(body.toString("utf8"));
      upstreamBodies.push(payload);
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      response.write('event: response.output_text.delta\ndata: {"delta":"OK"}\n\n');
      response.end("event: response.completed\ndata: {}\n\n");
      return;
    }

    response.writeHead(404);
    response.end();
  });

  const upstreamAddress = await listen(upstream);
  const baseConfig = loadConfig({
    MEDIA_PROXY_DATA_DIR: temporary,
    MEDIA_PROXY_PORT: "0",
    MEDIA_PROXY_FILE_TTL_SECONDS: "0",
    MEDIA_PROXY_UPLOAD_RETRIES: "0",
  });
  const proxy = await createProxyServer({
    ...baseConfig,
    deepseekBaseUrl: `http://127.0.0.1:${upstreamAddress.port}`,
  }, { serializedJsonMaxBytes: 1 });
  const proxyAddress = await proxy.listen();

  try {
    const payload = {
      model: "deepseek-flash",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: "Check this image" },
            { type: "input_image", image_url: IMAGE_DATA_URL },
          ],
        },
        {
          type: "custom_tool_call_output",
          call_id: "call-1",
          output: [
            { type: "input_image", image_url: IMAGE_DATA_URL },
          ],
        },
      ],
    };
    const compressed = await zstdCompressAsync(
      Buffer.from(JSON.stringify(payload)),
    );

    const first = await fetch(`${proxyAddress.url}/responses`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-key",
        "content-type": "application/json",
        "content-encoding": "zstd",
      },
      body: compressed,
    });
    assert.equal(first.status, 200);
    assert.match(await first.text(), /response\.completed/);

    const second = await fetch(`${proxyAddress.url}/responses`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-key",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    assert.equal(second.status, 200);
    await second.text();

    assert.equal(uploadCount, 1);
    assert.equal(upstreamBodies.length, 2);
    for (const upstreamPayload of upstreamBodies) {
      const serialized = JSON.stringify(upstreamPayload);
      assert.doesNotMatch(serialized, /data:image/);
      assert.equal(
        (serialized.match(/file-api-test/g) || []).length,
        2,
      );
    }

    const statsResponse = await fetch(
      `${proxyAddress.url}/__media_proxy/stats`,
    );
    const stats = await statsResponse.json();
    assert.equal(stats.imagesSeen, 4);
    assert.equal(stats.uploadedImages, 1);
    assert.equal(stats.cacheHits, 1);
    assert.equal(stats.lastRequest.rewriteMode, "buffer");
    assert.equal("buffer" in stats.lastRequest, false);
  } finally {
    await proxy.close();
    await close(upstream);
    await rm(temporary, { recursive: true, force: true });
  }
});
