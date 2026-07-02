#!/usr/bin/env bash
# Import the Ville de Montreal CityGML tiles (VM01..VM06) into the 3DCityDB v5
# instance defined in docker-compose.yml, using the official citydb-tool CLI.
#
# Usage: ./scripts/import-citygml.sh [path-to-vm_2020_gml_01_06]
set -euo pipefail

DATA_DIR="${1:-/mnt/sdb1/building/vm_2020_gml_01_06}"
NETWORK="earth_default"
DB_HOST="citydb"
DB_PORT="5432"
DB_NAME="montreal3d"
DB_USER="postgres"
DB_PASSWORD="postgres"
CITYDB_TOOL_IMAGE="3dcitydb/citydb-tool:latest"

if [ ! -d "$DATA_DIR" ]; then
  echo "Data directory not found: $DATA_DIR" >&2
  exit 1
fi

echo "==> Starting citydb container"
docker compose up -d citydb

echo "==> Waiting for citydb to accept connections"
until docker run --rm --network "$NETWORK" "$CITYDB_TOOL_IMAGE" \
  connect -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD" >/dev/null 2>&1; do
  echo "    citydb not ready yet, retrying in 3s..."
  sleep 3
done

echo "==> Importing CityGML tiles from $DATA_DIR (~2.3 GB, this will take a while)"
docker run --rm \
  --network "$NETWORK" \
  -v "$DATA_DIR:/data:ro" \
  "$CITYDB_TOOL_IMAGE" \
  import citygml /data \
  -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD" \
  --index-mode drop_create \
  --threads 4

echo "==> Import summary"
docker run --rm --network "$NETWORK" "$CITYDB_TOOL_IMAGE" \
  info -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PASSWORD"

echo "==> Creating spatial index on citydb.geometry_data (required by pg2b3dm)"
docker exec citydb psql -U "$DB_USER" -d "$DB_NAME" -c \
  "CREATE INDEX IF NOT EXISTS geometry_data_centroid_idx ON citydb.geometry_data USING gist(st_centroid(st_envelope(geometry)));"
