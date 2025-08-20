export interface AtmosphereViewModel {
  // Globe settings
  enableTerrain: boolean;
  enableLighting: boolean;
  groundTranslucency: boolean;

  // Ground atmosphere settings
  showGroundAtmosphere: boolean;
  groundAtmosphereLightIntensity: number;
  groundAtmosphereRayleighCoefficientR: number;
  groundAtmosphereRayleighCoefficientG: number;
  groundAtmosphereRayleighCoefficientB: number;
  groundAtmosphereMieCoefficient: number;
  groundAtmosphereRayleighScaleHeight: number;
  groundAtmosphereMieScaleHeight: number;
  groundAtmosphereMieAnisotropy: number;
  groundHueShift: number;
  groundSaturationShift: number;
  groundBrightnessShift: number;
  lightingFadeOutDistance: number;
  lightingFadeInDistance: number;
  nightFadeOutDistance: number;
  nightFadeInDistance: number;

  // Sky atmosphere settings
  showSkyAtmosphere: boolean;
  skyAtmosphereLightIntensity: number;
  skyAtmosphereRayleighCoefficientR: number;
  skyAtmosphereRayleighCoefficientG: number;
  skyAtmosphereRayleighCoefficientB: number;
  skyAtmosphereMieCoefficient: number;
  skyAtmosphereRayleighScaleHeight: number;
  skyAtmosphereMieScaleHeight: number;
  skyAtmosphereMieAnisotropy: number;
  skyHueShift: number;
  skySaturationShift: number;
  skyBrightnessShift: number;
  perFragmentAtmosphere: boolean;
  dynamicLighting: boolean;
  dynamicLightingFromSun: boolean;

  // Fog settings
  showFog: boolean;
  density: number;
  minimumBrightness: number;

  // Scene settings
  hdr: boolean;
}

export interface AtmosphereDefaults {
  groundAtmosphereLightIntensity: number;
  groundAtmosphereRayleighCoefficient: { x: number; y: number; z: number };
  groundAtmosphereMieCoefficient: { x: number; y: number; z: number };
  groundAtmosphereMieAnisotropy: number;
  groundAtmosphereRayleighScaleHeight: number;
  groundAtmosphereMieScaleHeight: number;
  groundAtmosphereHueShift: number;
  groundAtmosphereSaturationShift: number;
  groundAtmosphereBrightnessShift: number;
  lightFadeOut: number;
  lightFadeIn: number;
  nightFadeOut: number;
  nightFadeIn: number;
  skyAtmosphereLightIntensity: number;
  skyAtmosphereRayleighCoefficient: { x: number; y: number; z: number };
  skyAtmosphereMieCoefficient: { x: number; y: number; z: number };
  skyAtmosphereMieAnisotropy: number;
  skyAtmosphereRayleighScaleHeight: number;
  skyAtmosphereMieScaleHeight: number;
  skyAtmosphereHueShift: number;
  skyAtmosphereSaturationShift: number;
  skyAtmosphereBrightnessShift: number;
}
