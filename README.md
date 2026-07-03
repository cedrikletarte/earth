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
| `VITE_CESIUM_ION_TOKEN` | [Cesium Ion](https://cesium.com/platform/account/tokens) access token |
| `VITE_TILESERVER_URL` | TileServer-GL base URL (e.g. `http://localhost:8085`) |
| `VITE_NOMINATIM_BASE_URL` | Nominatim base URL (e.g. `http://localhost:8086`) |

### 3. Start self-hosted services

```bash
docker compose up -d
```

| Service | Port | Description |
|---|---|---|
| `tileserver` | `8085` | [TileServer-GL](https://github.com/maptiler/tileserver-gl) — map tile styles |
| `nominatim` | `8086` | [Nominatim](https://nominatim.org/) — geocoding and place search |
| `citydb` | `5440` | [3DCityDB](https://www.3dcitydb.org/) — Postgres/PostGIS store for the CityGML building models |

TileServer-GL expects `.mbtiles` files in `/mnt/sdb1/tileserver`. Tile URL pattern:
```
http://localhost:8085/styles/{style-name}/{z}/{x}/{y}.png
```

Nominatim will import data on first run. This can take several minutes.

> You can substitute public services (e.g. `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and `https://nominatim.openstreetmap.org`) by updating `.env`. Check each service's usage policy before doing so.

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