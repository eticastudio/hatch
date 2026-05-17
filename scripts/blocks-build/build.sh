#!/usr/bin/env bash
#
# Compile the Hatch Gutenberg blocks inside a Node 18 Docker container so
# the host machine doesn't need to downgrade Node just for the plugin
# build. Mounts wp-plugin/ in, writes build/ + node_modules/ on the host.
#
# Usage (from repo root):
#   ./scripts/blocks-build/build.sh
#
# Or with a remote-pulled image:
#   HATCH_BUILD_IMAGE=ghcr.io/adityaarsharma/hatch-blocks:18 ./scripts/blocks-build/build.sh
#
# Requirements: docker. Nothing else.

set -euo pipefail

cd "$(dirname "$0")/../.."

IMAGE="${HATCH_BUILD_IMAGE:-hatch-blocks:18}"
DOCKERFILE_DIR="scripts/blocks-build"
PLUGIN_DIR="wp-plugin"

if ! command -v docker >/dev/null 2>&1; then
	echo "✗ docker not found. Install Docker Desktop or docker-cli first." >&2
	exit 1
fi

if [[ ! -d "$PLUGIN_DIR" ]]; then
	echo "✗ Run this from the repo root (no wp-plugin/ here)." >&2
	exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
	echo "→ building $IMAGE …"
	docker build -t "$IMAGE" "$DOCKERFILE_DIR"
fi

echo "→ compiling Hatch blocks (Node 18, isolated)"
docker run --rm \
	-v "$PWD/$PLUGIN_DIR:/app" \
	-v "hatch-blocks-cache:/root/.npm" \
	"$IMAGE"

echo "✓ $PLUGIN_DIR/build/ ready."
echo "  Now repackage the zip:"
echo "  cd $PLUGIN_DIR && zip -r ../hatch.zip . -x 'node_modules/*' 'blocks-src/*' 'tests/*'"
