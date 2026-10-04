import { useEffect, useEffectEvent } from "react";
import {
  Cartesian3,
  Color,
  CustomDataSource,
  NearFarScalar,
  type Entity,
  type Viewer as ViewerType,
} from "cesium";
import { categoryColor, latestPosition, pointTrack, type EonetEvent } from "./eonet";

// Lifted slightly so markers aren't half-hidden by the globe surface
const MARKER_HEIGHT_M = 1000;

/** Marker size grows with the event's magnitude (acres, kts, NM²…), on a log scale. */
function markerSize(event: EonetEvent): number {
  const value = event.geometry[event.geometry.length - 1]?.magnitudeValue;
  if (!value || value <= 0) return 10;
  return 8 + Math.min(Math.max(Math.log10(value), 0), 5) * 2;
}

/**
 * Shows EONET events as clustered markers (plus tracks for multi-observation events)
 * and reports clicks on them through `onSelect`.
 */
export function useEonetLayer(
  viewer: ViewerType | null,
  events: EonetEvent[],
  onSelect: (event: EonetEvent) => void
) {
  const handleSelect = useEffectEvent(onSelect);

  useEffect(() => {
    if (!viewer) return;
    const dataSource = new CustomDataSource("eonet");
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = 25;
    dataSource.clustering.minimumClusterSize = 3;

    const byEntity = new Map<Entity, EonetEvent>();
    for (const event of events) {
      const position = latestPosition(event);
      if (!position) continue;
      const color = Color.fromCssColorString(categoryColor(event.categories[0]?.id ?? ""));

      const marker = dataSource.entities.add({
        id: `eonet-${event.id}`,
        name: event.title,
        position: Cartesian3.fromDegrees(position[0], position[1], MARKER_HEIGHT_M),
        point: {
          pixelSize: markerSize(event),
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 1.5,
          scaleByDistance: new NearFarScalar(1.5e5, 1.4, 2.0e7, 0.7),
        },
      });
      byEntity.set(marker, event);

      const track = pointTrack(event);
      if (track.length > 1) {
        const trackEntity = dataSource.entities.add({
          polyline: {
            positions: Cartesian3.fromDegreesArray(track.flat()),
            width: 2,
            material: color.withAlpha(0.7),
          },
        });
        byEntity.set(trackEntity, event);
      }
    }

    viewer.dataSources.add(dataSource);
    const removeListener = viewer.selectedEntityChanged.addEventListener((entity?: Entity) => {
      const event = entity && byEntity.get(entity);
      if (!event) return;
      handleSelect(event);
      // Deselect right away so clicking the same marker again fires another change
      viewer.selectedEntity = undefined;
    });

    return () => {
      removeListener();
      if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true);
    };
  }, [viewer, events]);
}
