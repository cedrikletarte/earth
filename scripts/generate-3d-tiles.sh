#!/usr/bin/env bash
# Generate a Cesium 3D Tiles tileset from the buildings imported into 3DCityDB
# (see import-citygml.sh) using pg2b3dm. Textures are picked up automatically
# from citydb.surface_data_mapping / surface_data / tex_image.
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

mkdir -p "$OUTPUT_DIR"

echo "==> Generating 3D Tiles into $OUTPUT_DIR"
docker run --rm \
  --network "$NETWORK" \
  -v "$OUTPUT_DIR:/output" \
  "$PG2B3DM_IMAGE" \
  --connection "Host=$DB_HOST;Port=$DB_PORT;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASSWORD;CommandTimeOut=0" \
  -t citydb.geometry_data \
  -c geometry \
  -o /output \
  --geometricerror 500

echo "==> Done. Load $OUTPUT_DIR/tileset.json as a Cesium3DTileset."
