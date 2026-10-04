/** GeoJSON geometry as returned by Nominatim with `polygon_geojson=1`. */
export type PlaceGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: PlaceGeometry[];
};

/** One item of Nominatim's `/search?format=json` response (only the fields we read). */
export type NominatimSearchItem = {
  display_name: string;
  lon: string;
  lat: string;
  osm_type?: string;
  osm_id?: number;
  geojson?: PlaceGeometry;
  extratags?: Record<string, string> | null;
};

/** Nominatim's `/details?format=json&polygon_geojson=1` response (only the fields we read). */
export type NominatimDetails = {
  geometry?: PlaceGeometry;
  geojson?: PlaceGeometry;
};
