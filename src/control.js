import { spawnSync } from "node:child_process";
import {
  appendFile,
  chmod,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadConfig, projectRoot } from "./config.js";
import {
  backupCodexConfig,
  isLocalProxyBaseUrl,
  loadCodexConfig,
  updateActiveProviderBaseUrl,
  writeFileAtomically,
} from "./codex-config.js";

const LABEL = "com.codex.deepseek-media-proxy";
const DEFAULT_UPSTREAM = "https://api.deepseek.com";
const CLI_NAME = "deepseek-proxy";
const UID = typeof process.getuid === "function" ? process.getuid() : null;
const DOMAIN = UID === null ? null : `gui/${UID}`;
const HOME = os.homedir();
const CODEX_CONFIG = path.join(
  process.env.CODEX_HOME || path.join(HOME, ".codex"),
  "config.toml",
);
const LAUNCH_AGENTS_DIR = path.join(HOME, "Library", "LaunchAgents");
const LAUNCH_AGENT_FILE = path.join(LAUNCH_AGENTS_DIR, `${LABEL}.plist`);
const LOG_DIR = path.join(HOME, "Library", "Logs", "CodexDeepSeekMediaProxy");
const DATA_DIR = path.resolve(
  process.env.MEDIA_PROXY_DATA_DIR ||
    path.join(
      HOME,
      "Library",
      "Application Support",
      "CodexDeepSeekMediaProxy",
      "data",
    ),
);
const STATE_FILE = path.join(DATA_DIR, "control-state.json");
const HEALTH_TIMEOUT_MS = 900;
const START_TIMEOUT_MS = 12_000;
const MANAGED_MAX_REQUEST_BYTES = 1024 * 1024 * 1024;

const ansi = process.stdout.isTTY
  ? {
      reset: "\u001b[0m",
      bold: "\u001b[1m",
      dim: "\u001b[2m",
      green: "\u001b[32m",
      yellow: "\u001b[33m",
      red: "\u001b[31m",
      cyan: "\u001b[36m",
    }
  : Object.fromEntries(
      ["reset", "bold", "dim", "green", "yellow", "red", "cyan"].map(
        (name) => [name, ""],
      ),
    );

function paint(color, value) {
  return `${ansi[color]}${value}${ansi.reset}`;
}

function print(message = "") {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function assertMacOS() {
  if (process.platform !== "darwin") {
    fail("This control command currently supports macOS LaunchAgent only");
  }
  if (!DOMAIN) {
    fail("Unable to determine the current macOS user id");
  }
}

function runtimeConfig() {
  return loadConfig({
    ...process.env,
    MEDIA_PROXY_DATA_DIR: DATA_DIR,
    MEDIA_PROXY_MAX_REQUEST_BYTES:
      process.env.MEDIA_PROXY_MAX_REQUEST_BYTES ||
      String(MANAGED_MAX_REQUEST_BYTES),
  });
}

async function ensurePrivateDirectories() {
  for (const directory of [DATA_DIR, path.dirname(STATE_FILE), LOG_DIR]) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
  }
  await mkdir(LAUNCH_AGENTS_DIR, { recursive: true });
  for (const name of ["proxy.stdout.log", "proxy.stderr.log"]) {
    const logFile = path.join(LOG_DIR, name);
    await appendFile(logFile, "", { mode: 0o600 });
    await chmod(logFile, 0o600);
  }
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    if (allowFailure) {
      return { ...result, status: 1 };
    }
    fail(`${command} failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`,
    );
  }
  return result;
}

function launchctl(...args) {
  return run("/bin/launchctl", args, { allowFailure: true });
}

function isServiceLoaded() {
  if (!DOMAIN) {
    return false;
  }
  return launchctl("print", `${DOMAIN}/${LABEL}`).status === 0;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderLaunchAgent() {
  const stdout = path.join(LOG_DIR, "proxy.stdout.log");
  const stderr = path.join(LOG_DIR, "proxy.stderr.log");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(process.execPath)}</string>
    <string>${xmlEscape(path.join(projectRoot, "src", "cli.js"))}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(projectRoot)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>MEDIA_PROXY_DATA_DIR</key>
    <string>${xmlEscape(DATA_DIR)}</string>
    <key>MEDIA_PROXY_MAX_REQUEST_BYTES</key>
    <string>${runtimeConfig().maxRequestBytes}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>3</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>Umask</key>
  <integer>63</integer>
  <key>StandardOutPath</key>
  <string>${xmlEscape(stdout)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(stderr)}</string>
</dict>
</plist>
`;
}

async function installServiceDefinition() {
  assertMacOS();
  await ensurePrivateDirectories();
  const plist = renderLaunchAgent();
  await writeFile(LAUNCH_AGENT_FILE, plist, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(LAUNCH_AGENT_FILE, 0o600);
}

async function startService({ restart = false } = {}) {
  assertMacOS();
  await installServiceDefinition();

  if (isServiceLoaded() && restart) {
    const unload = launchctl("bootout", DOMAIN, LAUNCH_AGENT_FILE);
    if (unload.status !== 0 && isServiceLoaded()) {
      fail("launchd could not unload the media proxy before restart");
    }
  }

  if (isServiceLoaded()) {
    if (!restart) {
      launchctl("kickstart", `${DOMAIN}/${LABEL}`);
    }
  } else {
    const bootstrap = launchctl(
      "bootstrap",
      DOMAIN,
      LAUNCH_AGENT_FILE,
    );
    if (bootstrap.status !== 0) {
      const detail = (bootstrap.stderr || bootstrap.stdout || "").trim();
      fail(
        `launchd could not load the media proxy${detail ? `: ${detail}` : ""}`,
      );
    }
    launchctl("enable", `${DOMAIN}/${LABEL}`);
    launchctl("kickstart", `${DOMAIN}/${LABEL}`);
  }

  const config = runtimeConfig();
  const health = await waitForHealth(config);
  if (!health.ok) {
    const logHint = path.join(LOG_DIR, "proxy.stderr.log");
    fail(`Media proxy did not become healthy; inspect ${logHint}`);
  }
  return config;
}

async function stopService() {
  assertMacOS();
  const result = launchctl("bootout", DOMAIN, LAUNCH_AGENT_FILE);
  if (result.status === 0) {
    await unlink(LAUNCH_AGENT_FILE).catch((error) => {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    });
    return true;
  }
  if (!isServiceLoaded()) {
    await unlink(LAUNCH_AGENT_FILE).catch((error) => {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    });
    return false;
  }
  const detail = (result.stderr || result.stdout || "").trim();
  fail(`launchd could not stop the media proxy${detail ? `: ${detail}` : ""}`);
}

async function readState() {
  try {
    const value = JSON.parse(await readFile(STATE_FILE, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    return { corruptState: true };
  }
}

async function writeState(value) {
  await ensurePrivateDirectories();
  const body = `${JSON.stringify(
    {
      ...value,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`;
  await writeFile(STATE_FILE, body, { encoding: "utf8", mode: 0o600 });
  await chmod(STATE_FILE, 0o600);
}

async function removeState() {
  await unlink(STATE_FILE).catch((error) => {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  });
}

async function requestJson(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Keep null for a malformed response.
    }
    return { ok: response.ok, status: response.status, json, text };
  } catch (error) {
    return { ok: false, status: null, json: null, error: error.message };
  }
}

async function getHealth(config = runtimeConfig()) {
  return requestJson(
    `http://${config.host}:${config.port}/__media_proxy/health`,
  );
}

async function getStats(config = runtimeConfig()) {
  return requestJson(
    `http://${config.host}:${config.port}/__media_proxy/stats`,
  );
}

async function waitForHealth(config) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  let health = await getHealth(config);
  while (!health.ok && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    health = await getHealth(config);
  }
  return health;
}

async function loadConfigs() {
  const codex = await loadCodexConfig(CODEX_CONFIG);
  const config = runtimeConfig();
  const proxyRoute = isLocalProxyBaseUrl(codex.baseUrl, config.port);
  return { codex, config, proxyRoute };
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  }
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

function yesNo(value, yes = "开启", no = "关闭") {
  return value ? paint("green", yes) : paint("dim", no);
}

async function status() {
  const { codex, config, proxyRoute } = await loadConfigs();
  const [health, stats, state] = await Promise.all([
    getHealth(config),
    getStats(config),
    readState(),
  ]);
  const serviceLoaded = isServiceLoaded();
  const running = serviceLoaded && health.ok;
  const data = stats.json || {};
  const lastRequest = data.lastRequest || null;

  print(paint("bold", "DeepSeek Media Proxy"));
  print(
    `代理服务     ${yesNo(running, "运行中", "已停止")}  launchd=${yesNo(
      serviceLoaded,
      "已加载",
      "未加载",
    )}`,
  );
  print(
    `健康检查     ${
      health.ok
        ? paint("green", `正常  ${config.host}:${config.port}`)
        : serviceLoaded
          ? paint(
              "red",
              health.error || `失败  HTTP ${health.status ?? "无响应"}`,
            )
          : paint("dim", "未运行")
    }`,
  );
  print(
    `Codex 路由   ${
      proxyRoute
        ? paint("green", "经过本地代理")
        : paint("yellow", "直连 DeepSeek（代理未接管）")
    }`,
  );
  print(`Provider     ${codex.provider}`);
  print(`base_url     ${codex.baseUrl}`);
  print(
    `入口上限     ${(config.maxRequestBytes / 1024 / 1024).toFixed(0)} MiB`,
  );
  print(
    `原始地址     ${state.originalBaseUrl || paint("dim", "尚未记录")}`,
  );

  if (health.ok && data.requests !== undefined) {
    print("");
    print(paint("bold", "流量统计"));
    print(
      `请求 ${data.responsesRequests ?? 0}  ` +
        `图片 ${data.imagesSeen ?? 0}  ` +
        `上传 ${data.uploadedImages ?? 0}  ` +
        `缓存命中 ${data.cacheHits ?? 0}`,
    );
    print(
      `Responses 请求体 ${formatBytes(
        data.incomingResponsesBytes,
      )} -> ${formatBytes(data.outgoingResponsesBytes)}`,
    );
    if (lastRequest) {
      print(
        `最近请求 ${lastRequest.imagesSeen ?? 0} 张图片，` +
          `${formatBytes(lastRequest.incomingBodyBytes)} -> ` +
          `${formatBytes(lastRequest.outgoingBodyBytes)}` +
          (lastRequest.rewriteMode ? ` (${lastRequest.rewriteMode})` : ""),
      );
    }
  }

  if (proxyRoute && !running) {
    print("");
    print(
      paint(
        "red",
        "警告：Codex 指向代理，但代理没有运行。可执行 on 恢复，或 off 回到直连。",
      ),
    );
  }
  if (proxyRoute && running) {
    print("");
    print(
      paint(
        "dim",
        "提示：切换后需完全退出 Codex，并新建或 fork 任务才会生效。",
      ),
    );
  }
  return { ...data, serviceLoaded, running, proxyRoute };
}

async function on() {
  const before = await loadConfigs();
  let originalBaseUrl = before.codex.baseUrl;
  const alreadyProxy = isLocalProxyBaseUrl(
    originalBaseUrl,
    before.config.port,
  );
  const state = await readState();
  if (alreadyProxy) {
    originalBaseUrl =
      state.originalBaseUrl &&
      !isLocalProxyBaseUrl(state.originalBaseUrl, before.config.port)
        ? state.originalBaseUrl
        : DEFAULT_UPSTREAM;
  }

  print("正在启动代理服务...");
  const config = await startService({ restart: isServiceLoaded() });
  print(paint("green", `代理健康检查通过：${config.host}:${config.port}`));

  if (!alreadyProxy) {
    await writeState({
      provider: before.codex.provider,
      originalBaseUrl,
    });
    const backup = await backupCodexConfig(CODEX_CONFIG);
    const nextText = updateActiveProviderBaseUrl(
      before.codex.text,
      `http://127.0.0.1:${config.port}`,
    );
    await writeFileAtomically(CODEX_CONFIG, nextText);
    print(paint("green", "Codex 已切换到本地代理。"));
    print(`配置备份：${backup}`);
  } else {
    print("Codex 已经指向本地代理。");
  }

  print("");
  print(
    paint(
      "yellow",
      "现在完全退出并重新打开 Codex，然后新建或 fork 一个任务。",
    ),
  );
}

async function off() {
  const current = await loadConfigs();
  const state = await readState();
  const target =
    state.originalBaseUrl &&
    !isLocalProxyBaseUrl(state.originalBaseUrl, current.config.port)
      ? state.originalBaseUrl
      : DEFAULT_UPSTREAM;

  if (current.proxyRoute) {
    const backup = await backupCodexConfig(CODEX_CONFIG);
    const nextText = updateActiveProviderBaseUrl(current.codex.text, target);
    await writeFileAtomically(CODEX_CONFIG, nextText);
    print(paint("green", `Codex 已恢复直连：${target}`));
    print(`配置备份：${backup}`);
  } else {
    print("Codex 当前没有经过代理，无需修改配置。");
  }

  const stopped = await stopService();
  print(
    stopped
      ? paint("green", "代理服务已关闭。")
      : paint("dim", "代理服务本来就已停止。"),
  );
  print("");
  print(
    paint(
      "yellow",
      "完全退出并重新打开 Codex 后，直连配置才会生效。",
    ),
  );
}

async function start() {
  const config = await startService({ restart: isServiceLoaded() });
  print(paint("green", `代理服务已启动：http://${config.host}:${config.port}`));
  const current = await loadConfigs();
  if (!current.proxyRoute) {
    print(
      paint(
        "yellow",
        "Codex 目前仍为直连。要让 Codex 使用代理，请执行 on。",
      ),
    );
  }
}

async function stop() {
  const current = await loadConfigs();
  const stopped = await stopService();
  print(
    stopped
      ? paint("green", "代理服务已停止。")
      : paint("dim", "代理服务本来就已停止。"),
  );
  if (current.proxyRoute) {
    print(
      paint(
        "red",
        "注意：Codex 仍指向已停止的代理。安全关闭整套请使用 off。",
      ),
    );
  }
}

async function restart() {
  const config = await startService({ restart: true });
  print(
    paint("green", `代理服务已重启：http://${config.host}:${config.port}`),
  );
}

async function doctor() {
  const checks = [];
  let failed = false;
  const add = (ok, label, detail) => {
    checks.push({ ok, label, detail });
    failed ||= !ok;
  };

  add(
    Number(process.versions.node.split(".")[0]) >= 22,
    "Node.js",
    process.versions.node,
  );
  add(
    typeof fetch === "function" &&
      typeof File === "function" &&
      typeof FormData === "function",
    "运行时能力",
    "fetch / File / FormData",
  );

  let current;
  try {
    current = await loadConfigs();
    add(true, "Codex 配置", current.codex.sectionName);
  } catch (error) {
    add(false, "Codex 配置", error.message);
  }

  const health = await getHealth();
  add(health.ok, "代理健康", health.error || `HTTP ${health.status}`);

  if (current) {
    add(
      !current.proxyRoute || health.ok,
      "路由一致性",
      current.proxyRoute
        ? health.ok
          ? "Codex 指向代理，代理健康"
          : "Codex 指向代理，但代理不可用"
        : health.ok
          ? "Codex 直连 DeepSeek，代理仅待命"
          : "Codex 直连 DeepSeek，代理未运行",
    );
  }

  print(paint("bold", "DeepSeek Media Proxy 诊断"));
  for (const check of checks) {
    print(
      `${check.ok ? paint("green", "✓") : paint("red", "✗")} ` +
        `${check.label}: ${check.detail}`,
    );
  }
  print("");
  print(failed ? paint("red", "诊断发现需要处理的问题。") : paint("green", "诊断通过。"));
  if (failed) {
    process.exitCode = 1;
  }
}

function usage() {
  print(`用法：./${CLI_NAME} <命令>

命令：
  status       查看代理、Codex 路由和图片改写统计（默认）
  on           启动代理并把 Codex 切换到代理
  off          恢复 Codex 直连并关闭代理
  start        只启动代理，不修改 Codex 配置
  stop         只停止代理，不修改 Codex 配置
  restart      重启代理服务
  doctor       检查运行时、配置和健康状态

常用：
  ./${CLI_NAME} status
  ./${CLI_NAME} on
  ./${CLI_NAME} off

执行 on/off 后，需要完全退出并重新打开 Codex，再新建或 fork 任务。
`);
}

async function main() {
  const command = process.argv[2] || "status";
  switch (command) {
    case "status":
      await status();
      break;
    case "on":
    case "enable":
      await on();
      break;
    case "off":
    case "disable":
      await off();
      break;
    case "start":
      await start();
      break;
    case "stop":
      await stop();
      break;
    case "restart":
      await restart();
      break;
    case "doctor":
      await doctor();
      break;
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      usage();
      fail(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  print(paint("red", `错误：${error.message}`));
  process.exitCode = 1;
});
