#!/usr/bin/env bash
# Generate a Cesium 3D Tiles tileset from the buildings imported into 3DCityDB
# (see import-citygml.sh) using pg2b3dm. Textures are picked up automatically
# from citydb.surface_data_mapping / surface_data / tex_image.
#
# pg2b3dm writes one file per tile, which can be tens of thousands of small
# files. On Windows/Docker Desktop, writing that many small files directly to
# a bind-mounted host path (9p/VirtioFS) degrades badly and looks like a hang
# after a while. So generation writes to a Docker volume (native VM
# filesystem) and the result is copied to the host in one bulk operation.
#
# Usage: ./scripts/generate-3d-tiles.sh [output-dir]
set -euo pipefail

# Prevent Git Bash (MSYS2) from mangling POSIX-style arguments like "/output"
# into Windows paths before they reach docker.exe.
export MSYS_NO_PATHCONV=1

OUTPUT_DIR="${1:-$(pwd)/public/tiles/montreal-buildings}"
NETWORK="earth_default"
DB_HOST="citydb"
DB_PORT="5432"
DB_NAME="montreal3d"
DB_USER="postgres"
DB_PASSWORD="postgres"
PG2B3DM_IMAGE="geodan/pg2b3dm:latest"
VOLUME_NAME="pg2b3dm-output"

mkdir -p "$OUTPUT_DIR"

echo "==> Generating 3D Tiles into Docker volume $VOLUME_NAME"
docker volume create "$VOLUME_NAME" >/dev/null

docker run --rm \
  --network "$NETWORK" \
  -v "$VOLUME_NAME:/output" \
  "$PG2B3DM_IMAGE" \
  --connection "Host=$DB_HOST;Port=$DB_PORT;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASSWORD;CommandTimeOut=0" \
  -t citydb.geometry_data \
  -c geometry \
  -o /output \
  --geometricerror 500

# The Ville de Montreal CityGML textures are full-resolution aerial/facade
# photos (some 30+ MB each), which pg2b3dm embeds as-is — producing .glb
# tiles hundreds of MB each and making the viewer crawl. Shrink and
# recompress embedded textures in place before they ever reach the host.
echo "==> Compressing embedded building textures (gltf-transform)"
docker run --rm \
  -v "$VOLUME_NAME:/data" \
  node:22-alpine \
  sh -c '
    set -e
    npm install -g @gltf-transform/cli@latest >/dev/null 2>&1
    cd /data/content
    for f in *.glb; do
      [ -e "$f" ] || continue
      echo "    $f"
      gltf-transform optimize "$f" "$f.tmp" --texture-size 1024 --texture-compress jpeg
      mv "$f.tmp" "$f"
    done
  '

echo "==> Copying generated tiles from $VOLUME_NAME to $OUTPUT_DIR (replacing any previous output)"
docker run --rm \
  -v "$VOLUME_NAME:/from:ro" \
  -v "$OUTPUT_DIR:/to" \
  alpine \
  sh -c "rm -rf /to/* && cp -r /from/. /to/"

docker volume rm "$VOLUME_NAME" >/dev/null

echo "==> Done. Load $OUTPUT_DIR/tileset.json as a Cesium3DTileset."
