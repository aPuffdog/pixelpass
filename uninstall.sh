#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

printf '%s\n' "Restoring Codex and stopping PixelPass..."
exec "$PROJECT_DIR/pixelpass" off
