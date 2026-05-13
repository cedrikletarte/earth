"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import {
  type Viewer as ViewerType,
  WebMercatorProjection,
  Cartesian3,
  Math as CesiumMath,
  SceneMode,
} from "cesium";
import { useRightDockOffset } from "./RightDockContext";

type Props = {
  viewer: ViewerType | null;
};

export default function LocateMeButton({ viewer }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rightOffset = useRightDockOffset();
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clampLat = (lat: number) => {
    const maxLatDeg = (WebMercatorProjection.MaximumLatitude * 180) / Math.PI;
    return Math.max(-maxLatDeg, Math.min(maxLatDeg, lat));
  };

  const goToMyLocation = () => {
    if (!viewer) return;
    if (!navigator.geolocation) {
      setErrorMsg("The geolocation is not available in this browser.");
      return;
    }
    if (!(window as any).isSecureContext) {
      // Most browsers require HTTPS (or localhost) for geolocation
      setErrorMsg("Geolocation requires a secure origin (HTTPS).");
      return;
    }
    // If Permissions API is available, surface denied early with guidance
    if ((navigator as any).permissions?.query) {
      try {
        (navigator as any).permissions
          .query({ name: "geolocation" as PermissionName })
          .then((status: PermissionStatus) => {
            if (status.state === "denied") {
              setErrorMsg(
                "Access to location denied in the browser. Please allow access in the site settings and try again."
              );
            }
          })
          .catch(() => {});
      } catch {}
    }
    setLocating(true);
    const moveCamera = (lat: number, lon: number) => {
      const is3D = viewer.scene.mode === SceneMode.SCENE3D;
      try {
        if (is3D) {
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(lon, lat, 8000),
            orientation: {
              heading: 0,
              pitch: CesiumMath.toRadians(-45),
              roll: 0,
            },
            duration: 1.2,
          });
        } else {
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(lon, lat, 10000),
            duration: 1.2,
          });
        }
        viewer.scene.requestRender();
        setTimeout(() => {
          try {
            viewer.camera.setView({
              destination: Cartesian3.fromDegrees(
                lon,
                lat,
                is3D ? 8000 : 10000
              ),
            });
            viewer.scene.requestRender();
          } catch {}
        }, 1400);
      } finally {
        setLocating(false);
      }
    };

    const tryOnce = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    const tryWatch = (opts: PositionOptions, timeoutMs: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        let settled = false;
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            if (settled) return;
            settled = true;
            navigator.geolocation.clearWatch(id);
            resolve(pos);
          },
          (err) => {
            // If permission denied, fail fast
            if (err.code === 1 && !settled) {
              settled = true;
              navigator.geolocation.clearWatch(id);
              reject(err);
            }
          },
          opts
        );
        const t = setTimeout(() => {
          if (settled) return;
          settled = true;
          navigator.geolocation.clearWatch(id);
          reject(new Error("watchPosition timeout"));
        }, timeoutMs);
      });

    (async () => {
      try {
        // First attempt: high accuracy, fresh fix
        const pos = await tryOnce({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
        moveCamera(clampLat(pos.coords.latitude), pos.coords.longitude);
        return;
      } catch (err: any) {
        console.warn("Geolocation (high accuracy) error:", err);
      }

      try {
        // Second attempt: low accuracy, allow cached location (up to 5 minutes)
        const pos2 = await tryOnce({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5 * 60 * 1000,
        });
        moveCamera(clampLat(pos2.coords.latitude), pos2.coords.longitude);
        return;
      } catch (err: any) {
        console.warn("Geolocation (low accuracy) error:", err);
      }

      try {
        // Final attempt: watchPosition for up to 15s (give GPS time to warm up)
        const pos3 = await tryWatch(
          { enableHighAccuracy: true, maximumAge: 0 },
          15000
        );
        moveCamera(clampLat(pos3.coords.latitude), pos3.coords.longitude);
        return;
      } catch (e) {
        setErrorMsg(
          "Geolocation position unavailable. Please enable GPS/Wi-Fi, come back later, and try again."
        );
        setLocating(false);
      }
    })();
  };

  return (
    <>
      <Box
        ref={rootRef}
        sx={{
          position: "fixed",
          right: rightOffset,
          bottom: 76, // stacked above Home button (44 + 8 + 24)
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
        <Tooltip title="My position" placement="left">
          <Box
            role="button"
            aria-label="My position"
            aria-busy={locating}
            onClick={goToMyLocation}
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: locating ? "#4caf50" : "rgba(0,0,0,0.55)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: locating ? "#43a047" : "rgba(0,0,0,0.75)" },
              backdropFilter: "blur(2px)",
            }}
          >
            <MyLocationIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErrorMsg(null)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setErrorMsg(null);
                goToMyLocation();
              }}
            >
              Retry
            </Button>
          }
        >
          {errorMsg}
        </Alert>
      </Snackbar>
    </>
  );
}
