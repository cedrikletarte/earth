import { useEffect, useState } from "react";
import { type Viewer as ViewerType } from "cesium";
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
    try {
      viewer.imageryLayers.removeAll();
      for (const provider of style.createProviders()) {
        viewer.imageryLayers.addImageryProvider(provider);
      }
      viewer.scene.requestRender();
    } catch (e) {
      console.warn("Failed to apply imagery style:", e);
    }
  }, [viewer, style]);

  return { selectedStyleKey, setSelectedStyleKey };
}
