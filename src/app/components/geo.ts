import { WebMercatorProjection } from "cesium";

const MAX_MERCATOR_LAT_DEG = (WebMercatorProjection.MaximumLatitude * 180) / Math.PI;

/** Clamp a latitude (degrees) to the Web Mercator range, beyond which 2D views break. */
export function clampToMercatorLat(latDeg: number): number {
  return Math.max(-MAX_MERCATOR_LAT_DEG, Math.min(MAX_MERCATOR_LAT_DEG, latDeg));
}

/** Geographic bounds in degrees. */
export type BBox = { west: number; south: number; east: number; north: number };
