import { useCallback, useEffect, useState } from "react";
import { type Viewer as ViewerType, type Cesium3DTileset } from "cesium";
import type { DebugViewModel } from "./types";

export function useDebugControls(viewer: ViewerType | null, tileset: Cesium3DTileset | null) {
  const [viewModel, setViewModel] = useState<DebugViewModel | null>(null);

  useEffect(() => {
    if (!viewer) return;

    setViewModel({
      showFps: viewer.scene.debugShowFramesPerSecond,
      tilesetWireframe: tileset?.debugWireframe ?? false,
      tilesetShowBoundingVolume: tileset?.debugShowBoundingVolume ?? false,
      tilesetColorizeTiles: tileset?.debugColorizeTiles ?? false,
      tilesetShowGeometricError: tileset?.debugShowGeometricError ?? false,
      tilesetShowRenderingStatistics: tileset?.debugShowRenderingStatistics ?? false,
      tilesetShowMemoryUsage: tileset?.debugShowMemoryUsage ?? false,
    });
  }, [viewer, tileset]);

  const updateParameter = useCallback(
    <K extends keyof DebugViewModel>(key: K, value: DebugViewModel[K]) => {
      if (!viewer) return;
      setViewModel((prev) => (prev ? { ...prev, [key]: value } : prev));
      applyDebugParameterChange(viewer, tileset, key, value);
    },
    [viewer, tileset]
  );

  return { viewModel, updateParameter };
}

function applyDebugParameterChange<K extends keyof DebugViewModel>(
  viewer: ViewerType,
  tileset: Cesium3DTileset | null,
  key: K,
  value: DebugViewModel[K]
) {
  switch (key) {
    case "showFps":
      viewer.scene.debugShowFramesPerSecond = value as boolean;
      break;
    case "tilesetWireframe":
      if (tileset) tileset.debugWireframe = value as boolean;
      break;
    case "tilesetShowBoundingVolume":
      if (tileset) tileset.debugShowBoundingVolume = value as boolean;
      break;
    case "tilesetColorizeTiles":
      if (tileset) tileset.debugColorizeTiles = value as boolean;
      break;
    case "tilesetShowGeometricError":
      if (tileset) tileset.debugShowGeometricError = value as boolean;
      break;
    case "tilesetShowRenderingStatistics":
      if (tileset) tileset.debugShowRenderingStatistics = value as boolean;
      break;
    case "tilesetShowMemoryUsage":
      if (tileset) tileset.debugShowMemoryUsage = value as boolean;
      break;
  }

  viewer.scene.requestRender();
}
