export interface GlobeViewModel {
  show: boolean;
  depthTestAgainstTerrain: boolean;
  baseColor: string;
  showWaterEffect: boolean;
  maximumScreenSpaceError: number;
  tileCacheSize: number;
  preloadAncestors: boolean;
  preloadSiblings: boolean;
  verticalExaggeration: number;
  verticalExaggerationRelativeHeight: number;

  // Active imagery layer adjustments. Reset to the provider's defaults when
  // the map style changes (MapStyleDrawer removes/re-adds the layer).
  imageryAlpha: number;
  imageryBrightness: number;
  imageryContrast: number;
  imageryHue: number;
  imagerySaturation: number;
  imageryGamma: number;
}
