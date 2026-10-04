import { useEffect } from "react";
import { ImageryLayer, type Viewer as ViewerType } from "cesium";
import { GIBS_LAYERS, createGibsProvider } from "../imagery/gibs";

/**
 * Draws NASA's Black Marble city lights over the night side of the globe, on top of
 * whatever base style is selected.
 *
 * `active` must only be true in 3D with globe lighting on: day/night alpha is ignored
 * without lighting, and the layer would then cover the whole globe.
 */
export function useNightLights(viewer: ViewerType | null, active: boolean) {
  useEffect(() => {
    if (!viewer || !active) return;
    const layer = new ImageryLayer(createGibsProvider(GIBS_LAYERS.blackMarble), {
      dayAlpha: 0.0,
      nightAlpha: 1.0,
    });
    viewer.imageryLayers.add(layer); // top of the stack
    return () => {
      if (!viewer.isDestroyed()) viewer.imageryLayers.remove(layer, true);
    };
  }, [viewer, active]);
}
