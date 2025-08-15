High-resolution space background (skybox)

Place six cube map images in `public/space/skybox/` with the following names:

- px.jpg (positive X)
- nx.jpg (negative X)
- py.jpg (positive Y)
- ny.jpg (negative Y)
- pz.jpg (positive Z)
- nz.jpg (negative Z)

Recommended sources:
- NASA/Goddard Space Flight Center image repository
- ESA/Hubble: https://esahubble.org/images/archive/search/?category=galaxies&format=jpg
- Milky Way panoramas (check licenses): e.g., ESO/GigaGalaxy Zoom

Recommended sizes:
- 4k to 8k per face for crisp visuals (e.g., 4096x4096)

Notes:
- Keep file sizes reasonable; consider using JPEG with quality ~80.
- If any of these files are missing, Cesium will keep its default star field.
