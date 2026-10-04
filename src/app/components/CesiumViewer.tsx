import { useCallback, useMemo, useRef, useState } from "react";
import { Cartesian3, Math as CesiumMath, Rectangle } from "cesium";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useImageryStyle } from "./hooks/useImageryStyle";
import { useBoundaryOverlay } from "./hooks/useBoundaryOverlay";
import { useAtmosphereControls } from "./atmosphere/useAtmosphereControls";
import TopSearchBar from "./search/TopSearchBar";
import CityInfoPanel from "./CityInfoPanel";
import SettingsDrawer from "./drawers/SettingsDrawer";
import MapStyleDrawer from "./drawers/MapStyleDrawer";
import { buildStyles } from "./imagery/styles";
import { defaultGibsDate } from "./imagery/gibs";
import RightControls from "./controls/RightControls";
import type { PlaceGeometry } from "./search/nominatim";
import { clampToMercatorLat, type BBox } from "./geo";

// Places smaller than this (degrees) are framed from a fixed altitude instead of their bounds
const MIN_FRAMED_SPAN_DEG = 0.1;

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { viewer, viewerRef } = useCesiumViewer(containerRef);
  const [nasaDate, setNasaDate] = useState(defaultGibsDate);
  const styles = useMemo(() => buildStyles(nasaDate), [nasaDate]);
  const { selectedStyleKey, setSelectedStyleKey } = useImageryStyle(viewer, styles);
  const { drawBoundary } = useBoundaryOverlay(viewerRef);
  const { viewModel: atmosphereViewModel, updateParameter: updateAtmosphereParameter } = useAtmosphereControls(viewer);

  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedPlaceLabel, setSelectedPlaceLabel] = useState<string | undefined>(undefined);
  const [selectedPlaceMeta, setSelectedPlaceMeta] = useState<{
    lon?: number;
    lat?: number;
    wikidataId?: string;
    wikipediaTag?: string;
  } | undefined>(undefined);

  const flyTo = (lon: number, lat: number, bbox?: BBox) => {
    const v = viewerRef.current;
    if (!v) return;
    // Frame large places (regions, countries) by their bounds, small ones from 10 km up
    const framed =
      bbox && Math.max(bbox.north - bbox.south, Math.abs(bbox.east - bbox.west)) >= MIN_FRAMED_SPAN_DEG;
    v.camera.flyTo({
      destination: framed
        ? Rectangle.fromDegrees(bbox.west, clampToMercatorLat(bbox.south), bbox.east, clampToMercatorLat(bbox.north))
        : Cartesian3.fromDegrees(lon, clampToMercatorLat(lat), 10000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      duration: 3.5,
    });
  };

  const handleSelectPlace = useCallback(
    async (
      label: string,
      extras?: {
        geometry?: PlaceGeometry;
        osmType?: string;
        osmId?: number;
        lon?: number;
        lat?: number;
        wikidataId?: string;
        wikipediaTag?: string;
      }
    ) => {
      setSelectedPlaceLabel(label);
      setSelectedPlaceMeta({
        lon: extras?.lon,
        lat: extras?.lat,
        wikidataId: extras?.wikidataId,
        wikipediaTag: extras?.wikipediaTag,
      });
      setInfoOpen(true);
      drawBoundary(label, extras?.geometry, extras?.osmType, extras?.osmId);
    },
    [drawBoundary]
  );

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100vh", display: "block" }}
        id="cesiumContainer"
      />
      <RightControls viewer={viewer}>
        <MapStyleDrawer
          viewer={viewer}
          styles={styles}
          selectedKey={selectedStyleKey}
          onSelect={setSelectedStyleKey}
          nasaDate={nasaDate}
          onNasaDateChange={setNasaDate}
          onOpenChange={(open) => { if (open) setInfoOpen(false); }}
        />
      </RightControls>
      <TopSearchBar
        onSelectLocation={flyTo}
        onSelectPlace={handleSelectPlace}
      />
      <SettingsDrawer
        viewModel={atmosphereViewModel}
        onUpdateParameter={updateAtmosphereParameter}
        viewer={viewer}
      />
      <CityInfoPanel
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        placeLabel={selectedPlaceLabel}
        lon={selectedPlaceMeta?.lon}
        lat={selectedPlaceMeta?.lat}
        wikidataId={selectedPlaceMeta?.wikidataId}
        wikipediaTag={selectedPlaceMeta?.wikipediaTag}
      />
    </>
  );
}
