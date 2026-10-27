import { authFingerprint, parseImageDataUrl } from "./data-url.js";
import { pickAuthHeaders } from "./deepseek-files.js";
import { findSerializedImages } from "./serialized-images.js";

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(concurrency, 1), items.length) },
      () => worker(),
    ),
  );
  return results;
}

function collectImageNodes(value, nodes) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageNodes(item, nodes);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  if (
    value.type === "input_image" &&
    typeof value.image_url === "string" &&
    value.image_url.startsWith("data:image/")
  ) {
    nodes.push(value);
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      collectImageNodes(child, nodes);
    }
  }
}

export class ImageRewriter {
  constructor({
    cache,
    filesClient,
    maxImageBytes,
    uploadConcurrency,
    allowInlineFallback,
  }) {
    this.cache = cache;
    this.filesClient = filesClient;
    this.maxImageBytes = maxImageBytes;
    this.uploadConcurrency = uploadConcurrency;
    this.allowInlineFallback = allowInlineFallback;
  }

  async resolveImages(images, authHeaders, accountFingerprint) {
    return mapWithConcurrency(
      images,
      this.uploadConcurrency,
      async (image) => {
        const cached = await this.cache.get(accountFingerprint, image.sha256);
        if (cached) {
          return {
            image,
            fileId: cached.fileId,
            cacheHit: true,
            uploadedBytes: 0,
            fallback: false,
          };
        }

        try {
          const uploaded = await this.filesClient.upload(image, authHeaders);
          await this.cache.set(accountFingerprint, image.sha256, {
            fileId: uploaded.fileId,
            bytes: image.bytes.length,
            mime: image.mime,
            createdAt: new Date().toISOString(),
            expiresAt: uploaded.expiresAt,
          });
          return {
            image,
            fileId: uploaded.fileId,
            cacheHit: false,
            uploadedBytes: uploaded.uploadBytes,
            fallback: false,
          };
        } catch (error) {
          if (!this.allowInlineFallback) {
            throw error;
          }
          return {
            image,
            fileId: null,
            cacheHit: false,
            uploadedBytes: 0,
            fallback: true,
            error,
          };
        }
      },
    );
  }

  async rewrite(root, { headers }) {
    const startedAt = performance.now();
    const nodes = [];
    collectImageNodes(root, nodes);

    if (nodes.length === 0) {
      return {
        imagesSeen: 0,
        uniqueImages: 0,
        cacheHits: 0,
        uploadedImages: 0,
        uploadedBytes: 0,
        inlineImageBytes: 0,
        rewrittenImageBytes: 0,
        fallbackImages: 0,
        durationMs: Math.round(performance.now() - startedAt),
      };
    }

    const authHeaders = pickAuthHeaders(headers);
    const accountFingerprint = authFingerprint(authHeaders);
    const unique = new Map();

    for (const node of nodes) {
      const parsed = parseImageDataUrl(node.image_url, {
        maxBytes: this.maxImageBytes,
      });
      const current = unique.get(parsed.sha256);
      if (current) {
        current.nodes.push(node);
      } else {
        unique.set(parsed.sha256, {
          ...parsed,
          nodes: [node],
        });
      }
    }

    const resolved = await this.resolveImages(
      [...unique.values()],
      authHeaders,
      accountFingerprint,
    );

    let inlineImageBytes = 0;
    let rewrittenImageBytes = 0;
    let cacheHits = 0;
    let uploadedImages = 0;
    let uploadedBytes = 0;
    let fallbackImages = 0;

    for (const result of resolved) {
      if (result.cacheHit) {
        cacheHits += 1;
      }
      if (result.uploadedBytes > 0) {
        uploadedImages += 1;
        uploadedBytes += result.uploadedBytes;
      }
      if (result.fallback) {
        fallbackImages += 1;
      }

      for (const node of result.image.nodes) {
        inlineImageBytes += node.image_url.length;
        if (result.fileId) {
          delete node.image_url;
          node.file_id = result.fileId;
          rewrittenImageBytes += result.fileId.length + 24;
        } else {
          rewrittenImageBytes += node.image_url.length;
        }
      }
    }

    return {
      imagesSeen: nodes.length,
      uniqueImages: unique.size,
      cacheHits,
      uploadedImages,
      uploadedBytes,
      inlineImageBytes,
      rewrittenImageBytes,
      fallbackImages,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  async rewriteSerialized(buffer, { headers }) {
    const startedAt = performance.now();
    const images = findSerializedImages(buffer, {
      maxBytes: this.maxImageBytes,
    });
    if (images.length === 0) {
      return {
        buffer,
        imagesSeen: 0,
        uniqueImages: 0,
        cacheHits: 0,
        uploadedImages: 0,
        uploadedBytes: 0,
        inlineImageBytes: 0,
        rewrittenImageBytes: 0,
        fallbackImages: 0,
        durationMs: Math.round(performance.now() - startedAt),
      };
    }

    const authHeaders = pickAuthHeaders(headers);
    const accountFingerprint = authFingerprint(authHeaders);
    const unique = new Map();
    for (const image of images) {
      const current = unique.get(image.sha256);
      if (current) {
        current.occurrences.push(image);
      } else {
        unique.set(image.sha256, {
          ...image,
          occurrences: [image],
        });
      }
    }

    const resolved = await this.resolveImages(
      [...unique.values()],
      authHeaders,
      accountFingerprint,
    );
    let inlineImageBytes = 0;
    let rewrittenImageBytes = 0;
    let cacheHits = 0;
    let uploadedImages = 0;
    let uploadedBytes = 0;
    let fallbackImages = 0;
    const replacements = [];

    for (const result of resolved) {
      if (result.cacheHit) {
        cacheHits += 1;
      }
      if (result.uploadedBytes > 0) {
        uploadedImages += 1;
        uploadedBytes += result.uploadedBytes;
      }
      if (result.fallback) {
        fallbackImages += 1;
      }

      for (const occurrence of result.image.occurrences) {
        inlineImageBytes += occurrence.inlineBytes;
        if (result.fileId) {
          replacements.push({
            start: occurrence.keyStart,
            end: occurrence.valueEnd + 1,
            fileId: result.fileId,
          });
          rewrittenImageBytes += result.fileId.length + 24;
        } else {
          rewrittenImageBytes += occurrence.inlineBytes;
        }
      }
    }

    replacements.sort((left, right) => left.start - right.start);
    const chunks = [];
    let inputCursor = 0;
    let outputBytes = 0;
    for (const replacement of replacements) {
      const before = buffer.subarray(inputCursor, replacement.start);
      const replacementBuffer = Buffer.from(
        `"file_id":${JSON.stringify(replacement.fileId)}`,
      );
      chunks.push(before, replacementBuffer);
      outputBytes += before.length + replacementBuffer.length;
      inputCursor = replacement.end;
    }
    const tail = buffer.subarray(inputCursor);
    chunks.push(tail);
    outputBytes += tail.length;

    return {
      buffer: replacements.length > 0 ? Buffer.concat(chunks, outputBytes) : buffer,
      imagesSeen: images.length,
      uniqueImages: unique.size,
      cacheHits,
      uploadedImages,
      uploadedBytes,
      inlineImageBytes,
      rewrittenImageBytes,
      fallbackImages,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }
}
