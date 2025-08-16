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
	ProviderViewModel,
		GeoJsonDataSource,
		Color,
		ColorMaterialProperty,
		ConstantProperty,
		PolylineDashMaterialProperty,
} from "cesium";
import SearchDrawer from "./SearchDrawer";
import CityInfoPanel from "./CityInfoPanel";

// Cesium widgets CSS is linked globally in app/layout.tsx from /public/cesium

export default function CesiumViewer() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const viewerRef = useRef<ViewerType | null>(null);
	const [infoOpen, setInfoOpen] = useState(false);
	const [selectedPlaceLabel, setSelectedPlaceLabel] = useState<string | undefined>(undefined);
	const boundaryDsRef = useRef<GeoJsonDataSource | null>(null);
	const osmRef = useRef<{ type?: string; id?: number } | null>(null);
	// Search UI moved to SearchDrawer component

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

		// Create custom imagery provider view models for your different map styles
		const klokantech_basic_style_provider = new ProviderViewModel({
			name: 'Klokantech Basic',
			iconUrl: '/cesium/Widgets/Images/ImageryProviders/mapboxStreets.png',
			tooltip: 'Klokantech Basic map tiles from your server',
			creationFunction: () => {
				return new UrlTemplateImageryProvider({
					url: process.env.NEXT_PUBLIC_IMAGERY_URL_KLOKANTECH_BASIC!,
					maximumLevel: 18
				});
			}
		});

		const osm_bright_style_provider = new ProviderViewModel({
			name: 'OSM Bright',
			iconUrl: '/cesium/Widgets/Images/ImageryProviders/openStreetMap.png',
			tooltip: 'OSM bright tiles from your server',
			creationFunction: () => {
				return new UrlTemplateImageryProvider({
					url: process.env.NEXT_PUBLIC_IMAGERY_URL_OSM_BRIGHT!,
					maximumLevel: 18
				});
			}
		});

		const viewer = new Viewer(containerRef.current, {
			// Enable the base layer picker with custom providers
			baseLayerPicker: true,
			imageryProviderViewModels: [klokantech_basic_style_provider, osm_bright_style_provider],
			selectedImageryProviderViewModel: klokantech_basic_style_provider, // Default selection
			// Remove the timeline at the bottom
			timeline: false,
			// Remove the animation widget (round controls)
			animation: false,
			// Disable built-in geocoder; we'll use our own UI in a Drawer
			geocoder: false,
			skyBox: new SkyBox({
				sources: {
					positiveX: "space/skybox/px.png",
					negativeX: "space/skybox/nx.png",
					positiveY: "space/skybox/ny.png",
					negativeY: "space/skybox/py.png",
					positiveZ: "space/skybox/pz.png",
					negativeZ: "space/skybox/nz.png",
				}
			})
		});

		// No need to manually remove and add imagery layers anymore
		// The BaseLayerPicker will handle this

		viewerRef.current = viewer;

		// Remove the sun
		if (viewer.scene.sun) viewer.scene.sun.show = false;

		// Handle scene mode changes to prevent 2D errors
		viewer.scene.morphComplete.addEventListener(() => {
			const sceneMode = viewer.scene.mode;
			
			if (sceneMode === SceneMode.SCENE2D || sceneMode === SceneMode.COLUMBUS_VIEW) {
				// In 2D mode, remove 3D elements that cause projection errors
				viewer.scene.primitives.removeAll();
				// Use basic ellipsoid terrain in 2D mode
				viewer.terrainProvider = new EllipsoidTerrainProvider();
			} else if (sceneMode === SceneMode.SCENE3D) {
				// In 3D mode, re-add 3D elements
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

			// Fly the camera to San Francisco
			/*
			viewer.camera.flyTo({
				destination: Cartesian3.fromDegrees(-122.4175, 37.655, 400),
				orientation: {
					heading: CesiumMath.toRadians(0.0),
					pitch: CesiumMath.toRadians(-15.0),
				},
			});
			*/	

			// Add Cesium OSM Buildings layer (only in 3D mode initially)
			if (viewer.scene.mode === SceneMode.SCENE3D) {
				const buildings = await createOsmBuildingsAsync();
				viewer.scene.primitives.add(buildings);
			}
		})();

		return () => {
			try {
				viewerRef.current?.destroy();
			} finally {
				viewerRef.current = null;
			}
		};
	}, []);

	// Fly animation when a place is selected
	const flyTo = (lon: number, lat: number) => {
		const viewer = viewerRef.current;
		if (!viewer) return;
		viewer.camera.flyTo({
			destination: Cartesian3.fromDegrees(lon, lat, 10000),
			orientation: {
				heading: 0,
				pitch: CesiumMath.toRadians(-90),
				roll: 0,
			},
			duration: 1.2,
		});
	};

	// Create a red outline for the selected place
	const handleSelectPlace = useCallback(
		async (
			label: string,
			extras?: { geometry?: any | null; osmType?: string; osmId?: number }
		) => {
			setSelectedPlaceLabel(label);
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
							ent.polygon.material = new ColorMaterialProperty(Color.TRANSPARENT);
							ent.polygon.outline = new ConstantProperty(false);

							const time = viewer.clock.currentTime;
							const hProp: any = ent.polygon.hierarchy as any;
							const hierarchy: any = hProp?.getValue ? hProp.getValue(time) : hProp;

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
			} else {
				// Nothing to render
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

			{/* Search drawer */}
				<SearchDrawer
					onSelectLocation={(lon, lat) => {
						flyTo(lon, lat);
					}}
					onSelectPlace={handleSelectPlace}
				/>

				{/* Right info panel */}
				<CityInfoPanel
					open={infoOpen}
					onClose={() => setInfoOpen(false)}
					placeLabel={selectedPlaceLabel}
				/>
		</>
	);
}

