import { parseImageDataUrl } from "./data-url.js";

const IMAGE_URL_KEY = Buffer.from('"image_url"');
const QUOTE = 0x22;
const COLON = 0x3a;
const WHITESPACE = new Set([0x20, 0x09, 0x0a, 0x0d]);

function skipWhitespace(buffer, index) {
  let cursor = index;
  while (cursor < buffer.length && WHITESPACE.has(buffer[cursor])) {
    cursor += 1;
  }
  return cursor;
}

export function findSerializedImages(buffer, { maxBytes }) {
  const images = [];
  let cursor = 0;

  while (true) {
    const keyStart = buffer.indexOf(IMAGE_URL_KEY, cursor);
    if (keyStart < 0) {
      break;
    }

    let valueQuote = skipWhitespace(buffer, keyStart + IMAGE_URL_KEY.length);
    if (buffer[valueQuote] !== COLON) {
      cursor = keyStart + IMAGE_URL_KEY.length;
      continue;
    }
    valueQuote = skipWhitespace(buffer, valueQuote + 1);
    if (buffer[valueQuote] !== QUOTE) {
      cursor = keyStart + IMAGE_URL_KEY.length;
      continue;
    }

    const valueStart = valueQuote + 1;
    const valueEnd = buffer.indexOf(QUOTE, valueStart);
    if (valueEnd < 0) {
      throw new Error("Responses request contains an unterminated JSON string");
    }
    const value = buffer.subarray(valueStart, valueEnd);

    if (value.subarray(0, 11).toString("ascii") !== "data:image/") {
      cursor = valueEnd + 1;
      continue;
    }

    // Reject an oversized image before allocating its ASCII and decoded forms.
    const maximumEncodedBytes = Math.ceil((maxBytes * 4) / 3) + 64;
    if (value.length > maximumEncodedBytes) {
      throw new Error(
        `Image is approximately ${Math.floor((value.length * 3) / 4)} bytes, ` +
          `exceeding the ${maxBytes}-byte limit`,
      );
    }

    const parsed = parseImageDataUrl(value.toString("ascii"), {
      maxBytes,
    });
    images.push({
      ...parsed,
      keyStart,
      valueEnd,
      inlineBytes: value.length,
    });
    cursor = valueEnd + 1;
  }

  return images;
}
