import { useEffect, useState } from "react";
import { type Viewer as ViewerType } from "cesium";
import { type MapStyle } from "../drawers/MapStyleDrawer";

export function useImageryStyle(viewer: ViewerType | null, styles: MapStyle[]) {
  const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(
    styles[0]?.key ?? null
  );

  useEffect(() => {
    if (!viewer || !selectedStyleKey) return;
    const style = styles.find((s) => s.key === selectedStyleKey);
    if (!style) return;
    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(style.createProvider());
      viewer.scene.requestRender();
    } catch (e) {
      console.warn("Failed to apply imagery style:", e);
    }
  }, [viewer, selectedStyleKey]);

  return { selectedStyleKey, setSelectedStyleKey };
}
