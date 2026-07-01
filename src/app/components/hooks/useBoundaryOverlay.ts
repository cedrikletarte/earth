import { useRef, useCallback } from "react";
import {
  type Viewer as ViewerType,
  GeoJsonDataSource,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  PolylineDashMaterialProperty,
} from "cesium";

export function useBoundaryOverlay(
  viewerRef: React.RefObject<ViewerType | null>
) {
  const boundaryDsRef = useRef<GeoJsonDataSource | null>(null);

  const applyStyle = useCallback(
    async (label: string, geojson: any) => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      try {
        const ds = await GeoJsonDataSource.load(
          { type: "Feature", geometry: geojson, properties: { name: label } },
          { clampToGround: true }
        );
        boundaryDsRef.current = ds;
        viewer.dataSources.add(ds);

        ds.entities.values.forEach((ent) => {
          if (ent.polygon) {
            ent.polygon.material = new ColorMaterialProperty(Color.TRANSPARENT);
            ent.polygon.outline = new ConstantProperty(false);

            const hProp: any = ent.polygon.hierarchy;
            const hierarchy: any = hProp?.getValue
              ? hProp.getValue(viewer.clock.currentTime)
              : hProp;

            const addRing = (positions: any[]) => {
              if (!positions || positions.length < 2) return;
              const isClosed = positions[0] === positions[positions.length - 1];
              const ring = isClosed ? positions.slice() : [...positions, positions[0]];
              ds.entities.add({
                polyline: {
                  positions: ring,
                  width: new ConstantProperty(2),
                  clampToGround: new ConstantProperty(true),
                  material: new PolylineDashMaterialProperty({
                    color: Color.RED,
                    dashLength: 16,
                    gapColor: Color.TRANSPARENT,
                  }),
                },
              } as any);
            };

            const walk = (ph: any) => {
              if (!ph) return;
              addRing(ph.positions);
              if (Array.isArray(ph.holes)) ph.holes.forEach(walk);
            };
            walk(hierarchy);
          }

          if (ent.polyline) {
            ent.polyline.material = new PolylineDashMaterialProperty({
              color: Color.RED,
              dashLength: 16,
              gapColor: Color.TRANSPARENT,
            });
            ent.polyline.width = new ConstantProperty(2);
            ent.polyline.clampToGround = new ConstantProperty(true);
          }
        });
      } catch (e) {
        console.warn("Failed to load boundary GeoJSON:", e);
      }
    },
    [viewerRef]
  );

  const drawBoundary = useCallback(
    async (
      label: string,
      geometry?: any,
      osmType?: string,
      osmId?: number
    ) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      if (boundaryDsRef.current) {
        viewer.dataSources.remove(boundaryDsRef.current, true);
        boundaryDsRef.current = null;
      }

      if (geometry) {
        await applyStyle(label, geometry);
      } else if (osmType && osmId) {
        try {
          const base = import.meta.env.VITE_NOMINATIM_BASE_URL;
          const url = `${base}/details?osmtype=${osmType[0].toUpperCase()}&osmid=${osmId}&format=json&polygon_geojson=1`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const geom = json?.geometry ?? json?.geojson;
            if (geom) await applyStyle(label, geom);
          }
        } catch (e) {
          console.warn("Failed to fetch boundary:", e);
        }
      }
    },
    [viewerRef, applyStyle]
  );

  return { drawBoundary };
}
