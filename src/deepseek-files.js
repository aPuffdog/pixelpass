import { setTimeout as delay } from "node:timers/promises";

export class DeepSeekUploadError extends Error {
  constructor(message, { status = null, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "DeepSeekUploadError";
    this.status = status;
    this.retryable = retryable;
  }
}

export function pickAuthHeaders(headers) {
  const picked = {};
  for (const name of ["authorization", "x-api-key"]) {
    const value = headers?.[name];
    if (value) {
      picked[name] = Array.isArray(value) ? value[0] : value;
    }
  }
  return picked;
}

function retryDelayMs(response, attempt) {
  const retryAfter = response?.headers?.get?.("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, 10_000);
    }
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 10_000);
    }
  }
  return Math.min(250 * 2 ** attempt, 4_000);
}

export class DeepSeekFilesClient {
  constructor({
    baseUrl,
    fileTtlSeconds,
    retries,
    fetchImpl = globalThis.fetch,
    sleepImpl = delay,
    timeoutMs = 10 * 60 * 1000,
  }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fileTtlSeconds = fileTtlSeconds;
    this.retries = retries;
    this.fetchImpl = fetchImpl;
    this.sleepImpl = sleepImpl;
    this.timeoutMs = timeoutMs;
  }

  async upload({ bytes, mime, extension, sha256 }, authHeaders) {
    if (!Object.keys(authHeaders || {}).length) {
      throw new DeepSeekUploadError(
        "The request has no authorization or x-api-key header",
      );
    }

    const form = new FormData();
    form.append("purpose", "user_data");
    form.append(
      "file",
      new Blob([bytes], { type: mime }),
      `image-${sha256.slice(0, 20)}.${extension}`,
    );
    if (this.fileTtlSeconds > 0) {
      form.append("expires_after[anchor]", "created_at");
      form.append("expires_after[seconds]", String(this.fileTtlSeconds));
    }

    let lastError = null;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}/files`, {
          method: "POST",
          headers: authHeaders,
          body: form,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        lastError = new DeepSeekUploadError(
          `DeepSeek file upload failed: ${error.message}`,
          { retryable: true, cause: error },
        );
        if (attempt < this.retries) {
          await this.sleepImpl(retryDelayMs(null, attempt));
          continue;
        }
        throw lastError;
      }

      const text = await response.text();
      if (!response.ok) {
        const retryable =
          response.status === 408 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status >= 500;
        lastError = new DeepSeekUploadError(
          `DeepSeek file upload returned HTTP ${response.status}: ${text.slice(0, 500)}`,
          { status: response.status, retryable },
        );
        if (retryable && attempt < this.retries) {
          await this.sleepImpl(retryDelayMs(response, attempt));
          continue;
        }
        throw lastError;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new DeepSeekUploadError(
          "DeepSeek file upload returned invalid JSON",
          { status: response.status, cause: error },
        );
      }
      const fileId = payload?.id;
      if (typeof fileId !== "string" || !fileId) {
        throw new DeepSeekUploadError(
          "DeepSeek file upload response did not contain a file id",
          { status: response.status },
        );
      }

      const expiresAt =
        typeof payload.expires_at === "number"
          ? new Date(payload.expires_at * 1000).toISOString()
          : this.fileTtlSeconds > 0
            ? new Date(Date.now() + this.fileTtlSeconds * 1000).toISOString()
            : null;

      return {
        fileId,
        expiresAt,
        uploadBytes: bytes.length,
      };
    }

    throw lastError ?? new DeepSeekUploadError("DeepSeek file upload failed");
  }
}
