import { useEffect } from "react";
import { type Viewer as ViewerType, Cesium3DTileset } from "cesium";

const TILESET_URL = "/tiles/montreal-buildings/tileset.json";

export function useBuildingsTileset(viewer: ViewerType | null) {
  useEffect(() => {
    if (!viewer) return;

    let tileset: Cesium3DTileset | null = null;
    let cancelled = false;

    Cesium3DTileset.fromUrl(TILESET_URL)
      .then((ts) => {
        if (cancelled) {
          ts.destroy();
          return;
        }
        tileset = ts;
        viewer.scene.primitives.add(ts);
      })
      .catch((e) => console.warn("Failed to load buildings tileset:", e));

    return () => {
      cancelled = true;
      if (tileset) viewer.scene.primitives.remove(tileset);
    };
  }, [viewer]);
}
