#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

printf '%s\n' "Restoring Codex and stopping Codex DeepSeek Media Proxy..."
exec "$PROJECT_DIR/deepseek-proxy" off
