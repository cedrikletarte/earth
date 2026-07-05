#!/usr/bin/env node
// Seed an .mbtiles file by downloading every raster tile in a bbox/zoom range
// from a running TileServer-GL instance. This is the "seed" step of the
// PMTiles bake pipeline: TileServer-GL has no built-in bulk export, so we
// walk the tile pyramid ourselves and write straight into an MBTiles sqlite
// file (avoids pulling in a separate tool like mbutil).
//
// Usage:
//   node scripts/seed-mbtiles.mjs --style osm-bright --minzoom 0 --maxzoom 8 \
//     --bbox=-180,-85.0511,180,85.0511 --out data/pmtiles/osm-bright-planet.mbtiles
import Database from "better-sqlite3";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw) ?? /^--([^=]+)$/.exec(raw);
    if (!m) continue;
    const [, key, value] = m;
    args[key] = value ?? argv[argv.indexOf(raw) + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const style = args.style;
const minzoom = Number(args.minzoom);
const maxzoom = Number(args.maxzoom);
const bbox = (args.bbox ?? "").split(",").map(Number);
const out = args.out;
const tileserverUrl = args.tileserver ?? "http://localhost:8085";
const concurrency = Number(args.concurrency ?? 16);

if (!style || !out || Number.isNaN(minzoom) || Number.isNaN(maxzoom) || bbox.length !== 4) {
  console.error(
    "Usage: seed-mbtiles.mjs --style <name> --minzoom <n> --maxzoom <n> --bbox=<w,s,e,n> --out <file.mbtiles> [--tileserver <url>] [--concurrency <n>]"
  );
  process.exit(1);
}

const [west, south, east, north] = bbox;

function lonToTileX(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z
  );
}

mkdirSync(dirname(out), { recursive: true });
if (existsSync(out)) unlinkSync(out);
const db = new Database(out);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE metadata (name TEXT, value TEXT);
  CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);
  CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);
`);
const insertMeta = db.prepare("INSERT INTO metadata (name, value) VALUES (?, ?)");
const insertTile = db.prepare(
  "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)"
);
insertMeta.run("name", style);
insertMeta.run("format", "png");
insertMeta.run("type", "baselayer");
insertMeta.run("version", "1.0.0");
insertMeta.run("bounds", bbox.join(","));
insertMeta.run("minzoom", String(minzoom));
insertMeta.run("maxzoom", String(maxzoom));

let total = 0;
let done = 0;
let failed = 0;
const jobs = [];
for (let z = minzoom; z <= maxzoom; z++) {
  const xMin = Math.max(0, lonToTileX(west, z));
  const xMax = Math.min(2 ** z - 1, lonToTileX(east, z));
  const yMin = Math.max(0, latToTileY(north, z));
  const yMax = Math.min(2 ** z - 1, latToTileY(south, z));
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      jobs.push({ z, x, y });
    }
  }
}
total = jobs.length;
console.log(`Seeding ${total} tiles for style "${style}" (z${minzoom}-${maxzoom}) -> ${out}`);

async function fetchTile({ z, x, y }) {
  const url = `${tileserverUrl}/styles/${style}/${z}/${x}/${y}.png`;
  const res = await fetch(url);
  if (!res.ok) {
    failed++;
    console.warn(`  ! ${z}/${x}/${y} -> HTTP ${res.status}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // MBTiles uses the TMS scheme (Y flipped relative to XYZ/slippy-map).
  const tmsY = 2 ** z - 1 - y;
  insertTile.run(z, x, tmsY, buf);
}

async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    await fetchTile(job);
    done++;
    if (done % 200 === 0 || done === total) {
      process.stdout.write(`  ${done}/${total} (${failed} failed)\r`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, total || 1) }, worker));
db.close();
console.log(`\nDone: ${done}/${total} tiles written, ${failed} failed -> ${out}`);
if (failed > 0) process.exitCode = 1;
