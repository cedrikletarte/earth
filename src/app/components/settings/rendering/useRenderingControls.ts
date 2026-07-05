import { useCallback, useEffect, useState } from "react";
import { type Viewer as ViewerType } from "cesium";
import type { RenderingViewModel } from "./types";

export function useRenderingControls(viewer: ViewerType | null) {
  const [viewModel, setViewModel] = useState<RenderingViewModel | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const scene = viewer.scene;

    setViewModel({
      msaaSamples: scene.msaaSamples,
      fxaa: scene.postProcessStages.fxaa.enabled,
      requestRenderMode: scene.requestRenderMode,
      resolutionScale: viewer.resolutionScale,
      shadows: viewer.shadowMap.enabled,
      softShadows: viewer.shadowMap.softShadows,
    });
  }, [viewer]);

  const updateParameter = useCallback(
    <K extends keyof RenderingViewModel>(key: K, value: RenderingViewModel[K]) => {
      if (!viewer) return;
      setViewModel((prev) => (prev ? { ...prev, [key]: value } : prev));
      applyRenderingParameterChange(viewer, key, value);
    },
    [viewer]
  );

  return { viewModel, updateParameter };
}

function applyRenderingParameterChange<K extends keyof RenderingViewModel>(
  viewer: ViewerType,
  key: K,
  value: RenderingViewModel[K]
) {
  const scene = viewer.scene;

  switch (key) {
    case "msaaSamples":
      scene.msaaSamples = value as number;
      break;
    case "fxaa":
      scene.postProcessStages.fxaa.enabled = value as boolean;
      break;
    case "requestRenderMode":
      scene.requestRenderMode = value as boolean;
      break;
    case "resolutionScale":
      viewer.resolutionScale = value as number;
      break;
    case "shadows":
      viewer.shadowMap.enabled = value as boolean;
      break;
    case "softShadows":
      viewer.shadowMap.softShadows = value as boolean;
      break;
  }

  scene.requestRender();
}
