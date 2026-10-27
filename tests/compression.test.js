import assert from "node:assert/strict";
import test from "node:test";
import { brotliCompressSync, gzipSync, zstdCompressSync } from "node:zlib";
import { compressBody, decompressBody } from "../src/compression.js";

const SAMPLE = Buffer.from("Codex media proxy compression test");

for (const [encoding, encoder] of [
  ["gzip", gzipSync],
  ["br", brotliCompressSync],
  ["zstd", zstdCompressSync],
]) {
  test(`round-trips ${encoding}`, async () => {
    const encoded = encoder(SAMPLE);
    const decoded = await decompressBody(encoded, encoding, 1024 * 1024);
    assert.deepEqual(decoded, SAMPLE);
    const encodedAgain = await compressBody(decoded, encoding);
    const decodedAgain = await decompressBody(
      encodedAgain,
      encoding,
      1024 * 1024,
    );
    assert.deepEqual(decodedAgain, SAMPLE);
  });
}
