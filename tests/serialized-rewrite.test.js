import assert from "node:assert/strict";
import test from "node:test";
import { ImageRewriter } from "../src/rewrite.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);
const IMAGE_DATA_URL = `data:image/png;base64,${PNG.toString("base64")}`;
const SECOND_IMAGE_DATA_URL = `data:image/png;base64,${Buffer.from(
  "second-image",
).toString("base64")}`;

class MemoryCache {
  constructor() {
    this.entries = new Map();
  }

  async get(account, sha256) {
    return this.entries.get(`${account}:${sha256}`) || null;
  }

  async set(account, sha256, value) {
    this.entries.set(`${account}:${sha256}`, value);
  }
}

test("rewrites images in a serialized JSON buffer without parsing the whole JSON", async () => {
  let uploads = 0;
  const rewriter = new ImageRewriter({
    cache: new MemoryCache(),
    filesClient: {
      async upload() {
        const suffix = uploads + 1;
        uploads += 1;
        return {
          fileId: `file-api-serialized-${suffix}`,
          expiresAt: null,
          uploadBytes: PNG.length,
        };
      },
    },
    maxImageBytes: 1024,
    uploadConcurrency: 2,
    allowInlineFallback: false,
  });

  const body = Buffer.from(
    JSON.stringify({
      model: "deepseek-flash",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: "Inspect both images" },
            { type: "input_image", image_url: IMAGE_DATA_URL },
            { type: "input_image", image_url: SECOND_IMAGE_DATA_URL },
            { type: "input_image", image_url: IMAGE_DATA_URL },
          ],
        },
      ],
    }),
  );

  const result = await rewriter.rewriteSerialized(body, {
    headers: { authorization: "Bearer test-key" },
  });
  const parsed = JSON.parse(result.buffer.toString("utf8"));

  assert.equal(uploads, 2);
  assert.equal(result.imagesSeen, 3);
  assert.equal(result.uniqueImages, 2);
  assert.equal(result.uploadedImages, 2);
  assert.doesNotMatch(result.buffer.toString("utf8"), /data:image/);
  assert.deepEqual(
    parsed.input[0].content.slice(1).map((part) => part.file_id),
    [
      "file-api-serialized-1",
      "file-api-serialized-2",
      "file-api-serialized-1",
    ],
  );
});
