// NASA EONET (Earth Observatory Natural Event Tracker) v3: free, keyless, CORS-enabled.
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3";

export type EonetGeometry = {
  date: string;
  type: "Point" | "Polygon";
  /** [lon, lat] for points, GeoJSON rings for polygons */
  coordinates: [number, number] | [number, number][][];
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
};

export type EonetEvent = {
  id: string;
  title: string;
  description: string | null;
  closed: string | null;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  /** Observations, oldest first (a storm's track, a fire's growth…) */
  geometry: EonetGeometry[];
};

/** EONET's 13 categories, with the marker color used on the globe. */
export const EONET_CATEGORIES: Record<string, { title: string; color: string }> = {
  wildfires: { title: "Wildfires", color: "#ff5722" },
  severeStorms: { title: "Severe Storms", color: "#7e57c2" },
  volcanoes: { title: "Volcanoes", color: "#d32f2f" },
  seaLakeIce: { title: "Sea and Lake Ice", color: "#4fc3f7" },
  earthquakes: { title: "Earthquakes", color: "#8d6e63" },
  floods: { title: "Floods", color: "#1e88e5" },
  drought: { title: "Drought", color: "#c0a060" },
  dustHaze: { title: "Dust and Haze", color: "#bcaaa4" },
  landslides: { title: "Landslides", color: "#6d4c41" },
  manmade: { title: "Manmade", color: "#9e9e9e" },
  snow: { title: "Snow", color: "#eceff1" },
  tempExtremes: { title: "Temperature Extremes", color: "#ffb300" },
  waterColor: { title: "Water Color", color: "#26a69a" },
};

const FALLBACK_COLOR = "#ffffff";

export function categoryColor(categoryId: string): string {
  return EONET_CATEGORIES[categoryId]?.color ?? FALLBACK_COLOR;
}

/**
 * Open events observed within the last `days` days.
 *
 * The window matters: `status=open` alone returns ~7000 events (5 MB), almost all small US
 * wildfires that were never closed upstream. Long-running events such as volcanoes only
 * show up with a window of about a year, since their observations are sparse.
 */
export async function fetchEonetEvents(days: number, signal: AbortSignal): Promise<EonetEvent[]> {
  const res = await fetch(`${EONET_URL}/events?status=open&days=${days}`, { signal });
  if (!res.ok) throw new Error(`EONET HTTP ${res.status}`);
  const json: { events: EonetEvent[] } = await res.json();
  return json.events;
}

/** Latest observation as [lon, lat]; polygons are reduced to the mean of their outer ring. */
export function latestPosition(event: EonetEvent): [number, number] | null {
  const g = event.geometry[event.geometry.length - 1];
  if (!g) return null;
  if (g.type === "Point") return g.coordinates as [number, number];
  const ring = (g.coordinates as [number, number][][])[0];
  if (!ring?.length) return null;
  const sum = ring.reduce(([x, y], [lon, lat]) => [x + lon, y + lat], [0, 0]);
  return [sum[0] / ring.length, sum[1] / ring.length];
}

/** Track of point observations, oldest first (e.g. a storm's path). */
export function pointTrack(event: EonetEvent): [number, number][] {
  return event.geometry
    .filter((g) => g.type === "Point")
    .map((g) => g.coordinates as [number, number]);
}
