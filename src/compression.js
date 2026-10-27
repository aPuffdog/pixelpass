import {
  brotliCompress,
  brotliDecompress,
  deflate,
  deflateSync,
  gunzip,
  gzip,
  inflate,
  zstdCompress,
  zstdDecompress,
} from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);
const zstdCompressAsync = promisify(zstdCompress);
const zstdDecompressAsync = promisify(zstdDecompress);

function parseEncodings(header) {
  return String(header || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value && value !== "identity");
}

export async function decompressBody(buffer, contentEncoding, maxOutputLength) {
  const encodings = parseEncodings(contentEncoding);
  let output = buffer;

  for (const encoding of encodings.reverse()) {
    const options = maxOutputLength ? { maxOutputLength } : undefined;
    switch (encoding) {
      case "gzip":
      case "x-gzip":
        output = await gunzipAsync(output, options);
        break;
      case "deflate":
        output = await inflateAsync(output, options);
        break;
      case "br":
        output = await brotliDecompressAsync(output, options);
        break;
      case "zstd":
        output = await zstdDecompressAsync(output, options);
        break;
      default:
        throw new Error(`Unsupported content-encoding: ${encoding}`);
    }
  }

  return output;
}

export async function compressBody(buffer, contentEncoding) {
  const encodings = parseEncodings(contentEncoding);
  let output = buffer;

  for (const encoding of encodings) {
    switch (encoding) {
      case "gzip":
      case "x-gzip":
        output = await gzipAsync(output);
        break;
      case "deflate":
        output = await deflateAsync(output);
        break;
      case "br":
        output = await brotliCompressAsync(output);
        break;
      case "zstd":
        output = await zstdCompressAsync(output);
        break;
      default:
        throw new Error(`Unsupported content-encoding: ${encoding}`);
    }
  }

  return output;
}

// Kept exported for a cheap deterministic smoke test in environments where
// asynchronous zstd support differs from the synchronous API.
export function deflateIdentityForTest(buffer) {
  return deflateSync(buffer);
}
