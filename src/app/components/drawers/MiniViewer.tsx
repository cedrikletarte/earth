import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import {
  EllipsoidTerrainProvider,
  type ImageryProvider,
  type Viewer as ViewerType,
  Viewer,
  WebMercatorProjection,
  SceneMode,
  Rectangle,
  Cartesian2,
  Cartographic,
  Math as CesiumMath,
} from "cesium";

export type MiniViewerProps = {
  mainViewer: ViewerType | null;
  createProvider: () => ImageryProvider;
  width: number | string;
  height: number;
  rounded?: boolean;
  selected?: boolean;
};

export default function MiniViewer({
  mainViewer,
  createProvider,
  width,
  height,
  rounded,
  selected,
}: MiniViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const miniRef = useRef<ViewerType | null>(null);
  const syncHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mainViewer) return;

    if (!miniRef.current || miniRef.current.isDestroyed()) {
      const hiddenCredits = document.createElement("div");
      hiddenCredits.style.display = "none";

      const mini = new Viewer(el, {
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        geocoder: false,
        infoBox: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        homeButton: false,
        fullscreenButton: false,
        selectionIndicator: false,
        mapProjection: new WebMercatorProjection(),
        creditContainer: hiddenCredits,
        sceneMode: mainViewer.scene.mode,
      });

      mini.scene.screenSpaceCameraController.enableInputs = false;
      if (mini.scene.skyAtmosphere) mini.scene.skyAtmosphere.show = false;
      mini.scene.fog.enabled = false;
      if (mini.scene.sun) mini.scene.sun.show = false;
      if (mini.scene.moon) mini.scene.moon.show = false;
      mini.scene.highDynamicRange = false;
      mini.terrainProvider = new EllipsoidTerrainProvider();
      mini.scene.requestRenderMode = true;

      try {
        mini.imageryLayers.removeAll();
        mini.imageryLayers.addImageryProvider(createProvider());
      } catch { /* ignore */ }

      miniRef.current = mini;
    } else {
      try {
        const layers = miniRef.current.imageryLayers;
        layers.removeAll();
        layers.addImageryProvider(createProvider());
      } catch { /* ignore */ }
    }

    const mini = miniRef.current!;

    const computeSafeViewRectangle = (v: ViewerType): Rectangle | undefined => {
      const scene = v.scene;
      const ellipsoid = scene.globe?.ellipsoid;
      if (!ellipsoid) return undefined;
      const canvas = scene.canvas;
      const w = canvas.clientWidth || canvas.width;
      const h = canvas.clientHeight || canvas.height;
      const pts = [
        new Cartesian2(0, 0),
        new Cartesian2(w, 0),
        new Cartesian2(w, h),
        new Cartesian2(0, h),
        new Cartesian2(w * 0.5, h * 0.5),
      ];
      const lons: number[] = [];
      let minLat = Infinity;
      let maxLat = -Infinity;
      let found = false;
      for (const p of pts) {
        const cart = scene.camera.pickEllipsoid(p, ellipsoid);
        if (cart) {
          const c = Cartographic.fromCartesian(cart);
          const maxLatR = WebMercatorProjection.MaximumLatitude;
          const lat = CesiumMath.clamp(c.latitude, -maxLatR, maxLatR);
          lons.push(CesiumMath.negativePiToPi(c.longitude));
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          found = true;
        }
      }
      if (!found) return undefined;

      let minLon: number, maxLon: number;
      const aMin = Math.min(...lons);
      const aMax = Math.max(...lons);
      const ref = lons[0];
      const twoPi = Math.PI * 2;
      const norm = lons.map((L) => {
        let d = L - ref;
        if (d > Math.PI) d -= twoPi;
        if (d < -Math.PI) d += twoPi;
        return ref + d;
      });
      const bMin = Math.min(...norm);
      const bMax = Math.max(...norm);
      if (bMax - bMin < aMax - aMin) {
        minLon = CesiumMath.negativePiToPi(bMin);
        maxLon = CesiumMath.negativePiToPi(bMax);
        if (minLon > maxLon) [minLon, maxLon] = [maxLon, minLon];
      } else {
        minLon = aMin;
        maxLon = aMax;
      }

      const eps = 1e-6;
      return new Rectangle(
        minLon - (maxLon - minLon < eps ? eps : 0),
        minLat - (maxLat - minLat < eps ? eps : 0),
        maxLon + (maxLon - minLon < eps ? eps : 0),
        maxLat + (maxLat - minLat < eps ? eps : 0)
      );
    };

    const sync = () => {
      if (mini.isDestroyed()) return;
      const mainCam = mainViewer.camera as any;
      const miniCam = mini.camera as any;

      if (mini.scene.mode !== mainViewer.scene.mode) {
        if (mainViewer.scene.mode === SceneMode.SCENE3D) mini.scene.morphTo3D(0.0);
        else if (mainViewer.scene.mode === SceneMode.SCENE2D) mini.scene.morphTo2D(0.0);
        else if (mainViewer.scene.mode === SceneMode.COLUMBUS_VIEW) mini.scene.morphToColumbusView(0.0);
      }

      const mode = mainViewer.scene.mode;
      if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
        const rect = computeSafeViewRectangle(mainViewer);
        if (rect) {
          try { miniCam.setView({ destination: rect }); } catch { /* ignore */ }
        } else {
          miniCam.setView({ destination: mainCam.position, orientation: { direction: mainCam.direction, up: mainCam.up } });
        }
      } else {
        miniCam.setView({ destination: mainCam.position, orientation: { direction: mainCam.direction, up: mainCam.up } });
        const mainFrustum: any = mainCam.frustum;
        const miniFrustum: any = miniCam.frustum;
        if (mainFrustum && miniFrustum && typeof mainFrustum.fov === "number") {
          miniFrustum.fov = mainFrustum.fov;
        }
      }
      mini.scene.requestRender();
    };

    if (syncHandlerRef.current) {
      mainViewer.scene.preRender.removeEventListener(syncHandlerRef.current);
    }
    mainViewer.scene.preRender.addEventListener(sync);
    syncHandlerRef.current = sync;

    return () => {
      if (syncHandlerRef.current) {
        mainViewer.scene.preRender.removeEventListener(syncHandlerRef.current);
        syncHandlerRef.current = null;
      }
    };
  }, [mainViewer, createProvider]);

  useEffect(() => {
    return () => {
      try {
        if (miniRef.current && !miniRef.current.isDestroyed()) {
          miniRef.current.destroy();
        }
      } catch { /* ignore */ }
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width,
        height,
        borderRadius: rounded ? 3 : 0,
        overflow: "hidden",
        boxShadow: 3,
        bgcolor: "#000",
        border: selected
          ? "3px solid #90CAF9"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    />
  );
}
