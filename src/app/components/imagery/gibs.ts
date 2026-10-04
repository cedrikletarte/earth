import { UrlTemplateImageryProvider, WebMercatorTilingScheme } from "cesium";

// NASA GIBS (Global Imagery Browse Services): free, keyless, CORS-enabled WMTS.
// Layer ids, formats and max levels come from the epsg3857 WMTSCapabilities.xml.
const GIBS_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

/** Earliest date every daily layer below has imagery for (VIIRS NOAA-20 launched last). */
export const GIBS_MIN_DATE = "2018-01-05";

export type GibsLayer = {
  id: string;
  format: "jpg" | "png";
  /** Deepest GoogleMapsCompatible level GIBS serves; deeper requests return 400 */
  maxLevel: number;
  /** "daily" follows the selected date; a fixed date pins one snapshot; omitted for timeless layers */
  time?: "daily" | string;
};

export const GIBS_LAYERS = {
  trueColor: { id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", format: "jpg", maxLevel: 9, time: "daily" },
  blueMarble: { id: "BlueMarble_NextGeneration", format: "jpg", maxLevel: 8 },
  blackMarble: { id: "VIIRS_Black_Marble", format: "png", maxLevel: 8, time: "2016-01-01" },
  seaSurfaceTemp: { id: "GHRSST_L4_MUR_Sea_Surface_Temperature", format: "png", maxLevel: 7, time: "daily" },
  precipitation: { id: "IMERG_Precipitation_Rate", format: "png", maxLevel: 6, time: "daily" },
  coastlines: { id: "Coastlines_15m", format: "png", maxLevel: 13 },
} satisfies Record<string, GibsLayer>;

/** `date` (YYYY-MM-DD) is only used by daily layers; without it they show GIBS's latest day. */
export function createGibsProvider(layer: GibsLayer, date?: string) {
  const time = layer.time === "daily" ? date ?? "default" : layer.time ?? "default";
  return new UrlTemplateImageryProvider({
    // GIBS REST tiles are addressed TileMatrix/TileRow/TileCol, i.e. z/y/x
    url: `${GIBS_URL}/${layer.id}/default/${time}/GoogleMapsCompatible_Level${layer.maxLevel}/{z}/{y}/{x}.${layer.format}`,
    maximumLevel: layer.maxLevel,
    tilingScheme: new WebMercatorTilingScheme(),
    credit: "NASA GIBS",
  });
}

/** Yesterday in UTC: today's daily mosaics are still being filled in as satellites pass over. */
export function defaultGibsDate(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
