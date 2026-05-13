# 🌎 Earth — Next.js + CesiumJS 3D Globe

A Next.js app using CesiumJS to render an interactive 3D globe with custom map styles, city search, atmospheric controls, and a 6-face skybox.

---

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/cedrik/earth.git
cd earth
```

### 2. Install dependencies

```bash
npm install
```

> A `postinstall` script automatically copies Cesium assets from `node_modules/cesium/Build/Cesium` into `public/cesium`. Run manually if needed:
> ```bash
> node scripts/copy-cesium-assets.mjs
> ```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Your [Cesium Ion](https://cesium.com/platform/account/tokens) access token |
| `NEXT_PUBLIC_TILESERVER_URL` | Base URL of your TileServer-GL instance (e.g. `http://localhost:8085`) |
| `NEXT_PUBLIC_NOMINATIM_BASE_URL` | Base URL of your Nominatim instance (e.g. `http://localhost:8086`) |

### 4. Start the self-hosted services (optional)

The app relies on a local tile server and Nominatim geocoder. Use the provided Docker Compose configuration:

```bash
docker compose up -d
```

**Services:**

| Service | Port | Description |
|---|---|---|
| `tileserver` | `8085` | [TileServer-GL](https://github.com/maptiler/tileserver-gl) — serves map tile styles |
| `nominatim` | `8086` | [Nominatim](https://nominatim.org/) — geocoding and place search |

**TileServer-GL** expects `.mbtiles` files in `/mnt/sdb1/tileserver`. Tile URL pattern:
```
http://localhost:8085/styles/{style-name}/{z}/{x}/{y}.png
```

**Nominatim** on initial run import, it  will take several minutes.

> You can replace these with public services (e.g. `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and `https://nominatim.openstreetmap.org`) by updating your `.env`. Check each service's usage policy before doing so.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 References

### Skybox & Space Assets
- [Space 3D Generator](https://tools.wwwtyro.net/space-3d/index.html)
- [Panorama to Cubemap Converter](https://jaxry.github.io/panorama-to-cubemap/)
- [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4851)

### Map Data
- [MapTiler Planet Data](https://data.maptiler.com/downloads/planet/)
- [Geofabrik OSM files](https://download.geofabrik.de/)
- [Montreal 3D buildings — Open Canada](https://open.canada.ca/data/en/dataset/5eabd047-872e-425a-bbc2-3669e732a132)

---

## 📄 License

This project is for personal use.
