import { loadConfig } from "./config.js";
import { createProxyServer } from "./proxy-server.js";

const config = loadConfig();
const proxy = await createProxyServer(config);
const address = await proxy.listen();

console.log(
  JSON.stringify(
    {
      event: "listening",
      url: address.url,
      health: `${address.url}/__media_proxy/health`,
      stats: `${address.url}/__media_proxy/stats`,
      upstream: config.deepseekBaseUrl,
      cacheFile: config.cacheFile,
    },
    null,
    2,
  ),
);

let closing = false;
async function shutdown(signal) {
  if (closing) {
    return;
  }
  closing = true;
  console.log(`[shutdown] ${signal}`);
  await proxy.close().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
