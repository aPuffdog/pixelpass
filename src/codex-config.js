import { chmod, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNewlines(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function findSection(lines, sectionName) {
  const header = new RegExp(
    `^\\s*\\[${escapeRegExp(sectionName)}\\]\\s*(?:#.*)?$`,
  );
  const start = lines.findIndex((line) => header.test(line));
  if (start < 0) {
    throw new Error(`Codex config does not contain [${sectionName}]`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[.*\]\s*(?:#.*)?$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { start, end };
}

export function readActiveProviderConfig(text) {
  const providerMatch = /^\s*model_provider\s*=\s*["']([^"']+)["']/m.exec(text);
  if (!providerMatch) {
    throw new Error("Codex config does not define model_provider");
  }

  const provider = providerMatch[1];
  const sectionName = `model_providers.${provider}`;
  const newline = normalizeNewlines(text);
  const lines = text.split(/\r?\n/);
  const section = findSection(lines, sectionName);
  const baseUrlPattern =
    /^(\s*base_url\s*=\s*)(["'])(.*?)\2(\s*(?:#.*)?)$/;
  let baseUrl = null;
  let lineIndex = -1;

  for (let index = section.start + 1; index < section.end; index += 1) {
    const match = baseUrlPattern.exec(lines[index]);
    if (match) {
      baseUrl = match[3];
      lineIndex = index;
      break;
    }
  }

  if (!baseUrl) {
    throw new Error(`[${sectionName}] does not contain a quoted base_url`);
  }

  return {
    provider,
    sectionName,
    baseUrl,
    lineIndex,
    newline,
    lines,
    section,
  };
}

export function updateActiveProviderBaseUrl(text, baseUrl) {
  const current = readActiveProviderConfig(text);
  const replacement =
    `  base_url = ${JSON.stringify(baseUrl)}`;
  const lines = [...current.lines];

  if (current.lineIndex >= 0) {
    const indent = /^\s*/.exec(lines[current.lineIndex])?.[0] || "";
    const pattern =
      /^(\s*base_url\s*=\s*)(["'])(.*?)\2(\s*(?:#.*)?)$/;
    const match = pattern.exec(lines[current.lineIndex]);
    const suffix = match?.[4] || "";
    lines[current.lineIndex] =
      `${indent}base_url = ${JSON.stringify(baseUrl)}${suffix}`;
  } else {
    lines.splice(current.section.start + 1, 0, replacement);
  }

  return lines.join(current.newline);
}

export function isLocalProxyBaseUrl(value, port = 17892) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["127.0.0.1", "localhost", "::1"].includes(url.hostname) &&
      Number(url.port || (url.protocol === "https:" ? 443 : 80)) === port
    );
  } catch {
    return false;
  }
}

export async function loadCodexConfig(configFile) {
  try {
    const text = await readFile(configFile, "utf8");
    return { text, ...readActiveProviderConfig(text) };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Codex config was not found at ${configFile}`);
    }
    throw error;
  }
}

export async function writeFileAtomically(file, text) {
  const metadata = await stat(file);
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(temporary, text, {
    encoding: "utf8",
    mode: metadata.mode & 0o777,
  });
  await chmod(temporary, metadata.mode & 0o777);
  await rename(temporary, file);
}

export async function backupCodexConfig(configFile) {
  const text = await readFile(configFile, "utf8");
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const backup = `${configFile}.backup-${timestamp}`;
  await writeFile(backup, text, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await chmod(backup, 0o600);
  return backup;
}
