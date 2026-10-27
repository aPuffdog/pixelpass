import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_VERSION = 1;

export class FileIdCache {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
    this.entries = {};
    this.saveQueue = Promise.resolve();
  }

  async init() {
    await mkdir(path.dirname(this.cacheFile), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.cacheFile, "utf8"));
      if (parsed?.version !== CACHE_VERSION || typeof parsed.entries !== "object") {
        throw new Error("Unsupported cache format");
      }
      this.entries = parsed.entries;
    } catch (error) {
      if (error?.code === "ENOENT") {
        this.entries = {};
        return;
      }
      const backup = `${this.cacheFile}.corrupt-${Date.now()}`;
      try {
        await rename(this.cacheFile, backup);
      } catch {
        // A read-only or concurrently replaced cache should not prevent startup.
      }
      this.entries = {};
      console.warn(`[cache] ignored invalid cache and wrote a backup at ${backup}`);
    }
  }

  static key(accountFingerprint, sha256) {
    return `${accountFingerprint}:${sha256}`;
  }

  async get(accountFingerprint, sha256, now = Date.now()) {
    const key = FileIdCache.key(accountFingerprint, sha256);
    const entry = this.entries[key];
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= now) {
      delete this.entries[key];
      await this.save();
      return null;
    }
    return entry;
  }

  async set(accountFingerprint, sha256, entry) {
    this.entries[FileIdCache.key(accountFingerprint, sha256)] = entry;
    await this.save();
  }

  async save() {
    this.saveQueue = this.saveQueue.catch(() => {}).then(async () => {
      const temporary = `${this.cacheFile}.${process.pid}.${Date.now()}.tmp`;
      const body = JSON.stringify(
        {
          version: CACHE_VERSION,
          updatedAt: new Date().toISOString(),
          entries: this.entries,
        },
        null,
        2,
      );
      await writeFile(temporary, body, { encoding: "utf8", mode: 0o600 });
      try {
        await rename(temporary, this.cacheFile);
      } catch (error) {
        if (error?.code !== "EEXIST" && error?.code !== "EPERM") {
          throw error;
        }
        await writeFile(this.cacheFile, body, { encoding: "utf8", mode: 0o600 });
        await unlink(temporary).catch(() => {});
      }
    });
    return this.saveQueue;
  }

  stats(now = Date.now()) {
    const entries = Object.values(this.entries);
    const active = entries.filter(
      (entry) => !entry.expiresAt || Date.parse(entry.expiresAt) > now,
    );
    return {
      cachedImages: active.length,
      cachedImageBytes: active.reduce(
        (sum, entry) => sum + Number(entry.bytes || 0),
        0,
      ),
      expiredImages: entries.length - active.length,
    };
  }
}
