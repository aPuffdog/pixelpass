import assert from "node:assert/strict";
import test from "node:test";
import { parseImageDataUrl } from "../src/data-url.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);

test("parses a supported base64 image", () => {
  const parsed = parseImageDataUrl(
    `data:image/png;base64,${PNG.toString("base64")}`,
    { maxBytes: 1024 },
  );
  assert.equal(parsed.mime, "image/png");
  assert.equal(parsed.extension, "png");
  assert.deepEqual(parsed.bytes, PNG);
  assert.match(parsed.sha256, /^[a-f0-9]{64}$/);
});

test("rejects non-image data URLs", () => {
  assert.throws(
    () => parseImageDataUrl("data:text/plain;base64,aGVsbG8=", { maxBytes: 1024 }),
    /not a supported base64 image/,
  );
});
