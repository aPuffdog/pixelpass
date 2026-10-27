# Security

## Reporting

Please report security issues privately through the repository's GitHub Security
Advisories rather than a public issue. Include the affected version and a
minimal reproduction without real API keys, prompts, screenshots, or Codex
conversation logs.

## Security model

- The proxy listens on `127.0.0.1` by default.
- Authentication headers are forwarded but are not written to logs or cache.
- Prompt content and image bytes are not persisted by the proxy.
- The local cache stores an API-key fingerprint, image hashes, DeepSeek file IDs,
  sizes, and expiration times.
- Uploaded images are stored by DeepSeek under the caller's account according
  to the configured Files API expiration.
- The control command modifies only the active Codex provider `base_url` and
  creates a mode-`0600` backup before doing so.

Do not bind the proxy to a public interface without adding authentication,
transport security, request isolation, and an explicit threat model.
