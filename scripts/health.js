const port = process.env.MEDIA_PROXY_PORT || "17892";
const host = process.env.MEDIA_PROXY_HOST || "127.0.0.1";
const url = `http://${host}:${port}/__media_proxy/health`;

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  const body = await response.text();
  console.log(`${response.status} ${url}\n${body}`);
  process.exitCode = response.ok ? 0 : 1;
} catch (error) {
  console.error(`Proxy is not reachable at ${url}: ${error.message}`);
  process.exitCode = 1;
}
