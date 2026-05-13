"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Tooltip } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
// Using CSS grid via Box instead of Grid2 to avoid extra dependency
import LayersIcon from "@mui/icons-material/Layers";
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
import { useRightDockOffset, useSetRightDockOffset } from "../controls/RightDockContext";

type MiniViewerProps = {
  mainViewer: ViewerType | null;
  createProvider: () => ImageryProvider;
  width: number | string;
  height: number;
  rounded?: boolean;
  selected?: boolean;
};

function MiniViewer({
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

  // Create or update the preview viewer
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mainViewer) return;

    // Create viewer if needed
    if (!miniRef.current || miniRef.current.isDestroyed()) {
      // Route credits to a hidden container so the Ion/Cesium logo doesn't show on previews
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
        // start in whatever mode main viewer currently has
        sceneMode: mainViewer.scene.mode,
      });
  // Disable user interactions on the minimap to keep it as a passive preview
  const ssc = mini.scene.screenSpaceCameraController;
  ssc.enableInputs = false;
      // Lightweight scene tuning
      if (mini.scene.skyAtmosphere) mini.scene.skyAtmosphere.show = false;
      mini.scene.fog.enabled = false;
      if (mini.scene.sun) mini.scene.sun.show = false;
      if (mini.scene.moon) mini.scene.moon.show = false;
      mini.scene.highDynamicRange = false;
      mini.terrainProvider = new EllipsoidTerrainProvider();
      mini.scene.requestRenderMode = true;

      // Set initial imagery provider
      try {
        mini.imageryLayers.removeAll();
        mini.imageryLayers.addImageryProvider(createProvider());
      } catch {
        // ignore
      }

      miniRef.current = mini;
    } else {
      // Update imagery provider on existing mini viewer
      const mini = miniRef.current;
      try {
        const layers = mini!.imageryLayers;
        layers.removeAll();
        layers.addImageryProvider(createProvider());
      } catch {}
    }

    const mini = miniRef.current!;

    // Helper: compute a robust view rectangle in 2D/Columbus by sampling screen corners/center
    const computeSafeViewRectangle = (
      v: ViewerType
    ): Rectangle | undefined => {
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
      let minLat = Number.POSITIVE_INFINITY;
      let maxLat = Number.NEGATIVE_INFINITY;
      let found = false;
      for (const p of pts) {
        const cart = scene.camera.pickEllipsoid(p, ellipsoid);
        if (cart) {
          const c = Cartographic.fromCartesian(cart);
          // Clamp to Mercator max latitude
          const maxLatR = WebMercatorProjection.MaximumLatitude;
          const lat = CesiumMath.clamp(c.latitude, -maxLatR, maxLatR);
          const lon = CesiumMath.negativePiToPi(c.longitude);
          lons.push(lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          found = true;
        }
      }
      if (!found) return undefined;
      // Resolve antimeridian: choose the minimal longitudinal span
      let minLon = Number.POSITIVE_INFINITY;
      let maxLon = Number.NEGATIVE_INFINITY;
      if (lons.length) {
        // Option A: straight span
        const aMin = Math.min(...lons);
        const aMax = Math.max(...lons);
        const aSpan = aMax - aMin;

        // Option B: normalize around first lon to reduce crossings
        const ref = lons[0];
        const twoPi = Math.PI * 2;
        const norm = lons.map((L) => {
          let d = L - ref;
          if (d > Math.PI) d -= twoPi;
          if (d < -Math.PI) d += twoPi;
          return ref + d;
        });
        const bMinN = Math.min(...norm);
        const bMaxN = Math.max(...norm);
        const bSpan = bMaxN - bMinN;

        if (bSpan < aSpan) {
          // Map back to [-pi, pi]
          minLon = CesiumMath.negativePiToPi(bMinN);
          maxLon = CesiumMath.negativePiToPi(bMaxN);
          // Ensure ordering after wrap
          if (minLon > maxLon) {
            const t = minLon;
            minLon = maxLon;
            maxLon = t;
          }
        } else {
          minLon = aMin;
          maxLon = aMax;
        }
      }
      // Expand a tiny bit to avoid zero-area rectangles
      const eps = 1e-6;
      if (maxLon - minLon < eps) {
        minLon -= eps;
        maxLon += eps;
      }
      if (maxLat - minLat < eps) {
        minLat -= eps;
        maxLat += eps;
      }
      return new Rectangle(minLon, minLat, maxLon, maxLat);
    };

    // Sync camera each preRender of the main viewer
    const sync = () => {
      if (mini.isDestroyed()) return;
      const mainCam = mainViewer.camera as any;
      const miniCam = mini.camera as any;
      // Sync mode if changed
      if (mini.scene.mode !== mainViewer.scene.mode) {
        if (mainViewer.scene.mode === SceneMode.SCENE3D)
          mini.scene.morphTo3D(0.0);
        else if (mainViewer.scene.mode === SceneMode.SCENE2D)
          mini.scene.morphTo2D(0.0);
        else if (mainViewer.scene.mode === SceneMode.COLUMBUS_VIEW)
          mini.scene.morphToColumbusView(0.0);
      }
      const mode = mainViewer.scene.mode;
      if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
        const rect = computeSafeViewRectangle(mainViewer);
        if (rect) {
          try {
            miniCam.setView({ destination: rect });
          } catch {}
        } else {
          // Fallback: copy pose (rare)
          miniCam.setView({
            destination: mainCam.position,
            orientation: {
              direction: mainCam.direction,
              up: mainCam.up,
            },
          });
        }
      } else {
        // In 3D, copy pose and FOV
        miniCam.setView({
          destination: mainCam.position,
          orientation: {
            direction: mainCam.direction,
            up: mainCam.up,
          },
        });
        const mainFrustum: any = mainCam.frustum;
        const miniFrustum: any = miniCam.frustum;
        if (
          mainFrustum &&
          miniFrustum &&
          typeof mainFrustum.fov === "number"
        ) {
          miniFrustum.fov = mainFrustum.fov;
        }
      }
      mini.scene.requestRender();
    };

    // Register sync handler once
    if (syncHandlerRef.current) {
      mainViewer.scene.preRender.removeEventListener(syncHandlerRef.current);
      syncHandlerRef.current = null;
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

  // Cleanup viewer on unmount
  useEffect(() => {
    return () => {
      try {
        if (miniRef.current && !miniRef.current.isDestroyed()) {
          miniRef.current.destroy();
        }
      } catch {}
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

export type MapStyle = {
  key: string;
  name: string;
  createProvider: () => ImageryProvider;
};

type MapStyleSwitcherProps = {
  viewer: ViewerType | null;
  styles: MapStyle[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export default function MapStyleSwitcher({
  viewer,
  styles,
  selectedKey,
  onSelect,
  onOpenChange,
}: MapStyleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rightOffset = useRightDockOffset();
  const setRightOffset = useSetRightDockOffset();

  // Update shared right offset when drawer opens/closes
  useEffect(() => {
    setRightOffset(open ? 300 : 0);
    onOpenChange?.(open);
    return () => setRightOffset(0);
  }, [open, setRightOffset]);

  return (
    <>
      {/* Floating layers button (center-right) */}
      <Tooltip title="Layers" placement="left">
        <Box
          sx={{
            position: "fixed",
            right: rightOffset,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: (theme) => (theme as any).zIndex.drawer + 2,
            transition: (theme) =>
              `right ${
                (theme as any).transitions?.duration?.enteringScreen || 225
              }ms ${
                (theme as any).transitions?.easing?.easeOut ||
                "cubic-bezier(0.0, 0, 0.2, 1)"
              }`,
          }}
        >
          <Box
            role="button"
            aria-label={open ? "Close layers" : "Open layers"}
            aria-pressed={open}
            onClick={() => setOpen((v) => !v)}
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: open ? "#4caf50" : "rgba(0,0,0,0.55)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: open ? "#43a047" : "rgba(0,0,0,0.75)" },
              backdropFilter: "blur(2px)",
            }}
          >
            <LayersIcon />
          </Box>
        </Box>
      </Tooltip>

      {/* Right drawer with vertical list of style previews */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        variant="persistent"
        hideBackdrop
        sx={{ "& .MuiDrawer-paper": { width: 300 } }}
      >
        <Box
          sx={{
            p: 2,
            width: "100%",
            boxSizing: "border-box",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Map styles
            </Typography>
            <IconButton
              aria-label="close layers"
              onClick={() => setOpen(false)}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {styles.map((s) => (
            <Box key={s.key} sx={{ mb: 1.5 }}>
              <Box
                onClick={() => {
                  onSelect(s.key);
                  setOpen(false);
                }}
                sx={{
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: 3,
                  overflow: "hidden",
                  // Selection border is drawn by MiniViewer now
                  boxShadow: 0,
                  transition: "box-shadow 120ms ease",
                  width: 260,
                  mx: "auto",
                }}
              >
                <MiniViewer
                  mainViewer={viewer}
                  createProvider={s.createProvider}
                  width={260}
                  height={90}
                  rounded
                  selected={selectedKey === s.key}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    px: 0.75,
                    py: 0.25,
                    bgcolor: "rgba(0,0,0,0.6)",
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="caption" color="#fff">
                    {s.name}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
}
