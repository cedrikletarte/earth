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

TileServer-GL expects `.mbtiles` files in `/mnt/sdb1/tileserver`. Tile URL pattern:
```
http://localhost:8085/styles/{style-name}/{z}/{x}/{y}.png
```

Nominatim will import data on first run. This can take several minutes.

> You can substitute public services (e.g. `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and `https://nominatim.openstreetmap.org`) by updating `.env`. Check each service's usage policy before doing so.

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