# 🌎 Earth — Next.js + Cesium starter

A Next.js app using CesiumJS to render a globe with a custom 6-face skybox.

---

## 🏁 Getting Started

### 1. Clone the repository

Clone this project to your local machine:

```bash
git clone ssh://git@192.168.2.100:2424/cedrik/earth.git
cd earth
```

### 2. Install dependencies

Install all required dependencies (this will create the `node_modules` folder):

```bash
npm install
```

### 3. Cesium assets (auto copy)

- A `postinstall` script copies Cesium assets from `node_modules/cesium/Build/Cesium` into `public/cesium`:
	- Folders: `Assets/`, `ThirdParty/`, `Widgets/`, `Workers/`
	- Files: `Cesium.js`, `index.cjs`, `index.js`
- `public/cesium/` is git-ignored (see `.gitignore`). You don’t commit these files.
- Run manually if needed: `node scripts/copy-cesium-assets.mjs`

### 4. Run the development server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

---