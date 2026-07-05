import { useCallback, useEffect, useState } from "react";
import { Color, type Viewer as ViewerType } from "cesium";
import type { GlobeViewModel } from "./types";

export function useGlobeControls(viewer: ViewerType | null) {
  const [viewModel, setViewModel] = useState<GlobeViewModel | null>(null);

  useEffect(() => {
    if (!viewer) return;

    const globe = viewer.scene.globe;
    const layer = viewer.imageryLayers.get(0);

    setViewModel({
      show: globe.show,
      depthTestAgainstTerrain: globe.depthTestAgainstTerrain,
      baseColor: globe.baseColor.toCssHexString(),
      showWaterEffect: globe.showWaterEffect,
      maximumScreenSpaceError: globe.maximumScreenSpaceError,
      tileCacheSize: globe.tileCacheSize,
      preloadAncestors: globe.preloadAncestors,
      preloadSiblings: globe.preloadSiblings,
      verticalExaggeration: viewer.scene.verticalExaggeration,
      verticalExaggerationRelativeHeight: viewer.scene.verticalExaggerationRelativeHeight,
      imageryAlpha: layer?.alpha ?? 1,
      imageryBrightness: layer?.brightness ?? 1,
      imageryContrast: layer?.contrast ?? 1,
      imageryHue: layer?.hue ?? 0,
      imagerySaturation: layer?.saturation ?? 1,
      imageryGamma: layer?.gamma ?? 1,
    });
  }, [viewer]);

  const updateParameter = useCallback(
    <K extends keyof GlobeViewModel>(key: K, value: GlobeViewModel[K]) => {
      if (!viewer) return;
      setViewModel((prev) => (prev ? { ...prev, [key]: value } : prev));
      applyGlobeParameterChange(viewer, key, value);
    },
    [viewer]
  );

  return { viewModel, updateParameter };
}

function applyGlobeParameterChange<K extends keyof GlobeViewModel>(
  viewer: ViewerType,
  key: K,
  value: GlobeViewModel[K]
) {
  const globe = viewer.scene.globe;
  const layer = viewer.imageryLayers.get(0);

  switch (key) {
    case "show":
      globe.show = value as boolean;
      break;
    case "depthTestAgainstTerrain":
      globe.depthTestAgainstTerrain = value as boolean;
      break;
    case "baseColor":
      globe.baseColor = Color.fromCssColorString(value as string);
      break;
    case "showWaterEffect":
      globe.showWaterEffect = value as boolean;
      break;
    case "maximumScreenSpaceError":
      globe.maximumScreenSpaceError = value as number;
      break;
    case "tileCacheSize":
      globe.tileCacheSize = value as number;
      break;
    case "preloadAncestors":
      globe.preloadAncestors = value as boolean;
      break;
    case "preloadSiblings":
      globe.preloadSiblings = value as boolean;
      break;
    case "verticalExaggeration":
      viewer.scene.verticalExaggeration = value as number;
      break;
    case "verticalExaggerationRelativeHeight":
      viewer.scene.verticalExaggerationRelativeHeight = value as number;
      break;
    case "imageryAlpha":
      if (layer) layer.alpha = value as number;
      break;
    case "imageryBrightness":
      if (layer) layer.brightness = value as number;
      break;
    case "imageryContrast":
      if (layer) layer.contrast = value as number;
      break;
    case "imageryHue":
      if (layer) layer.hue = value as number;
      break;
    case "imagerySaturation":
      if (layer) layer.saturation = value as number;
      break;
    case "imageryGamma":
      if (layer) layer.gamma = value as number;
      break;
  }

  viewer.scene.requestRender();
}
