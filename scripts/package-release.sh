#!/bin/bash
# package-release.sh - Create a distributable zip for Chrome extension
#
# Usage: ./scripts/package-release.sh [version]
#   version: Optional. If not provided, reads from manifest.json
#
# Output: dist/open-translate-vX.Y.Z.zip

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$ROOT_DIR/dist"

# Read version from manifest.json if not provided
if [ -n "$1" ]; then
    VERSION="$1"
else
    VERSION=$(grep '"version"' "$ROOT_DIR/manifest.json" | head -1 | sed 's/.*"version"[^"]*"\([^"]*\)".*/\1/')
fi

if [ -z "$VERSION" ]; then
    echo "Error: Could not determine version"
    exit 1
fi

ZIP_NAME="open-translate-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "📦 Packaging Open Translate v${VERSION}..."

# Create dist directory
mkdir -p "$DIST_DIR"

# Remove old zip if exists
rm -f "$ZIP_PATH"

# Change to root directory
cd "$ROOT_DIR"

echo "  Including: manifest.json, icons/, src/"

# Create zip with core extension files
# Exclude: tests, dev files, git, node_modules
zip -r "$ZIP_PATH" manifest.json icons/ src/ \
    -x "*.git*" \
    -x "*node_modules*" \
    -x "*.test.js" \
    -x "*.spec.js" \
    -x "*__tests__*" \
    -x "*.DS_Store"

# Add lib/ if it exists and is not empty
if [ -d "lib" ] && [ "$(ls -A lib 2>/dev/null)" ]; then
    echo "  Including: lib/"
    zip -r "$ZIP_PATH" lib/ -x "*.git*"
fi

# Verify zip was created
if [ -f "$ZIP_PATH" ]; then
    SIZE=$(du -h "$ZIP_PATH" | cut -f1)
    echo ""
    echo "✅ Created: dist/$ZIP_NAME ($SIZE)"
    echo ""
    echo "To install:"
    echo "  1. Unzip the file"
    echo "  2. Open chrome://extensions"
    echo "  3. Enable 'Developer mode'"
    echo "  4. Click 'Load unpacked' and select the unzipped folder"
else
    echo "❌ Failed to create zip"
    exit 1
fi
