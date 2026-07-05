import { useCallback, useEffect, useState } from "react";
import { type Viewer as ViewerType } from "cesium";
import type { CameraViewModel } from "./types";

// screenSpaceCameraController.maximumZoomDistance defaults to Infinity, which
// isn't representable on a slider — clamp display/edit range to this instead.
const MAX_ZOOM_DISTANCE_CAP = 50_000_000;

export function useCameraControls(viewer: ViewerType | null) {
  const [viewModel, setViewModel] = useState<CameraViewModel | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const controller = viewer.scene.screenSpaceCameraController;

    setViewModel({
      enableRotate: controller.enableRotate,
      enableTranslate: controller.enableTranslate,
      enableZoom: controller.enableZoom,
      enableTilt: controller.enableTilt,
      enableLook: controller.enableLook,
      minimumZoomDistance: controller.minimumZoomDistance,
      maximumZoomDistance: Number.isFinite(controller.maximumZoomDistance)
        ? controller.maximumZoomDistance
        : MAX_ZOOM_DISTANCE_CAP,
      inertiaSpin: controller.inertiaSpin,
      inertiaTranslate: controller.inertiaTranslate,
      inertiaZoom: controller.inertiaZoom,
    });
  }, [viewer]);

  const updateParameter = useCallback(
    <K extends keyof CameraViewModel>(key: K, value: CameraViewModel[K]) => {
      if (!viewer) return;
      setViewModel((prev) => (prev ? { ...prev, [key]: value } : prev));
      applyCameraParameterChange(viewer, key, value);
    },
    [viewer]
  );

  return { viewModel, updateParameter };
}

function applyCameraParameterChange<K extends keyof CameraViewModel>(
  viewer: ViewerType,
  key: K,
  value: CameraViewModel[K]
) {
  const controller = viewer.scene.screenSpaceCameraController;

  switch (key) {
    case "enableRotate":
      controller.enableRotate = value as boolean;
      break;
    case "enableTranslate":
      controller.enableTranslate = value as boolean;
      break;
    case "enableZoom":
      controller.enableZoom = value as boolean;
      break;
    case "enableTilt":
      controller.enableTilt = value as boolean;
      break;
    case "enableLook":
      controller.enableLook = value as boolean;
      break;
    case "minimumZoomDistance":
      controller.minimumZoomDistance = value as number;
      break;
    case "maximumZoomDistance":
      controller.maximumZoomDistance = value as number;
      break;
    case "inertiaSpin":
      controller.inertiaSpin = value as number;
      break;
    case "inertiaTranslate":
      controller.inertiaTranslate = value as number;
      break;
    case "inertiaZoom":
      controller.inertiaZoom = value as number;
      break;
  }
}
