import { useEffect, useState } from "react";
import { type ImageryLayer, type Viewer as ViewerType } from "cesium";
import { type MapStyle } from "../imagery/styles";

export function useImageryStyle(viewer: ViewerType | null, styles: MapStyle[]) {
  const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(
    styles[0]?.key ?? null
  );

  // Keyed on the style object: rebuilding the style list (e.g. a new NASA date) only
  // reloads imagery if the selected style itself was rebuilt
  const style = styles.find((s) => s.key === selectedStyleKey);

  useEffect(() => {
    if (!viewer || !style) return;
    // Base layers go at the bottom of the stack and only they are removed on change,
    // so overlays added by other hooks (e.g. night lights) stay on top
    let layers: ImageryLayer[] = [];
    try {
      layers = style.createProviders().map((provider, index) =>
        viewer.imageryLayers.addImageryProvider(provider, index)
      );
      viewer.scene.requestRender();
    } catch (e) {
      console.warn("Failed to apply imagery style:", e);
    }
    return () => {
      if (viewer.isDestroyed()) return;
      for (const layer of layers) viewer.imageryLayers.remove(layer, true);
    };
  }, [viewer, style]);

  return { selectedStyleKey, setSelectedStyleKey };
}
