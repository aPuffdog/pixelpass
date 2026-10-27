#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

printf '%s\n' "Installing DeepSeek Image Cache Proxy..."
exec "$PROJECT_DIR/pixelpass" on
