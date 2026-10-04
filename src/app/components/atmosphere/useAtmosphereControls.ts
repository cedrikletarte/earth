import { useCallback, useEffect, useState } from "react";
import {
  Cartesian3,
  JulianDate,
  ClockRange,
  SceneMode,
  type Viewer as ViewerType
} from "cesium";
import type { AtmosphereViewModel } from "./types";
import { getAtmosphereDefaults, createInitialViewModel, FOG_DENSITY_UNIT } from "./utils";

export function useAtmosphereControls(viewer: ViewerType | null) {
  // The view model is the single source of truth; it is (re)built from Cesium's defaults whenever the viewer changes
  const [state, setState] = useState<{ viewer: ViewerType; viewModel: AtmosphereViewModel } | null>(null);
  if (viewer && state?.viewer !== viewer) {
    setState({ viewer, viewModel: createInitialViewModel(getAtmosphereDefaults(viewer)) });
  }
  const viewModel = state && state.viewer === viewer ? state.viewModel : null;

  // Real-time clock (drives sun position) and keyboard focus for camera controls
  useEffect(() => {
    if (!viewer) return;
    // eslint-disable-next-line react-hooks/immutability -- Cesium's Viewer is an imperative handle, not React data
    viewer.clock.currentTime = JulianDate.now();
    viewer.clock.multiplier = 1.0; // Real-time multiplier
    viewer.clock.clockRange = ClockRange.UNBOUNDED;
    viewer.clock.shouldAnimate = true;

    const canvas = viewer.canvas;
    canvas.setAttribute("tabindex", "0");
    canvas.onclick = () => canvas.focus();
  }, [viewer]);

  // Push the view model to the scene, and again on every return to 3D
  // (2D/Columbus morphs switch the effects off, see useCesiumViewer)
  useEffect(() => {
    if (!viewer || !viewModel) return;
    applyViewModel(viewer, viewModel);
    const onMorphComplete = () => {
      if (viewer.scene.mode === SceneMode.SCENE3D) applyViewModel(viewer, viewModel);
    };
    viewer.scene.morphComplete.addEventListener(onMorphComplete);
    return () => {
      if (!viewer.isDestroyed()) viewer.scene.morphComplete.removeEventListener(onMorphComplete);
    };
  }, [viewer, viewModel]);

  const updateParameter = useCallback(<K extends keyof AtmosphereViewModel>(
    key: K,
    value: AtmosphereViewModel[K]
  ) => {
    setState(prev => (prev ? { ...prev, viewModel: { ...prev.viewModel, [key]: value } } : prev));
  }, []);

  return {
    viewModel,
    updateParameter,
  };
}

function applyViewModel(viewer: ViewerType, viewModel: AtmosphereViewModel) {
  for (const key of Object.keys(viewModel) as (keyof AtmosphereViewModel)[]) {
    applyParameterChange(viewer, key, viewModel[key]);
  }
}

// Helper function to apply parameter changes to Cesium
function applyParameterChange<K extends keyof AtmosphereViewModel>(
  viewer: ViewerType,
  key: K,
  value: AtmosphereViewModel[K]
) {
  const scene = viewer.scene;
  const globe = scene.globe;
  const skyAtmosphere = scene.skyAtmosphere;

  if (!skyAtmosphere) return;

  // Don't apply atmosphere changes in 2D or Columbus modes
  if (scene.mode !== SceneMode.SCENE3D) {
    return;
  }

  switch (key) {
    case "enableLighting":
      globe.enableLighting = value as boolean;
      break;

    case "showGroundAtmosphere":
      globe.showGroundAtmosphere = value as boolean;
      break;

    case "dynamicLighting":
      globe.dynamicAtmosphereLighting = value as boolean;
      break;

    case "dynamicLightingFromSun":
      globe.dynamicAtmosphereLightingFromSun = value as boolean;
      break;

    case "showFog":
      scene.fog.enabled = value as boolean;
      break;

    case "density":
      scene.fog.density = FOG_DENSITY_UNIT * (value as number);
      break;

    case "minimumBrightness":
      scene.fog.minimumBrightness = value as number;
      break;

    case "groundAtmosphereLightIntensity":
      globe.atmosphereLightIntensity = value as number;
      break;

    case "groundAtmosphereRayleighCoefficientR":
      globe.atmosphereRayleighCoefficient.x = (value as number) * 1e-6;
      break;

    case "groundAtmosphereRayleighCoefficientG":
      globe.atmosphereRayleighCoefficient.y = (value as number) * 1e-6;
      break;

    case "groundAtmosphereRayleighCoefficientB":
      globe.atmosphereRayleighCoefficient.z = (value as number) * 1e-6;
      break;

    case "groundAtmosphereMieCoefficient": {
      const groundMieValue = (value as number) * 1e-6;
      globe.atmosphereMieCoefficient = new Cartesian3(groundMieValue, groundMieValue, groundMieValue);
      break;
    }

    case "groundAtmosphereRayleighScaleHeight":
      globe.atmosphereRayleighScaleHeight = value as number;
      break;

    case "groundAtmosphereMieScaleHeight":
      globe.atmosphereMieScaleHeight = value as number;
      break;

    case "groundAtmosphereMieAnisotropy":
      globe.atmosphereMieAnisotropy = value as number;
      break;

    case "groundHueShift":
      globe.atmosphereHueShift = value as number;
      break;

    case "groundSaturationShift":
      globe.atmosphereSaturationShift = value as number;
      break;

    case "groundBrightnessShift":
      globe.atmosphereBrightnessShift = value as number;
      break;

    case "lightingFadeOutDistance":
      globe.lightingFadeOutDistance = value as number;
      break;

    case "lightingFadeInDistance":
      globe.lightingFadeInDistance = value as number;
      break;

    case "nightFadeOutDistance":
      globe.nightFadeOutDistance = value as number;
      break;

    case "nightFadeInDistance":
      globe.nightFadeInDistance = value as number;
      break;

    case "showSkyAtmosphere":
      skyAtmosphere.show = value as boolean;
      break;

    case "skyAtmosphereLightIntensity":
      skyAtmosphere.atmosphereLightIntensity = value as number;
      break;

    case "skyAtmosphereRayleighCoefficientR":
      skyAtmosphere.atmosphereRayleighCoefficient.x = (value as number) * 1e-6;
      break;

    case "skyAtmosphereRayleighCoefficientG":
      skyAtmosphere.atmosphereRayleighCoefficient.y = (value as number) * 1e-6;
      break;

    case "skyAtmosphereRayleighCoefficientB":
      skyAtmosphere.atmosphereRayleighCoefficient.z = (value as number) * 1e-6;
      break;

    case "skyAtmosphereMieCoefficient": {
      const skyMieValue = (value as number) * 1e-6;
      skyAtmosphere.atmosphereMieCoefficient = new Cartesian3(skyMieValue, skyMieValue, skyMieValue);
      break;
    }

    case "skyAtmosphereRayleighScaleHeight":
      skyAtmosphere.atmosphereRayleighScaleHeight = value as number;
      break;

    case "skyAtmosphereMieScaleHeight":
      skyAtmosphere.atmosphereMieScaleHeight = value as number;
      break;

    case "skyAtmosphereMieAnisotropy":
      skyAtmosphere.atmosphereMieAnisotropy = value as number;
      break;

    case "skyHueShift":
      skyAtmosphere.hueShift = value as number;
      break;

    case "skySaturationShift":
      skyAtmosphere.saturationShift = value as number;
      break;

    case "skyBrightnessShift":
      skyAtmosphere.brightnessShift = value as number;
      break;

    case "perFragmentAtmosphere":
      skyAtmosphere.perFragmentAtmosphere = value as boolean;
      break;

    case "hdr":
      scene.highDynamicRange = value as boolean;
      break;

    case "groundTranslucency":
      globe.translucency.enabled = value as boolean;
      globe.translucency.frontFaceAlpha = 0.1;
      globe.translucency.backFaceAlpha = 0.1;
      break;
  }
}
