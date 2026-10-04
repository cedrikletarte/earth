import { type ImageryProvider, UrlTemplateImageryProvider, WebMercatorTilingScheme } from "cesium";
import { GIBS_LAYERS, createGibsProvider, type GibsLayer } from "./gibs";

export type MapStyle = {
  key: string;
  name: string;
  group: "Map" | "NASA";
  /** Imagery layers, bottom to top */
  createProviders: () => ImageryProvider[];
};

const tileProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${import.meta.env.VITE_TILESERVER_URL}/styles/${style}/{z}/{x}/{y}.png`,
    maximumLevel: 18,
    tilingScheme: new WebMercatorTilingScheme(),
  });

const tileserverStyle = (key: string, name: string): MapStyle => ({
  key,
  name,
  group: "Map",
  createProviders: () => [tileProvider(key)],
});

// Module-level so their identity never changes: switching the NASA date must not reload these
const TILESERVER_STYLES: MapStyle[] = [
  tileserverStyle("osm-liberty", "OSM Liberty"),
  tileserverStyle("osm-standard", "OSM Standard"),
  tileserverStyle("osm-bright", "OSM Bright"),
  tileserverStyle("klokantech-basic", "Klokantech Basic"),
  tileserverStyle("aws-standard", "AWS Standard"),
  tileserverStyle("aws-hybrid", "AWS Hybrid"),
];

/** NASA GIBS styles for one day; data layers sit on Blue Marble with coastlines on top. */
function nasaStyles(date: string): MapStyle[] {
  const gibs = (layer: GibsLayer) => createGibsProvider(layer, date);
  const dataOverlay = (layer: GibsLayer) => () => [
    gibs(GIBS_LAYERS.blueMarble),
    gibs(layer),
    gibs(GIBS_LAYERS.coastlines),
  ];
  return [
    { key: "nasa-true-color", name: "True Color", group: "NASA", createProviders: () => [gibs(GIBS_LAYERS.trueColor)] },
    { key: "nasa-blue-marble", name: "Blue Marble", group: "NASA", createProviders: () => [gibs(GIBS_LAYERS.blueMarble)] },
    { key: "nasa-black-marble", name: "Night Lights (2016)", group: "NASA", createProviders: () => [gibs(GIBS_LAYERS.blackMarble)] },
    { key: "nasa-sst", name: "Sea Surface Temperature", group: "NASA", createProviders: dataOverlay(GIBS_LAYERS.seaSurfaceTemp) },
    { key: "nasa-precipitation", name: "Precipitation", group: "NASA", createProviders: dataOverlay(GIBS_LAYERS.precipitation) },
  ];
}

export function buildStyles(nasaDate: string): MapStyle[] {
  return [...TILESERVER_STYLES, ...nasaStyles(nasaDate)];
}
