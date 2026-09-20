#!/usr/bin/env bash
# Builds the image for the NAS CPU and writes it as an archive that
# Synology Container Manager can import (Image → Hinzufügen → Aus Datei).
set -euo pipefail

# Most Synology Plus models are Intel/AMD (amd64). Models with ARM CPUs need "arm64".
ARCHITECTURE="${1:-amd64}"
VERSION="$(node -p "require('./package.json').version")"
IMAGE_TAG="weinkeller:${VERSION}"
ARCHIVE_PATH="dist/weinkeller-${VERSION}-${ARCHITECTURE}.tar.gz"

mkdir -p dist
docker buildx build --platform "linux/${ARCHITECTURE}" --tag "$IMAGE_TAG" --load .
docker save "$IMAGE_TAG" | gzip > "$ARCHIVE_PATH"

echo "Image archive written to ${ARCHIVE_PATH}"
echo "Use image tag ${IMAGE_TAG} in docker-compose.nas.yml"
