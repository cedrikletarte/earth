import { useCallback, useRef, useState } from "react";
import { Cartesian3, Math as CesiumMath, UrlTemplateImageryProvider, WebMercatorProjection, WebMercatorTilingScheme } from "cesium";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useImageryStyle } from "./hooks/useImageryStyle";
import { useBoundaryOverlay } from "./hooks/useBoundaryOverlay";
import { useAtmosphereControls } from "./atmosphere/useAtmosphereControls";
import TopSearchBar from "./search/TopSearchBar";
import CityInfoPanel from "./CityInfoPanel";
import SettingsDrawer from "./drawers/SettingsDrawer";
import MapStyleDrawer, { type MapStyle } from "./drawers/MapStyleDrawer";
import RightControls from "./controls/RightControls";

const tileProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${import.meta.env.VITE_TILESERVER_URL}/styles/${style}/{z}/{x}/{y}.png`,
    maximumLevel: 18,
    tilingScheme: new WebMercatorTilingScheme(),
  });

const STYLES: MapStyle[] = [
  { key: "osm-liberty",      name: "OSM Liberty",      createProvider: () => tileProvider("osm-liberty") },
  { key: "osm-standard",     name: "OSM Standard",     createProvider: () => tileProvider("osm-standard") },
  { key: "osm-bright",       name: "OSM Bright",       createProvider: () => tileProvider("osm-bright") },
  { key: "klokantech-basic", name: "Klokantech Basic", createProvider: () => tileProvider("klokantech-basic") },
  { key: "aws-standard",     name: "AWS Standard",     createProvider: () => tileProvider("aws-standard") },
  { key: "aws-hybrid",       name: "AWS Hybrid",       createProvider: () => tileProvider("aws-hybrid") },
];

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { viewer, viewerRef } = useCesiumViewer(containerRef);
  const { selectedStyleKey, setSelectedStyleKey } = useImageryStyle(viewer, STYLES);
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

  const flyTo = (lon: number, lat: number) => {
    const v = viewerRef.current;
    if (!v) return;
    const maxLatDeg = (WebMercatorProjection.MaximumLatitude * 180) / Math.PI;
    const safeLat = Math.max(-maxLatDeg, Math.min(maxLatDeg, lat));
    v.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, safeLat, 10000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      duration: 3.5,
    });
  };

  const handleSelectPlace = useCallback(
    async (
      label: string,
      extras?: {
        geometry?: any;
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
          styles={STYLES}
          selectedKey={selectedStyleKey}
          onSelect={setSelectedStyleKey}
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
