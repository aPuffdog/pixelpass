import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIB = 1024 * 1024;

function integerFromEnv(env, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function booleanFromEnv(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  if (raw === "true" || raw === "1") {
    return true;
  }
  if (raw === "false" || raw === "0") {
    return false;
  }
  throw new Error(`${name} must be true or false`);
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("DEEPSEEK_BASE_URL must use http or https");
  }
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function loadConfig(env = process.env) {
  const dataDir = env.MEDIA_PROXY_DATA_DIR
    ? path.resolve(env.MEDIA_PROXY_DATA_DIR)
    : path.join(PROJECT_ROOT, "data");

  return {
    host: env.MEDIA_PROXY_HOST || "127.0.0.1",
    port: integerFromEnv(env, "MEDIA_PROXY_PORT", 17892, { min: 0, max: 65535 }),
    deepseekBaseUrl: normalizeBaseUrl(
      env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    ),
    cacheFile:
      env.MEDIA_PROXY_CACHE_FILE || path.join(dataDir, "file-id-cache.json"),
    fileTtlSeconds: integerFromEnv(
      env,
      "MEDIA_PROXY_FILE_TTL_SECONDS",
      30 * 24 * 60 * 60,
      { min: 0, max: 30 * 24 * 60 * 60 },
    ),
    maxRequestBytes: integerFromEnv(
      env,
      "MEDIA_PROXY_MAX_REQUEST_BYTES",
      256 * MIB,
      { min: MIB, max: 1024 * MIB },
    ),
    maxImageBytes: 64 * MIB,
    uploadConcurrency: integerFromEnv(
      env,
      "MEDIA_PROXY_UPLOAD_CONCURRENCY",
      4,
      { min: 1, max: 16 },
    ),
    uploadRetries: integerFromEnv(
      env,
      "MEDIA_PROXY_UPLOAD_RETRIES",
      3,
      { min: 0, max: 10 },
    ),
    upstreamTimeoutMs: integerFromEnv(
      env,
      "MEDIA_PROXY_UPSTREAM_TIMEOUT_MS",
      10 * 60 * 1000,
      { min: 5_000, max: 60 * 60 * 1000 },
    ),
    allowInlineFallback: booleanFromEnv(
      env,
      "MEDIA_PROXY_ALLOW_INLINE_FALLBACK",
      false,
    ),
  };
}

export const projectRoot = PROJECT_ROOT;
