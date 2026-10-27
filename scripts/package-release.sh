#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST_DIR="$PROJECT_DIR/dist"

if command -v node >/dev/null 2>&1; then
  NODE_BIN=$(command -v node)
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
elif [ -x /opt/homebrew/bin/node ]; then
  NODE_BIN=/opt/homebrew/bin/node
else
  printf '%s\n' "Node.js was not found." >&2
  exit 127
fi

VERSION=$(
  cd "$PROJECT_DIR"
  "$NODE_BIN" -p "require('./package.json').version"
)
MAC_ARCHIVE_NAME="pixelpass-v$VERSION-macos.tar.gz"
WINDOWS_ARCHIVE_NAME="pixelpass-v$VERSION-windows.zip"
STAGING_DIR=$(mktemp -d "${TMPDIR:-/tmp}/pixelpass.XXXXXX")
PACKAGE_DIR="$STAGING_DIR/pixelpass"

cleanup() {
  chmod -R u+w "$STAGING_DIR" 2>/dev/null || true
  rm -rf -- "$STAGING_DIR"
}
trap cleanup EXIT HUP INT TERM

mkdir -p \
  "$DIST_DIR" \
  "$PACKAGE_DIR/src" \
  "$PACKAGE_DIR/scripts"

cp -R "$PROJECT_DIR/docs" "$PACKAGE_DIR/"
cp "$PROJECT_DIR"/src/*.js "$PACKAGE_DIR/src/"
cp "$PROJECT_DIR"/scripts/* "$PACKAGE_DIR/scripts/"
cp \
  "$PROJECT_DIR/.env.example" \
  "$PROJECT_DIR/CHANGELOG.md" \
  "$PROJECT_DIR/LICENSE" \
  "$PROJECT_DIR/README.md" \
  "$PROJECT_DIR/README.en.md" \
  "$PROJECT_DIR/SECURITY.md" \
  "$PROJECT_DIR/deepseek-proxy" \
  "$PROJECT_DIR/pixelpass" \
  "$PROJECT_DIR/install.sh" \
  "$PROJECT_DIR/install.cmd" \
  "$PROJECT_DIR/pixelpass.cmd" \
  "$PROJECT_DIR/package.json" \
  "$PROJECT_DIR/uninstall.sh" \
  "$PROJECT_DIR/uninstall.cmd" \
  "$PACKAGE_DIR/"

# Batch files are more reliable with Windows line endings, including when the
# release archive is built on macOS.
for command_file in install.cmd pixelpass.cmd uninstall.cmd; do
  awk 'BEGIN { ORS = "\r\n" } { sub(/\r$/, ""); print }' \
    "$PACKAGE_DIR/$command_file" > "$PACKAGE_DIR/$command_file.tmp"
  mv "$PACKAGE_DIR/$command_file.tmp" "$PACKAGE_DIR/$command_file"
done

chmod 755 \
  "$PACKAGE_DIR/deepseek-proxy" \
  "$PACKAGE_DIR/install.sh" \
  "$PACKAGE_DIR/pixelpass" \
  "$PACKAGE_DIR/scripts/package-release.sh" \
  "$PACKAGE_DIR/uninstall.sh"

rm -f \
  "$DIST_DIR/$MAC_ARCHIVE_NAME" \
  "$DIST_DIR/$MAC_ARCHIVE_NAME.sha256" \
  "$DIST_DIR/$WINDOWS_ARCHIVE_NAME" \
  "$DIST_DIR/$WINDOWS_ARCHIVE_NAME.sha256"

COPYFILE_DISABLE=1 tar \
  -C "$STAGING_DIR" \
  -czf "$DIST_DIR/$MAC_ARCHIVE_NAME" \
  pixelpass

(
  cd "$STAGING_DIR"
  zip -q -r -X "$DIST_DIR/$WINDOWS_ARCHIVE_NAME" pixelpass
)

(
  cd "$DIST_DIR"
  shasum -a 256 "$MAC_ARCHIVE_NAME" > "$MAC_ARCHIVE_NAME.sha256"
  shasum -a 256 "$WINDOWS_ARCHIVE_NAME" > "$WINDOWS_ARCHIVE_NAME.sha256"
)

printf '%s\n' \
  "$DIST_DIR/$MAC_ARCHIVE_NAME" \
  "$DIST_DIR/$MAC_ARCHIVE_NAME.sha256" \
  "$DIST_DIR/$WINDOWS_ARCHIVE_NAME" \
  "$DIST_DIR/$WINDOWS_ARCHIVE_NAME.sha256"
