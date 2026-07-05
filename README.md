# Earth

An interactive 3D globe built with React, Vite, and CesiumJS. Features custom map styles, city search, atmospheric controls, and a 6-face skybox.

![Thumbnail](/public/thumbnail.png)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/cedrik/earth.git
cd earth
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_BASEMAP_SOURCE` | `pmtiles` (default) or `tileserver` — which backend the app's basemap talks to at runtime, see below |
| `VITE_TILESERVER_URL` | TileServer-GL base URL — needed for re-baking styles (see below), and at runtime when `VITE_BASEMAP_SOURCE=tileserver` |
| `VITE_PMTILES_URL` | `pmtiles-serve` base URL (e.g. `http://localhost:8087`) — used at runtime when `VITE_BASEMAP_SOURCE=pmtiles` (the default) |
| `VITE_NOMINATIM_BASE_URL` | Nominatim base URL (e.g. `http://localhost:80TILESERVER_DATA_PATH86`) |

### 3. Start self-hosted services

```bash
docker compose up -d
```

| Service | Port | Description |
|---|---|---|
| `pmtiles` | `8087` | [pmtiles-serve](https://github.com/protomaps/go-pmtiles) — serves the baked basemap (see below); what the app talks to at runtime |
| `tileserver` | `8085` | [TileServer-GL](https://github.com/maptiler/tileserver-gl) — rasterizes map styles; only used to (re-)bake the basemap, not started by default at runtime |
| `nominatim` | `8086` | [Nominatim](https://nominatim.org/) — geocoding and place search |
| `citydb` | `5440` | [3DCityDB](https://www.3dcitydb.org/) — Postgres/PostGIS store for the CityGML building models |


Nominatim will import data on first run. This can take several minutes.

> You can substitute public services (e.g. `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and `https://nominatim.openstreetmap.org`) by updating `.env`. Check each service's usage policy before doing so.

---

#### Baking the basemap (PMTiles)

By default the app doesn't talk to TileServer-GL directly. TileServer-GL rasterizes a vector style on every request, which is expensive — especially once you dezoom a lot on a globe. Instead, each style is baked once into static [PMTiles](https://github.com/protomaps/pmtiles) archives (single-file tile pyramids, served by byte-range reads, no per-request rendering), and `pmtiles-serve` hands them out as a plain `{z}/{x}/{y}.png` endpoint.

Set `VITE_BASEMAP_SOURCE=tileserver` (and rebuild) to bypass PMTiles entirely and talk to `tileserver` live instead — full planet coverage at native zoom with no bake step, at the cost of rendering every tile on every request. Useful for areas you haven't baked yet, or while iterating on a style before committing to a bake. This is a `VITE_*` var, so it's fixed at build time like the others — switching it means rebuilding the `app` image (`docker compose up --build app` or restarting `npm run dev`), not a runtime toggle.

Each style is baked in two zoom tiers, to avoid storing the whole planet at street-level zoom:
- **planet** (z0–8): global coverage, low/medium zoom.
- **montreal** (z9–14): street-level detail, clipped to the Montreal island bbox. z14 is the vector source's native max zoom — deeper is server-side overzoom with no real detail gain.

Cesium stacks both tiers as separate imagery layers per style (see `CesiumViewer.tsx`); the montreal layer is bounded so it's only requested inside its bbox.

1. Start `tileserver` (it's not part of the default `docker compose up -d` set anymore):
   ```bash
   docker compose up -d tileserver
   ```
2. Bake all styles:
   ```bash
   ./scripts/bake-pmtiles.sh
   ```
   Or bake a single style first to validate the pipeline (much faster):
   ```bash
   ./scripts/bake-pmtiles.sh osm-bright
   ```
   This seeds each style/tier by downloading every tile from TileServer-GL into an `.mbtiles` (`scripts/seed-mbtiles.mjs`), then converts it to `.pmtiles` (`protomaps/go-pmtiles convert`). Output goes to `data/pmtiles/`.
3. Start (or restart) `pmtiles` to pick up the new archives:
   ```bash
   docker compose up -d pmtiles
   ```
4. Re-run step 2 whenever a style changes — there's no incremental update, each bake replaces the previous archives for that style.

##### Baking a single style at a custom zoom/bbox (e.g. the whole planet at deep zoom)

`bake-pmtiles.sh` only knows the two hardcoded tiers above. For anything else — a different bbox, a deeper global zoom, a different output location — use its two building blocks directly instead of extending the script:

```bash
# 1. Seed: download every tile in a bbox/zoom range from TileServer-GL into an .mbtiles
node scripts/seed-mbtiles.mjs \
  --style osm-liberty --minzoom 0 --maxzoom 11 \
  --bbox=-180,-85.0511,180,85.0511 \
  --out /path/to/output/osm-liberty-full.mbtiles

# 2. Convert: .mbtiles -> .pmtiles (protomaps/go-pmtiles)
MSYS_NO_PATHCONV=1 docker run --rm -v "/path/to/output:/data" protomaps/go-pmtiles \
  convert /data/osm-liberty-full.mbtiles /data/osm-liberty-full.pmtiles
```

Storing on another drive (e.g. a `Z:\` data drive) is just a matter of pointing `--out` and the volume mount (`-v`) there instead of `data/pmtiles`. If that drive isn't where the `pmtiles` service's volume points, either move the archive into `data/pmtiles` afterwards, or point `pmtiles`'s volume (`docker-compose.yml`) at that drive directly — `pmtiles serve <dir>` serves every `.pmtiles` file it finds in one flat directory, keyed by filename.

**Before committing to a deep global bake, estimate the cost first:**
- **Throughput**: seeding is bottlenecked by TileServer-GL's own rendering (a single container), not by `seed-mbtiles.mjs`'s `--concurrency` — raising concurrency from 16 to 64 measured *no improvement* (actually slightly worse). Expect roughly **150-165 tiles/sec** regardless of concurrency.
- **Tile count**: the deepest zoom level dominates — total tiles for z0–N is `(4^(N+1) - 1) / 3`. At 160 tiles/sec: z0–10 ≈ 1.4M tiles (~2.5h), z0–11 ≈ 5.6M tiles (~10h), z0–12 ≈ 22M tiles (~1.6 days), z0–14 (the full planet at the vector source's native max zoom) ≈ 358M tiles (**~25 days**).
- **Storage**: our real bakes measured ~4.3 KB/tile average for a low-zoom planet-wide archive (z0-8, mostly land — oceans dedupe to near-nothing since PMTiles collapses identical tile content) vs. ~26-30 KB/tile for the dense Montreal z9-14 archive. For a full-planet deep-zoom estimate, use the higher figure — global z0-14 for one style lands in the **~1-2 TB** range.

---

#### Generating 3D buildings

Montreal's LOD2 CityGML building models are imported into 3DCityDB and converted to Cesium 3D Tiles with [pg2b3dm](https://github.com/Geodan/pg2b3dm).

1. Download the CityGML tiles (`VM01`–`VM06`) from [Ville de Montréal's open data](https://open.canada.ca/data/en/dataset/79029901-8e40-4f7b-8aca-a2f10abde023?res_page=1#resources) and extract them so you have a folder containing `VM01_2020_GML/` … `VM06_2020_GML/`.

2. Import into 3DCityDB (the `citydb` service above):

   ```bash
   # a single tile
   ./scripts/import-citygml.sh VM01 /path/to/vm_2020_gml_01_06

   # or all six tiles in sequence
   ./scripts/import-citygml.sh "" /path/to/vm_2020_gml_01_06
   ```

   Re-running an already-imported tile is safe — `--import-mode skip` skips features that already exist instead of duplicating them.

3. Generate the 3D Tiles tileset:

   ```bash
   ./scripts/generate-3d-tiles.sh
   ```

   This regenerates `public/tiles/montreal-buildings/` from every building currently in the database (not just the tiles you last imported), replacing any previous output. Re-run it after importing more tiles.

4. If you're serving the app via Docker rather than `npm run dev`, rebuild the image so the new tileset is copied in:

   ```bash
   docker compose up --build app
   ```

> **No real terrain yet.** The scene uses Cesium's flat ellipsoid (no elevation data loaded), while the CityGML heights are real elevations above the ellipsoid, so buildings currently float above the flat ground by roughly their real-world elevation. Don't try to fix this with `Cesium3DTileset.modelMatrix` — pg2b3dm's output uses a `region` bounding volume, which per the 3D Tiles spec is fixed in absolute WGS84 coordinates and ignores `modelMatrix` entirely; shifting the tileset that way desyncs the rendered content from Cesium's culling/LOD volume and causes flickering and lag. The real fix is either loading real terrain (e.g. HRDEM quantized-mesh) or correcting the height in the source geometry (SQL) before running pg2b3dm.

---

#### Generating the skybox faces

`convert.py` converts an equirectangular (2:1 ratio) space image into the 6 cube faces used by the skybox in `public/skybox/`.

```bash
sudo apt install python3 python3-venv python3-pip
python3 -m venv .venv
source .venv/bin/activate
pip install numpy py360convert Pillow
python convert.py
```

The source image is expected at `public/eso0932a.jpg`; the 6 output faces (`px`, `nx`, `py`, `ny`, `pz`, `nz`) are written to `public/skybox/`.

---

## References

### Skybox & Space
- [Space 3D Generator](https://tools.wwwtyro.net/space-3d/index.html)
- [Panorama to Cubemap Converter](https://jaxry.github.io/panorama-to-cubemap/)
- [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4851)
- [Milky Way panorama](https://www.eso.org/public/images/eso0932a/)

### Map Data
- [MapTiler Planet Data](https://data.maptiler.com/downloads/planet/)
- [OpenMapTiles Style](https://openmaptiles.org/styles/)
- [Geofabrik OSM files](https://download.geofabrik.de/)
- [Montreal 3D buildings — Open Canada](https://open.canada.ca/data/en/dataset/79029901-8e40-4f7b-8aca-a2f10abde023?res_page=1#resources)
- [PMTiles / go-pmtiles](https://github.com/protomaps/go-pmtiles)