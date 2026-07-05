#!/usr/bin/env bash
# Bake the TileServer-GL styles into static PMTiles archives, so the basemap
# can be served at runtime without a live rasterizer (see scripts/seed-mbtiles.mjs
# for why the seed step exists — TileServer-GL has no bulk export of its own).
#
# Two zoom tiers per style, to avoid baking the whole planet at street-level
# zoom: a low-zoom "planet" tier for global coverage, and a deep "montreal"
# tier clipped to the island for detail where it actually matters. Cesium
# stacks both as imagery layers, the montreal one bounded by `rectangle`.
#
# Usage: ./scripts/bake-pmtiles.sh [style-name]
#   With no argument, bakes all styles. With a style name, bakes just that
#   one (useful to validate the pipeline before committing to a full run).
set -euo pipefail
# MSYS_NO_PATHCONV is only set around the `docker run` calls below (not
# globally): it stops Git Bash from mangling the container-internal "/data"
# path, but it would just as badly break `node`'s ability to resolve a real
# Windows path if left on for the whole script.

ALL_STYLES=(osm-liberty osm-standard osm-bright klokantech-basic)
if [ -n "${1:-}" ]; then
  STYLES=("$1")
else
  STYLES=("${ALL_STYLES[@]}")
fi

TILESERVER_URL="${VITE_TILESERVER_URL:-http://localhost:8085}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$(pwd)/data/pmtiles"
PMTILES_IMAGE="protomaps/go-pmtiles"

# WebMercator-valid planet extent, and an approximate Montreal island bbox.
PLANET_BBOX="-180,-85.0511,180,85.0511"
PLANET_MINZOOM=0
PLANET_MAXZOOM=8

MONTREAL_BBOX="-74.05,45.35,-73.35,45.75"
MONTREAL_MINZOOM=9
MONTREAL_MAXZOOM=14

mkdir -p "$OUT_DIR"

bake_tier() {
  local style="$1" tier="$2" bbox="$3" minz="$4" maxz="$5"
  local mbtiles="$OUT_DIR/${style}-${tier}.mbtiles"
  local pmtiles="$OUT_DIR/${style}-${tier}.pmtiles"

  echo "==> Seeding $style ($tier, z$minz-$maxz)"
  node "$SCRIPT_DIR/seed-mbtiles.mjs" \
    --style "$style" --minzoom "$minz" --maxzoom "$maxz" \
    --bbox="$bbox" --out "$mbtiles" --tileserver "$TILESERVER_URL"

  echo "==> Converting $style ($tier) to PMTiles"
  rm -f "$pmtiles"
  MSYS_NO_PATHCONV=1 docker run --rm -v "$OUT_DIR:/data" "$PMTILES_IMAGE" \
    convert "/data/${style}-${tier}.mbtiles" "/data/${style}-${tier}.pmtiles"
  rm -f "$mbtiles" "${mbtiles}-wal" "${mbtiles}-shm"
}

for style in "${STYLES[@]}"; do
  bake_tier "$style" planet "$PLANET_BBOX" "$PLANET_MINZOOM" "$PLANET_MAXZOOM"
  bake_tier "$style" montreal "$MONTREAL_BBOX" "$MONTREAL_MINZOOM" "$MONTREAL_MAXZOOM"
done

echo "==> Done. PMTiles archives written to $OUT_DIR"
