#!/usr/bin/env node
// Copy Cesium static assets from node_modules into public/cesium
// Safe to run multiple times; overwrites existing files.

import { resolve, join } from 'node:path';
import { promises as fs } from 'node:fs';

const root = resolve(process.cwd());
const destDir = resolve(root, 'public', 'cesium');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyItem(from, to) {
  // Node 18+ has fs.cp; use it for both files and dirs
  await fs.cp(from, to, { recursive: true, force: true });
}

async function main() {
  const cesiumPkg = resolve(root, 'node_modules', 'cesium', 'package.json');
  if (!(await exists(cesiumPkg))) {
    console.log('[copy-cesium-assets] cesium not installed yet; skipping.');
    return;
  }

  const cesiumRoot = resolve(root, 'node_modules', 'cesium');
  const candidates = [
    resolve(cesiumRoot, 'Build', 'Cesium'),
    resolve(cesiumRoot, 'Build', 'CesiumUnminified'),
    // fallback to package root if structure changes in future versions
    cesiumRoot,
  ];

  let srcDir = null;
  for (const c of candidates) {
    if (await exists(c)) {
      srcDir = c;
      break;
    }
  }

  if (!srcDir) {
    console.warn('[copy-cesium-assets] Could not find Cesium Build folder.');
    return;
  }

  await fs.mkdir(destDir, { recursive: true });

  const items = [
    'Assets',
    'ThirdParty',
    'Widgets',
    'Workers',
    'Cesium.js',
    'index.cjs',
    'index.js',
  ];

  for (const item of items) {
    const from = join(srcDir, item);
    if (await exists(from)) {
      const to = join(destDir, item);
      try {
        await copyItem(from, to);
        console.log(`[copy-cesium-assets] Copied ${item}`);
      } catch (err) {
        console.warn(`[copy-cesium-assets] Failed to copy ${item}: ${err?.message || err}`);
      }
    }
  }

  console.log(`[copy-cesium-assets] Done -> ${destDir}`);
}

main().catch((e) => {
  console.error('[copy-cesium-assets] Error:', e);
  process.exit(1);
});
