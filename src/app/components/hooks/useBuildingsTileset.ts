import { useEffect, useState } from "react";
import { type Viewer as ViewerType, Cesium3DTileset } from "cesium";

const TILESET_URL = "/tiles/montreal-buildings/tileset.json";

export function useBuildingsTileset(viewer: ViewerType | null) {
  const [tileset, setTileset] = useState<Cesium3DTileset | null>(null);

  useEffect(() => {
    if (!viewer) return;

    let localTileset: Cesium3DTileset | null = null;
    let cancelled = false;

    // enableDebugWireframe is required at creation time for the debug
    // wireframe toggle (Debug settings tab) to have any effect.
    Cesium3DTileset.fromUrl(TILESET_URL, { enableDebugWireframe: true })
      .then((ts) => {
        if (cancelled) {
          ts.destroy();
          return;
        }
        localTileset = ts;
        viewer.scene.primitives.add(ts);
        setTileset(ts);
      })
      .catch((e) => console.warn("Failed to load buildings tileset:", e));

    return () => {
      cancelled = true;
      if (localTileset) viewer.scene.primitives.remove(localTileset);
      setTileset(null);
    };
  }, [viewer]);

  return tileset;
}
