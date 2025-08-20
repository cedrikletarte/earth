import type { Viewer as ViewerType } from "cesium";
import { AtmosphereDefaults } from "./types";

/**
 * Gets the default atmosphere values from a Cesium viewer
 */
export function getAtmosphereDefaults(viewer: ViewerType): AtmosphereDefaults {
  const scene = viewer.scene;
  const globe = scene.globe;
  const skyAtmosphere = scene.skyAtmosphere;

  if (!skyAtmosphere) {
    throw new Error("Sky atmosphere is not available");
  }

  return {
    groundAtmosphereLightIntensity: globe.atmosphereLightIntensity,
    groundAtmosphereRayleighCoefficient: {
      x: globe.atmosphereRayleighCoefficient.x,
      y: globe.atmosphereRayleighCoefficient.y,
      z: globe.atmosphereRayleighCoefficient.z,
    },
    groundAtmosphereMieCoefficient: {
      x: globe.atmosphereMieCoefficient.x,
      y: globe.atmosphereMieCoefficient.y,
      z: globe.atmosphereMieCoefficient.z,
    },
    groundAtmosphereMieAnisotropy: globe.atmosphereMieAnisotropy,
    groundAtmosphereRayleighScaleHeight: globe.atmosphereRayleighScaleHeight,
    groundAtmosphereMieScaleHeight: globe.atmosphereMieScaleHeight,
    groundAtmosphereHueShift: globe.atmosphereHueShift,
    groundAtmosphereSaturationShift: globe.atmosphereSaturationShift,
    groundAtmosphereBrightnessShift: globe.atmosphereBrightnessShift,
    lightFadeOut: globe.lightingFadeOutDistance,
    lightFadeIn: globe.lightingFadeInDistance,
    nightFadeOut: globe.nightFadeOutDistance,
    nightFadeIn: globe.nightFadeInDistance,
    skyAtmosphereLightIntensity: skyAtmosphere.atmosphereLightIntensity,
    skyAtmosphereRayleighCoefficient: {
      x: skyAtmosphere.atmosphereRayleighCoefficient.x,
      y: skyAtmosphere.atmosphereRayleighCoefficient.y,
      z: skyAtmosphere.atmosphereRayleighCoefficient.z,
    },
    skyAtmosphereMieCoefficient: {
      x: skyAtmosphere.atmosphereMieCoefficient.x,
      y: skyAtmosphere.atmosphereMieCoefficient.y,
      z: skyAtmosphere.atmosphereMieCoefficient.z,
    },
    skyAtmosphereMieAnisotropy: skyAtmosphere.atmosphereMieAnisotropy,
    skyAtmosphereRayleighScaleHeight: skyAtmosphere.atmosphereRayleighScaleHeight,
    skyAtmosphereMieScaleHeight: skyAtmosphere.atmosphereMieScaleHeight,
    skyAtmosphereHueShift: skyAtmosphere.hueShift,
    skyAtmosphereSaturationShift: skyAtmosphere.saturationShift,
    skyAtmosphereBrightnessShift: skyAtmosphere.brightnessShift,
  };
}

/**
 * Creates the initial atmosphere view model from defaults
 */
export function createInitialViewModel(defaults: AtmosphereDefaults) {
  return {
    // Globe settings
    enableTerrain: false,
    enableLighting: true,
    groundTranslucency: false,

    // Ground atmosphere settings
    showGroundAtmosphere: true,
    groundAtmosphereLightIntensity: defaults.groundAtmosphereLightIntensity,
    groundAtmosphereRayleighCoefficientR: defaults.groundAtmosphereRayleighCoefficient.x / 1e-6,
    groundAtmosphereRayleighCoefficientG: defaults.groundAtmosphereRayleighCoefficient.y / 1e-6,
    groundAtmosphereRayleighCoefficientB: defaults.groundAtmosphereRayleighCoefficient.z / 1e-6,
    groundAtmosphereMieCoefficient: defaults.groundAtmosphereMieCoefficient.x / 1e-6,
    groundAtmosphereRayleighScaleHeight: defaults.groundAtmosphereRayleighScaleHeight,
    groundAtmosphereMieScaleHeight: defaults.groundAtmosphereMieScaleHeight,
    groundAtmosphereMieAnisotropy: defaults.groundAtmosphereMieAnisotropy,
    groundHueShift: defaults.groundAtmosphereHueShift,
    groundSaturationShift: defaults.groundAtmosphereSaturationShift,
    groundBrightnessShift: defaults.groundAtmosphereBrightnessShift,
    lightingFadeOutDistance: defaults.lightFadeOut,
    lightingFadeInDistance: defaults.lightFadeIn,
    nightFadeOutDistance: defaults.nightFadeOut,
    nightFadeInDistance: defaults.nightFadeIn,

    // Sky atmosphere settings
    showSkyAtmosphere: true,
    skyAtmosphereLightIntensity: defaults.skyAtmosphereLightIntensity,
    skyAtmosphereRayleighCoefficientR: defaults.skyAtmosphereRayleighCoefficient.x / 1e-6,
    skyAtmosphereRayleighCoefficientG: defaults.skyAtmosphereRayleighCoefficient.y / 1e-6,
    skyAtmosphereRayleighCoefficientB: defaults.skyAtmosphereRayleighCoefficient.z / 1e-6,
    skyAtmosphereMieCoefficient: defaults.skyAtmosphereMieCoefficient.x / 1e-6,
    skyAtmosphereRayleighScaleHeight: defaults.skyAtmosphereRayleighScaleHeight,
    skyAtmosphereMieScaleHeight: defaults.skyAtmosphereMieScaleHeight,
    skyAtmosphereMieAnisotropy: defaults.skyAtmosphereMieAnisotropy,
    skyHueShift: defaults.skyAtmosphereHueShift,
    skySaturationShift: defaults.skyAtmosphereSaturationShift,
    skyBrightnessShift: defaults.skyAtmosphereBrightnessShift,
    perFragmentAtmosphere: false,
    dynamicLighting: true,
    dynamicLightingFromSun: false,

    // Fog settings
    showFog: true,
    density: 1.0,
    minimumBrightness: 0.03,

    // Scene settings
    hdr: true,
  };
}
