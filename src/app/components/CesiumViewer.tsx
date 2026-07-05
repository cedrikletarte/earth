import { useCallback, useRef, useState } from "react";
import { Cartesian3, Math as CesiumMath, Rectangle, UrlTemplateImageryProvider, WebMercatorProjection, WebMercatorTilingScheme } from "cesium";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useImageryStyle } from "./hooks/useImageryStyle";
import { useBoundaryOverlay } from "./hooks/useBoundaryOverlay";
import { useBuildingsTileset } from "./hooks/useBuildingsTileset";
import { useCameraIntroRotation } from "./hooks/useCameraIntroRotation";
import { useAtmosphereControls } from "./settings/atmosphere/useAtmosphereControls";
import { useGlobeControls } from "./settings/globe/useGlobeControls";
import { useRenderingControls } from "./settings/rendering/useRenderingControls";
import { useCameraControls } from "./settings/camera/useCameraControls";
import { useDebugControls } from "./settings/debug/useDebugControls";
import TopSearchBar from "./search/TopSearchBar";
import CityInfoPanel from "./CityInfoPanel";
import SettingsDrawer from "./settings/SettingsDrawer";
import MapStyleDrawer, { type MapStyle } from "./drawers/MapStyleDrawer";
import RightControls from "./controls/RightControls";

// Basemap source toggle: "pmtiles" (default) reads the baked archives below;
// "tileserver" talks to TileServer-GL directly instead (full planet coverage
// at native zoom, no bake step needed, but rendered live on every request —
// see README "Baking the basemap (PMTiles)" for the tradeoff). This is a
// VITE_* var, so it's fixed at build time, not switchable at runtime.
const BASEMAP_SOURCE = import.meta.env.VITE_BASEMAP_SOURCE ?? "pmtiles";

// Baked by scripts/bake-pmtiles.sh into two zoom tiers per style, served
// statically by pmtiles-serve — a low-zoom planet archive for global
// coverage, and a deep Montreal-only archive for street-level detail,
// stacked as two imagery layers instead of baking the whole planet at z14.
const PMTILES_URL = import.meta.env.VITE_PMTILES_URL;
const PLANET_MAXZOOM = 8;
// The openmaptiles vector source tops out at z14 — anything deeper is
// server-side overzoom (re-rendering the z14 parent tile at bake time),
// which doesn't add any real detail, so we don't bother baking it.
const MONTREAL_MAXZOOM = 14;
const MONTREAL_RECTANGLE = Rectangle.fromDegrees(-74.05, 45.35, -73.35, 45.75);

const planetProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${PMTILES_URL}/${style}-planet/{z}/{x}/{y}.png`,
    maximumLevel: PLANET_MAXZOOM,
    tilingScheme: new WebMercatorTilingScheme(),
  });

const montrealProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${PMTILES_URL}/${style}-montreal/{z}/{x}/{y}.png`,
    // No minimumLevel here on purpose: Cesium's minimumLevel doesn't hide a
    // layer below that level, it clamps the request UP to it and stretches
    // that single tile over however much area is actually needed — which is
    // exactly the "detail stuck at the zoomed-in level" artifact seen when
    // zooming out. Leaving it unset lets Cesium request the (nonexistent,
    // z9-14 only) lower-zoom tiles from this archive, get a 204, and fall
    // through to the planet layer underneath instead.
    maximumLevel: MONTREAL_MAXZOOM,
    rectangle: MONTREAL_RECTANGLE,
    tilingScheme: new WebMercatorTilingScheme(),
  });

// Live rasterizer, full planet coverage at the vector source's native zoom —
// the pre-PMTiles behavior, used when VITE_BASEMAP_SOURCE=tileserver.
const tileserverProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${import.meta.env.VITE_TILESERVER_URL}/styles/${style}/{z}/{x}/{y}.png`,
    maximumLevel: MONTREAL_MAXZOOM,
    tilingScheme: new WebMercatorTilingScheme(),
  });

const previewProvider = (style: string) =>
  BASEMAP_SOURCE === "tileserver" ? tileserverProvider(style) : planetProvider(style);

const mapProviders = (style: string) =>
  BASEMAP_SOURCE === "tileserver"
    ? [tileserverProvider(style)]
    : [planetProvider(style), montrealProvider(style)];

const STYLES: MapStyle[] = [
  { key: "osm-liberty",      name: "OSM Liberty",      createProvider: () => previewProvider("osm-liberty"),      createProviders: () => mapProviders("osm-liberty") },
  { key: "osm-standard",     name: "OSM Standard",     createProvider: () => previewProvider("osm-standard"),     createProviders: () => mapProviders("osm-standard") },
  { key: "osm-bright",       name: "OSM Bright",       createProvider: () => previewProvider("osm-bright"),       createProviders: () => mapProviders("osm-bright") },
  { key: "klokantech-basic", name: "Klokantech Basic", createProvider: () => previewProvider("klokantech-basic"), createProviders: () => mapProviders("klokantech-basic") },
];

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { viewer, viewerRef } = useCesiumViewer(containerRef);
  const { selectedStyleKey, setSelectedStyleKey } = useImageryStyle(viewer, STYLES);
  const { drawBoundary } = useBoundaryOverlay(viewerRef);
  const buildingsTileset = useBuildingsTileset(viewer);
  const stopIntroRotation = useCameraIntroRotation(viewer);
  const { viewModel: atmosphereViewModel, updateParameter: updateAtmosphereParameter } = useAtmosphereControls(viewer);
  const { viewModel: globeViewModel, updateParameter: updateGlobeParameter } = useGlobeControls(viewer);
  const { viewModel: renderingViewModel, updateParameter: updateRenderingParameter } = useRenderingControls(viewer);
  const { viewModel: cameraViewModel, updateParameter: updateCameraParameter } = useCameraControls(viewer);
  const { viewModel: debugViewModel, updateParameter: updateDebugParameter } = useDebugControls(viewer, buildingsTileset);

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
    stopIntroRotation();
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
        atmosphere={{ viewModel: atmosphereViewModel, onUpdateParameter: updateAtmosphereParameter }}
        globe={{ viewModel: globeViewModel, onUpdateParameter: updateGlobeParameter }}
        rendering={{ viewModel: renderingViewModel, onUpdateParameter: updateRenderingParameter }}
        camera={{ viewModel: cameraViewModel, onUpdateParameter: updateCameraParameter }}
        debug={{ viewModel: debugViewModel, onUpdateParameter: updateDebugParameter }}
        hasBuildingsTileset={buildingsTileset !== null}
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
