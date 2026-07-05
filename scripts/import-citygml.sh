#!/usr/bin/env bash
# Import Ville de Montreal CityGML tiles (VM01..VM06) into the 3DCityDB v5
# instance defined in docker-compose.yml, using the official citydb-tool CLI.
#
# Tiles are imported one at a time (instead of the whole ~3GB dataset in one
# shot) so a bad/slow tile is isolated quickly instead of surfacing after
# hours.
#
# Usage: ./scripts/import-citygml.sh [tile] [path-to-vm_2020_gml_01_06]
#   tile: VM01..VM06, or omit to import all six in sequence
set -euo pipefail

# Prevent Git Bash (MSYS2) from mangling POSIX-style arguments like "/data"
# into Windows paths before they reach docker.exe.
export MSYS_NO_PATHCONV=1

if [ -n "${1:-}" ]; then
  TILES=("$1")
else
  TILES=(VM01 VM02 VM03 VM04 VM05 VM06)
fi
DATA_ROOT="${2:-/mnt/sdb1/building/vm_2020_gml_01_06}"
NETWORK="earth_default"
DB_HOST="citydb"
DB_PORT="5432"
DB_NAME="montreal3d"
DB_USER="postgres"
DB_PASSWORD="postgres"
CITYDB_TOOL_IMAGE="3dcitydb/citydb-tool:latest"

for TILE in "${TILES[@]}"; do
  if [ ! -d "$DATA_ROOT/${TILE}_2020_GML" ]; then
    echo "Data directory not found: $DATA_ROOT/${TILE}_2020_GML" >&2
    exit 1
  fi
done

echo "==> Starting citydb container"
docker compose up -d citydb

echo "==> Waiting for citydb to accept connections"
until docker run --rm --network "$NETWORK" "$CITYDB_TOOL_IMAGE" \
  connect -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD" >/dev/null 2>&1; do
  echo "    citydb not ready yet, retrying in 3s..."
  sleep 3
done

for TILE in "${TILES[@]}"; do
  DATA_DIR="$DATA_ROOT/${TILE}_2020_GML"

  echo "==> Importing tile $TILE from $DATA_DIR"
  docker run --rm \
    --network "$NETWORK" \
    -v "$DATA_DIR:/data:ro" \
    "$CITYDB_TOOL_IMAGE" \
    import citygml /data \
    -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD" \
    --index-mode drop_create \
    --import-mode skip \
    --threads 4 &
  IMPORT_PID=$!

  # Poll the row count every 30s so a slow-but-alive import is visibly
  # distinguishable from a real hang (a genuine freeze shows the same count
  # on every line).
  while kill -0 "$IMPORT_PID" 2>/dev/null; do
    sleep 30
    COUNT=$(docker exec citydb psql -U "$DB_USER" -d "$DB_NAME" -tAc \
      "SELECT count(*) FROM citydb.cityobject;" 2>/dev/null || echo "?")
    echo "    ... still running, cityobject rows so far: $COUNT"
  done
  wait "$IMPORT_PID"

  echo "==> $TILE import summary"
  docker run --rm --network "$NETWORK" "$CITYDB_TOOL_IMAGE" \
    info -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD"
done

echo "==> Creating spatial index on citydb.geometry_data (required by pg2b3dm)"
docker exec citydb psql -U "$DB_USER" -d "$DB_NAME" -c \
  "CREATE INDEX IF NOT EXISTS geometry_data_centroid_idx ON citydb.geometry_data USING gist(st_centroid(st_envelope(geometry)));"
