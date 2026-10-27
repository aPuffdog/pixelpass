import { createHash } from "node:crypto";

const DATA_IMAGE_PATTERN =
  /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i;

const EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function parseImageDataUrl(value, { maxBytes }) {
  if (typeof value !== "string") {
    throw new Error("image_url must be a string");
  }
  const match = DATA_IMAGE_PATTERN.exec(value);
  if (!match) {
    throw new Error("image_url is not a supported base64 image data URL");
  }

  const mime = match[1].toLowerCase() === "image/jpg"
    ? "image/jpeg"
    : match[1].toLowerCase();
  const extension = EXTENSIONS.get(mime);
  if (!extension) {
    throw new Error(
      `Unsupported image MIME type ${mime}; expected PNG, JPEG, WebP, or GIF`,
    );
  }

  const base64 = match[2].replace(/\s+/g, "");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new Error("Image data URL contains no image bytes");
  }
  if (bytes.length > maxBytes) {
    throw new Error(
      `Image is ${bytes.length} bytes, exceeding the ${maxBytes}-byte limit`,
    );
  }

  return {
    bytes,
    mime,
    extension,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function authFingerprint(authHeaders) {
  const value =
    authHeaders?.authorization ??
    authHeaders?.["x-api-key"] ??
    "unauthenticated";
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
