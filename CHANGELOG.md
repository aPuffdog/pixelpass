# Changelog

## Unreleased

- Present the project as DeepSeek Image Cache Proxy with Chinese and English GitHub landing pages, responsive visual explainers, and release-package language parity.
- Explain the native DeepSeek Files API, the Codex integration gap, server-generated file IDs, and the complete image lifecycle with matching bilingual diagrams.

## 0.3.0 - 2026-10-27

- Renamed the project to PixelPass.
- Added the `pixelpass` command while preserving `deepseek-proxy` compatibility.
- Rebuilt the README around the problem, observed results, installation, and
  operating controls.
- Added a visual overview covering the repeated-Base64 failure and the
  `file_id` request path.

## 0.2.0 - 2026-10-27

- Added the macOS `deepseek-proxy` control command.
- Added LaunchAgent-based start, stop, restart, enable, and disable workflows.
- Added health, routing, doctor, and aggregate traffic views.
- Added automatic Codex configuration backup and exact direct-routing restore.
- Increased the managed request limit to 1 GiB.
- Added Buffer-level image rewriting for requests above the safe JavaScript
  string size.
- Added GitHub Actions CI and reproducible release packaging.

## 0.1.0

- Initial Responses proxy with DeepSeek Files API, image de-duplication, caching,
  compressed request support, and Windows service scripts.
