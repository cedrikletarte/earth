import { useCallback, useEffect, useState } from "react";
import {
  Cartesian3,
  Terrain,
  EllipsoidTerrainProvider,
  JulianDate,
  ClockRange,
  SceneMode,
  type Viewer as ViewerType
} from "cesium";
import type { AtmosphereViewModel } from "./types";
import { getAtmosphereDefaults, createInitialViewModel } from "./utils";

export function useAtmosphereControls(viewer: ViewerType | null) {
  const [viewModel, setViewModel] = useState<AtmosphereViewModel | null>(null);

  // Initialize the view model when viewer is available
  useEffect(() => {
    if (!viewer) return;

    // Add a small delay to ensure viewer is fully initialized
    const initializeAtmosphere = () => {
      try {
        // Set up initial atmosphere settings
        const scene = viewer.scene;
        const globe = scene.globe;

        // Only apply atmosphere effects in 3D mode
        if (scene.mode === SceneMode.SCENE3D) {
          scene.highDynamicRange = true;
          globe.enableLighting = true;
          globe.atmosphereLightIntensity = 20.0;

          // Enable dynamic lighting from the sun
          globe.dynamicAtmosphereLighting = true;
          globe.dynamicAtmosphereLightingFromSun = true;

          // Enable atmosphere effects
          globe.showGroundAtmosphere = true;
          if (scene.skyAtmosphere) {
            scene.skyAtmosphere.show = true;
          }
          scene.fog.enabled = true;
        } else {
          // Disable atmosphere effects in 2D/Columbus modes
          scene.highDynamicRange = false;
          globe.enableLighting = false;
          globe.showGroundAtmosphere = false;
          if (scene.skyAtmosphere) {
            scene.skyAtmosphere.show = false;
          }
          scene.fog.enabled = false;
        }

        // Set up real-time clock
        viewer.clock.currentTime = JulianDate.now();
        viewer.clock.multiplier = 1.0; // Real-time multiplier
        viewer.clock.clockRange = ClockRange.UNBOUNDED;
        viewer.clock.shouldAnimate = true;

        // Set up canvas focus
        const canvas = viewer.canvas;
        canvas.setAttribute("tabindex", "0");
        canvas.onclick = function () {
          canvas.focus();
        };

        // Get default values and create initial view model
        const defaults = getAtmosphereDefaults(viewer);
        const initialViewModel = createInitialViewModel(defaults);
        setViewModel(initialViewModel);

      } catch (error) {
        console.warn("Failed to initialize atmosphere controls:", error);
      }
    };

    // Initialize immediately, but also try again after a short delay if needed
    initializeAtmosphere();

    // Backup initialization after a small delay to ensure everything is ready
    const timeoutId = setTimeout(initializeAtmosphere, 100);

    return () => clearTimeout(timeoutId);
  }, [viewer]);

  // Set up all the atmosphere parameter observers
  useEffect(() => {
    if (!viewer || !viewModel) return;

    const scene = viewer.scene;
    const globe = scene.globe;
    const skyAtmosphere = scene.skyAtmosphere;

    if (!skyAtmosphere) return;

    const cleanupFunctions: Array<() => void> = [];

    // Helper function to create observable and cleanup
    const createObserver = <K extends keyof AtmosphereViewModel>(
      property: K,
      handler: (newValue: AtmosphereViewModel[K]) => void
    ) => {
      const observable = {
        value: viewModel[property],
        subscribe: (callback: (newValue: AtmosphereViewModel[K]) => void) => {
          // This is a simplified version - in a real implementation you'd use a proper observable library
          return () => { }; // Return cleanup function
        }
      };

      // For now, we'll handle this differently since we're using React state
      return () => { };
    };

    // Terrain controls
    const enableTerrainCleanup = createObserver("enableTerrain", async (newValue) => {
      if (newValue) {
        scene.setTerrain(Terrain.fromWorldTerrain());
      } else {
        scene.terrainProvider = new EllipsoidTerrainProvider();
      }
    });
    cleanupFunctions.push(enableTerrainCleanup);

    // Scene controls
    const enableLightingCleanup = createObserver("enableLighting", (newValue) => {
      globe.enableLighting = newValue;
    });
    cleanupFunctions.push(enableLightingCleanup);

    const showGroundAtmosphereCleanup = createObserver("showGroundAtmosphere", (newValue) => {
      globe.showGroundAtmosphere = newValue;
    });
    cleanupFunctions.push(showGroundAtmosphereCleanup);

    const dynamicLightingCleanup = createObserver("dynamicLighting", (newValue) => {
      globe.dynamicAtmosphereLighting = newValue;
    });
    cleanupFunctions.push(dynamicLightingCleanup);

    const dynamicLightingFromSunCleanup = createObserver("dynamicLightingFromSun", (newValue) => {
      globe.dynamicAtmosphereLightingFromSun = newValue;
    });
    cleanupFunctions.push(dynamicLightingFromSunCleanup);

    // Fog controls
    const showFogCleanup = createObserver("showFog", (newValue) => {
      scene.fog.enabled = newValue;
    });
    cleanupFunctions.push(showFogCleanup);

    const densityCleanup = createObserver("density", (newValue) => {
      scene.fog.density = 2.0e-4 * newValue;
    });
    cleanupFunctions.push(densityCleanup);

    const minimumBrightnessCleanup = createObserver("minimumBrightness", (newValue) => {
      scene.fog.minimumBrightness = newValue;
    });
    cleanupFunctions.push(minimumBrightnessCleanup);

    // Ground atmosphere controls
    const groundAtmosphereLightIntensityCleanup = createObserver("groundAtmosphereLightIntensity", (newValue) => {
      globe.atmosphereLightIntensity = parseFloat(String(newValue));
    });
    cleanupFunctions.push(groundAtmosphereLightIntensityCleanup);

    // Sky atmosphere controls
    const showSkyAtmosphereCleanup = createObserver("showSkyAtmosphere", (newValue) => {
      skyAtmosphere.show = newValue;
    });
    cleanupFunctions.push(showSkyAtmosphereCleanup);

    const skyAtmosphereLightIntensityCleanup = createObserver("skyAtmosphereLightIntensity", (newValue) => {
      skyAtmosphere.atmosphereLightIntensity = parseFloat(String(newValue));
    });
    cleanupFunctions.push(skyAtmosphereLightIntensityCleanup);

    // HDR control
    const hdrCleanup = createObserver("hdr", (newValue) => {
      scene.highDynamicRange = newValue;
    });
    cleanupFunctions.push(hdrCleanup);

    // Ground translucency
    const groundTranslucencyCleanup = createObserver("groundTranslucency", (newValue) => {
      globe.translucency.enabled = newValue;
      globe.translucency.frontFaceAlpha = 0.1;
      globe.translucency.backFaceAlpha = 0.1;
    });
    cleanupFunctions.push(groundTranslucencyCleanup);

    // Per fragment atmosphere
    const perFragmentAtmosphereCleanup = createObserver("perFragmentAtmosphere", (newValue) => {
      scene.skyAtmosphere!.perFragmentAtmosphere = newValue;
    });
    cleanupFunctions.push(perFragmentAtmosphereCleanup);

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [viewer, viewModel]);

  const updateParameter = useCallback(<K extends keyof AtmosphereViewModel>(
    key: K,
    value: AtmosphereViewModel[K]
  ) => {
    if (!viewer || !viewModel) return;

    setViewModel(prev => {
      if (!prev) return prev;
      const newViewModel = { ...prev, [key]: value };

      // Apply the change immediately to Cesium
      applyParameterChange(viewer, key, value);

      return newViewModel;
    });
  }, [viewer, viewModel]);

  return {
    viewModel,
    updateParameter,
  };
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
    // Only allow certain non-atmospheric parameters in 2D
    if (key !== "enableTerrain") {
      return;
    }
  }

  switch (key) {
    case "enableTerrain":
      if (value) {
        scene.setTerrain(Terrain.fromWorldTerrain());
      } else {
        scene.terrainProvider = new EllipsoidTerrainProvider();
      }
      break;

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
      scene.fog.density = 2.0e-4 * (value as number);
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

    case "groundAtmosphereMieCoefficient":
      const groundMieValue = (value as number) * 1e-6;
      globe.atmosphereMieCoefficient = new Cartesian3(groundMieValue, groundMieValue, groundMieValue);
      break;

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

    case "skyAtmosphereMieCoefficient":
      const skyMieValue = (value as number) * 1e-6;
      skyAtmosphere.atmosphereMieCoefficient = new Cartesian3(skyMieValue, skyMieValue, skyMieValue);
      break;

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
