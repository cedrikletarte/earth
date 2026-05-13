"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  createOsmBuildingsAsync,
  Ion,
  Math as CesiumMath,
  Viewer,
  type Viewer as ViewerType,
  SkyBox,
  UrlTemplateImageryProvider,
  createWorldTerrainAsync,
  SceneMode,
  EllipsoidTerrainProvider,
  GeoJsonDataSource,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  PolylineDashMaterialProperty,
  Cartographic,
  WebMercatorProjection,
  WebMercatorTilingScheme,
} from "cesium";
import TopSearchBar from "./search/TopSearchBar";
import CityInfoPanel from "./CityInfoPanel";
import SettingsDrawer from "./drawers/SettingsDrawer";
import { useAtmosphereControls } from "./atmosphere/useAtmosphereControls";
import MapStyleDrawer, { type MapStyle } from "./drawers/MapStyleDrawer";
import RightControls from "./controls/RightControls";

// Cesium widgets CSS is linked globally in app/layout.tsx from /public/cesium

const tileProvider = (style: string) =>
  new UrlTemplateImageryProvider({
    url: `${process.env.NEXT_PUBLIC_TILESERVER_URL}/styles/${style}/{z}/{x}/{y}.png`,
    maximumLevel: 18,
    tilingScheme: new WebMercatorTilingScheme(),
  });

export default function CesiumViewer() {
  // Viewer container reference
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Viewer reference
  const viewerRef = useRef<ViewerType | null>(null);
  // Viewer state
  const [viewer, setViewer] = useState<ViewerType | null>(null);
  // Selected style key
  const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(null);
  // Info panel state
  const [infoOpen, setInfoOpen] = useState(false);
  // Selected place label
  const [selectedPlaceLabel, setSelectedPlaceLabel] = useState<string | undefined>(
    undefined
  );
  const [selectedPlaceMeta, setSelectedPlaceMeta] = useState<
    | {
        lon?: number;
        lat?: number;
        wikidataId?: string;
        wikipediaTag?: string;
      }
    | undefined
  >(undefined);
  // Boundary data source reference
  const boundaryDsRef = useRef<GeoJsonDataSource | null>(null);
  // OSM data source reference
  const osmRef = useRef<{ type?: string; id?: number } | null>(null);

  // Initialize atmosphere controls once viewer is ready
  const {
    viewModel: atmosphereViewModel,
    updateParameter: updateAtmosphereParameter,
  } = useAtmosphereControls(viewer);

  // Define available styles
  const styles: MapStyle[] = [
    { key: "osm-liberty",      name: "OSM Liberty",      createProvider: () => tileProvider("osm-liberty") },
    { key: "osm-standard",     name: "OSM Standard",     createProvider: () => tileProvider("osm-standard") },
    { key: "osm-bright",       name: "OSM Bright",       createProvider: () => tileProvider("osm-bright") },
    { key: "klokantech-basic", name: "Klokantech Basic", createProvider: () => tileProvider("klokantech-basic") },
    { key: "aws-standard",     name: "AWS Standard",     createProvider: () => tileProvider("aws-standard") },
    { key: "aws-hybrid",       name: "AWS Hybrid",       createProvider: () => tileProvider("aws-hybrid") },
  ];

  useEffect(() => {
    // Point Cesium to the static assets under /public/cesium
    (window as any).CESIUM_BASE_URL = "/cesium";

    // Cesium Ion token from env (exposed at build-time via NEXT_PUBLIC_ prefix)
    const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    if (!token) {
      console.warn(
        "NEXT_PUBLIC_CESIUM_ION_TOKEN is not set. Add it to your .env file."
      );
    } else {
      Ion.defaultAccessToken = token;
    }

    if (!containerRef.current) return;

    // Create the Cesium viewer
    const viewer = new Viewer(containerRef.current, {
      // Disable the built-in base layer picker; we use our own UI
      baseLayerPicker: false,
      // Disable the built-in scene mode picker; we use our custom SceneModeSwitcher
      sceneModePicker: false,
      // Disable the default home button, we use our custom HomeViewButton
      homeButton: false,
      // Disable the default navigation help button
      navigationHelpButton: false,
      // Remove the timeline at the bottom
      timeline: false,
      // Remove the animation widget (round controls)
      animation: false,
      // Disable built-in geocoder; we'll use our own UI in a Drawer
      geocoder: false,
      // Use the Mercator projection
      mapProjection: new WebMercatorProjection(),
      // Use a custom skybox
      skyBox: new SkyBox({
        sources: {
          positiveX: "space/skybox/px.png",
          negativeX: "space/skybox/nx.png",
          positiveY: "space/skybox/ny.png",
          negativeY: "space/skybox/py.png",
          positiveZ: "space/skybox/pz.png",
          negativeZ: "space/skybox/nz.png",
        },
      }),
      // Start in 3D mode
      sceneMode: SceneMode.SCENE3D,
    });

    // Link the viewer reference to the cesium viewer
    viewerRef.current = viewer;
    setViewer(viewer);

    // Apply initial imagery (default to first style)
    try {
      const first = styles[0];
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(first.createProvider());
      setSelectedStyleKey(first.key);
    } catch (e) {
      console.warn("Failed to set initial imagery provider", e);
    }

    // Remove the sun if it exists
    if (viewer.scene.sun) viewer.scene.sun.show = false;

    // Keep the 2D camera inside the valid vertical extents to avoid showing top/bottom black overflow
    const clampCamera2D = () => {
      const scene = viewer.scene;
      if (scene.mode !== SceneMode.SCENE2D) return;
      const camera = scene.camera as any;
      const frustum: any = camera.frustum;
      if (
        frustum == null ||
        typeof frustum.left !== "number" ||
        typeof frustum.right !== "number" ||
        typeof frustum.top !== "number" ||
        typeof frustum.bottom !== "number"
      ) {
        return;
      }
      const projection = scene.mapProjection;
      // Project the world corners to 2D map coordinates
      const maxCoord = projection.project(
        new Cartographic(CesiumMath.PI, CesiumMath.PI_OVER_TWO)
      );
      const minY = -maxCoord.y - frustum.bottom;
      const maxY = maxCoord.y - frustum.top;
      const pos = camera.position;
      const clampedY = CesiumMath.clamp(pos.y, minY, maxY);
      if (clampedY !== pos.y) camera.position.y = clampedY;
    };

    // Clamp the 2D camera
    viewer.scene.preRender.addEventListener(clampCamera2D);

    // Handle scene mode changes to prevent 2D errors (remove/add terrain and buildings)
    viewer.scene.morphComplete.addEventListener(() => {
      const sceneMode = viewer.scene.mode;
      const globe = viewer.scene.globe;
      const skyAtmosphere = viewer.scene.skyAtmosphere;

      if (
        sceneMode === SceneMode.SCENE2D ||
        sceneMode === SceneMode.COLUMBUS_VIEW
      ) {
        // In 2D mode, remove 3D elements that cause projection errors
        viewer.scene.primitives.removeAll();
        // Use basic ellipsoid terrain in 2D mode
        viewer.terrainProvider = new EllipsoidTerrainProvider();

        // Disable atmosphere effects in 2D mode
        globe.enableLighting = false;
        globe.showGroundAtmosphere = false;
        if (skyAtmosphere) {
          skyAtmosphere.show = false;
        }
        viewer.scene.fog.enabled = false;
        viewer.scene.highDynamicRange = false;
      } else if (sceneMode === SceneMode.SCENE3D) {
        // In 3D mode, re-add 3D elements and restore atmosphere effects
        globe.enableLighting = true;
        globe.showGroundAtmosphere = true;
        globe.atmosphereLightIntensity = 20.0;
        globe.dynamicAtmosphereLighting = true;
        globe.dynamicAtmosphereLightingFromSun = true;

        if (skyAtmosphere) {
          skyAtmosphere.show = true;
        }
        viewer.scene.fog.enabled = true;
        viewer.scene.highDynamicRange = true;

        (async () => {
          try {
            // Re-add terrain
            const terrainProvider = await createWorldTerrainAsync();
            viewer.terrainProvider = terrainProvider;

            // Re-add buildings
            const buildings = await createOsmBuildingsAsync();
            viewer.scene.primitives.add(buildings);
          } catch (error) {
            console.warn("Could not restore 3D elements:", error);
          }
        })();
      }
    });

    (async () => {
      // Set up terrain provider to prevent floating buildings (only in 3D mode)
      if (viewer.scene.mode === SceneMode.SCENE3D) {
        try {
          const terrainProvider = await createWorldTerrainAsync();
          viewer.terrainProvider = terrainProvider;
        } catch (error) {
          console.warn("Could not load terrain provider:", error);
        }
      }

      // Add Cesium OSM Buildings layer (only in 3D mode initially)
      if (viewer.scene.mode === SceneMode.SCENE3D) {
        const buildings = await createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildings);
      }
    })();

    return () => {
      try {
        // Remove clamp handler
        if (viewerRef.current) {
          viewerRef.current.scene.preRender.removeEventListener(clampCamera2D);
        }
        viewerRef.current?.destroy();
      } finally {
        viewerRef.current = null;
        setViewer(null);
      }
    };
  }, []);

  // When the selected style changes, update imagery
  useEffect(() => {
    if (!viewer || !selectedStyleKey) return;
    const s = styles.find((st) => st.key === selectedStyleKey);
    if (!s) return;
    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(s.createProvider());
      viewer.scene.requestRender();
    } catch (e) {
      console.warn("Failed to update imagery provider", e);
    }
  }, [viewer, selectedStyleKey]);

  // Fly animation when a place is selected
  const flyTo = (lon: number, lat: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    // Clamp latitude to WebMercator max to avoid exposing vertical overflow in 2D
    const maxLatDeg = (WebMercatorProjection.MaximumLatitude * 180) / Math.PI;
    const safeLat = Math.max(-maxLatDeg, Math.min(maxLatDeg, lat));
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, safeLat, 10000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
      duration: 3.5,
    });
  };

  // Create a red outline for the selected place
  const handleSelectPlace = useCallback(
    async (
      label: string,
      extras?: {
        geometry?: any | null;
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

      const viewer = viewerRef.current;
      if (!viewer) return;

      // Clean previous boundary datasource
      if (boundaryDsRef.current) {
        viewer.dataSources.remove(boundaryDsRef.current, true);
        boundaryDsRef.current = null;
      }

      const geometry = extras?.geometry;
      const osmType = extras?.osmType;
      const osmId = extras?.osmId;
      osmRef.current = osmType && osmId ? { type: osmType, id: osmId } : null;

      const loadAndStyle = async (geojson: any) => {
        try {
          const ds = await GeoJsonDataSource.load(
            { type: "Feature", geometry: geojson, properties: { name: label } },
            { clampToGround: true }
          );
          boundaryDsRef.current = ds;
          viewer.dataSources.add(ds);
          ds.entities.values.forEach((ent) => {
            if (ent.polygon) {
              // No fill, dashed red outline built as polylines
              ent.polygon.material = new ColorMaterialProperty(
                Color.TRANSPARENT
              );
              ent.polygon.outline = new ConstantProperty(false);

              const time = viewer.clock.currentTime;
              const hProp: any = ent.polygon.hierarchy as any;
              const hierarchy: any = hProp?.getValue
                ? hProp.getValue(time)
                : hProp;

              const addRing = (positions: any[]) => {
                if (!positions || positions.length < 2) return;
                const isClosed =
                  positions[0] === positions[positions.length - 1];
                const ring = isClosed
                  ? positions.slice()
                  : [...positions, positions[0]];
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
      };

      if (geometry) {
        loadAndStyle(geometry);
      } else if (osmType && osmId) {
        try {
          const base = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL;
          const url = `${base}/details?osmtype=${osmType[0].toUpperCase()}&osmid=${osmId}&format=json&polygon_geojson=1`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const geom = json?.geometry ?? json?.geojson;
            if (geom) loadAndStyle(geom);
          }
        } catch (e) {
          console.warn("Failed to fetch boundary via details API:", e);
        }
      }
    },
  [setInfoOpen, setSelectedPlaceLabel]
  );

  return (
    <>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100vh", display: "block" }}
        id="cesiumContainer"
      />
      {/* Right-side controls provider and controls */}
      <RightControls viewer={viewer}>
        {/* Custom map style switcher inside provider to share offset */}
        <MapStyleDrawer
          viewer={viewer}
          styles={styles}
          selectedKey={selectedStyleKey}
          onSelect={setSelectedStyleKey}
          onOpenChange={(open) => {
            if (open) setInfoOpen(false);
          }}
        />
      </RightControls>
      {/* Top Search Bar */}
      <TopSearchBar
        onSelectLocation={(lon: number, lat: number) => {
          flyTo(lon, lat);
        }}
        onSelectPlace={handleSelectPlace}
      />
      {/* Settings Drawer */}
      <SettingsDrawer
        viewModel={atmosphereViewModel}
        onUpdateParameter={updateAtmosphereParameter}
        viewer={viewer}
      />{" "}
      {/* Right info panel */}
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
