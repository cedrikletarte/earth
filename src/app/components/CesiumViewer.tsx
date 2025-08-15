"use client";

import { useEffect, useRef } from "react";
import {
	Cartesian3,
	createOsmBuildingsAsync,
	Ion,
	Math as CesiumMath,
	Terrain,
	Viewer,
	type Viewer as ViewerType,
} from "cesium";

// Cesium widgets CSS is linked globally in app/layout.tsx from /public/cesium

export default function CesiumViewer() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const viewerRef = useRef<ViewerType | null>(null);

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

		const viewer = new Viewer(containerRef.current, {
			terrain: Terrain.fromWorldTerrain(),
		});
		viewerRef.current = viewer;

		(async () => {
			// Fly the camera to San Francisco
			viewer.camera.flyTo({
				destination: Cartesian3.fromDegrees(-122.4175, 37.655, 400),
				orientation: {
					heading: CesiumMath.toRadians(0.0),
					pitch: CesiumMath.toRadians(-15.0),
				},
			});

			// Add Cesium OSM Buildings layer
			const buildings = await createOsmBuildingsAsync();
			viewer.scene.primitives.add(buildings);
		})();

		return () => {
			try {
				viewerRef.current?.destroy();
			} finally {
				viewerRef.current = null;
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			style={{ width: "100%", height: "100vh", display: "block" }}
			id="cesiumContainer"
		/>
	);
}

