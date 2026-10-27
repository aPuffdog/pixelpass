import assert from "node:assert/strict";
import test from "node:test";
import {
  isLocalProxyBaseUrl,
  readActiveProviderConfig,
  updateActiveProviderBaseUrl,
} from "../src/codex-config.js";

const SAMPLE = `model_provider = "custom"

[model_providers.custom]
name = "deepseek"
base_url = "https://api.deepseek.com"
wire_api = "responses"

[projects."/tmp/example"]
trust_level = "trusted"
`;

test("reads the active provider without mistaking other base URLs", () => {
  const config = readActiveProviderConfig(SAMPLE);
  assert.equal(config.provider, "custom");
  assert.equal(config.baseUrl, "https://api.deepseek.com");
  assert.equal(config.lineIndex, 4);
});

test("only updates the active provider base URL", () => {
  const updated = updateActiveProviderBaseUrl(
    SAMPLE,
    "http://127.0.0.1:17892",
  );
  assert.match(updated, /base_url = "http:\/\/127\.0\.0\.1:17892"/);
  assert.match(updated, /\[projects\."\/tmp\/example"\]/);
  assert.doesNotMatch(updated, /base_url = "https:\/\/api\.deepseek\.com"/);
});

test("recognizes only the expected local proxy port", () => {
  assert.equal(isLocalProxyBaseUrl("http://127.0.0.1:17892"), true);
  assert.equal(isLocalProxyBaseUrl("http://localhost:17892"), true);
  assert.equal(isLocalProxyBaseUrl("http://127.0.0.1:8080"), false);
  assert.equal(isLocalProxyBaseUrl("https://api.deepseek.com"), false);
});
