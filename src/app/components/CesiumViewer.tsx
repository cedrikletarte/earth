import { useCallback, useMemo, useRef, useState } from "react";
import { Cartesian3, Math as CesiumMath, Rectangle, SceneMode } from "cesium";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useImageryStyle } from "./hooks/useImageryStyle";
import { useBoundaryOverlay } from "./hooks/useBoundaryOverlay";
import { useNightLights } from "./hooks/useNightLights";
import { useSceneMode } from "./hooks/useSceneMode";
import { useAtmosphereControls } from "./atmosphere/useAtmosphereControls";
import TopSearchBar from "./search/TopSearchBar";
import CityInfoPanel from "./CityInfoPanel";
import SettingsDrawer from "./drawers/SettingsDrawer";
import MapStyleDrawer from "./drawers/MapStyleDrawer";
import { buildStyles } from "./imagery/styles";
import { defaultGibsDate } from "./imagery/gibs";
import RightControls from "./controls/RightControls";
import type { PlaceGeometry } from "./search/nominatim";
import type { EonetEvent } from "./events/eonet";
import { useEonetEvents } from "./events/useEonetEvents";
import { useEonetLayer } from "./events/useEonetLayer";
import EventsControls from "./events/EventsControls";
import EventInfoPanel from "./events/EventInfoPanel";
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

  const [nightLightsEnabled, setNightLightsEnabled] = useState(true);
  const sceneMode = useSceneMode(viewer);
  // Day/night blending needs the lit 3D globe (see useNightLights)
  const nightLightsAvailable = sceneMode === SceneMode.SCENE3D && !!atmosphereViewModel?.enableLighting;
  useNightLights(viewer, nightLightsEnabled && nightLightsAvailable);

  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedPlaceLabel, setSelectedPlaceLabel] = useState<string | undefined>(undefined);
  const [selectedPlaceMeta, setSelectedPlaceMeta] = useState<{
    lon?: number;
    lat?: number;
    wikidataId?: string;
    wikipediaTag?: string;
  } | undefined>(undefined);

  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [eventDays, setEventDays] = useState(30);
  const [hiddenEventCategories, setHiddenEventCategories] = useState<Set<string>>(() => new Set());
  const [selectedEvent, setSelectedEvent] = useState<EonetEvent | null>(null);
  const { events, loading: eventsLoading, error: eventsError } = useEonetEvents(eventsEnabled, eventDays);
  const visibleEvents = useMemo(
    () => (eventsEnabled ? events.filter((e) => !hiddenEventCategories.has(e.categories[0]?.id ?? "")) : []),
    [eventsEnabled, events, hiddenEventCategories]
  );
  useEonetLayer(viewer, visibleEvents, (event) => {
    setInfoOpen(false);
    setSelectedEvent(event);
  });
  const toggleEventCategory = (id: string) =>
    setHiddenEventCategories((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

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
      setSelectedEvent(null);
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
          nightLights={nightLightsEnabled}
          onNightLightsChange={setNightLightsEnabled}
          nightLightsAvailable={nightLightsAvailable}
          onOpenChange={(open) => {
            if (!open) return;
            setInfoOpen(false);
            setSelectedEvent(null);
          }}
        >
          <EventsControls
            enabled={eventsEnabled}
            onEnabledChange={setEventsEnabled}
            days={eventDays}
            onDaysChange={setEventDays}
            events={events}
            loading={eventsLoading}
            error={eventsError}
            hiddenCategories={hiddenEventCategories}
            onToggleCategory={toggleEventCategory}
          />
        </MapStyleDrawer>
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
      <EventInfoPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
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
