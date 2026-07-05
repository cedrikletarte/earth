import { useCallback, useEffect, useRef } from "react";
import { Cartesian3, Math as CesiumMath, SceneMode, type Viewer as ViewerType } from "cesium";

const START_LONGITUDE = -73.6;
const START_LATITUDE = 10;
const START_HEIGHT_METERS = 20_000_000;

const ROTATION_PERIOD_SECONDS = 60; // one full revolution at cruising speed
const EASE_IN_SECONDS = 3;
const EASE_OUT_SECONDS = 1.5;

type Phase = "easeIn" | "cruise" | "easeOut" | "stopped";

// A slow, cinematic spin of the globe that plays once on load and yields to
// the user the moment they touch the canvas. Rotating the camera around
// Cartesian3.UNIT_Z (Earth's polar axis) is the standard Cesium idiom for a
// "spinning globe" shot — it orbits the camera around the planet rather than
// spinning the globe in place.
export function useCameraIntroRotation(viewer: ViewerType | null) {
  // Lets callers (e.g. a search flyTo) cut the intro short when they drive
  // the camera themselves, so the two animations don't fight each other.
  const beginEaseOutRef = useRef<() => void>(() => {});
  const stopIntro = useCallback(() => beginEaseOutRef.current(), []);

  useEffect(() => {
    if (!viewer) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const scene = viewer.scene;
    const camera = scene.camera;

    // Frame the whole globe from space before spinning it, instead of
    // inheriting Cesium's default (zoomed on North America) starting view.
    camera.setView({
      destination: Cartesian3.fromDegrees(START_LONGITUDE, START_LATITUDE, START_HEIGHT_METERS),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
    });

    const cruiseSpeed = CesiumMath.TWO_PI / ROTATION_PERIOD_SECONDS; // radians/sec

    let phase: Phase = "easeIn";
    let phaseStart = performance.now();
    let lastTime = phaseStart;
    let currentSpeed = 0;
    let easeOutStartSpeed = 0;

    const stop = () => {
      scene.preRender.removeEventListener(tick);
      canvas.removeEventListener("pointerdown", onInteract);
      canvas.removeEventListener("wheel", onInteract);
    };

    const beginEaseOut = () => {
      if (phase === "easeOut" || phase === "stopped") return;
      easeOutStartSpeed = currentSpeed;
      phase = "easeOut";
      phaseStart = performance.now();
    };

    const onInteract = () => beginEaseOut();
    beginEaseOutRef.current = beginEaseOut;

    function tick() {
      if (scene.mode !== SceneMode.SCENE3D) {
        phase = "stopped";
        stop();
        return;
      }

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (phase === "easeIn") {
        const t = Math.min((now - phaseStart) / 1000 / EASE_IN_SECONDS, 1);
        currentSpeed = cruiseSpeed * (1 - Math.pow(1 - t, 3)); // ease-out cubic ramp-up
        if (t >= 1) phase = "cruise";
      } else if (phase === "cruise") {
        currentSpeed = cruiseSpeed;
      } else if (phase === "easeOut") {
        const t = Math.min((now - phaseStart) / 1000 / EASE_OUT_SECONDS, 1);
        currentSpeed = easeOutStartSpeed * (1 - t * t); // ease-in quad deceleration
        if (t >= 1) {
          phase = "stopped";
          stop();
          return;
        }
      }

      camera.rotate(Cartesian3.UNIT_Z, -currentSpeed * dt);
      scene.requestRender();
    }

    const canvas = viewer.canvas;
    canvas.addEventListener("pointerdown", onInteract, { passive: true });
    canvas.addEventListener("wheel", onInteract, { passive: true });
    scene.preRender.addEventListener(tick);

    return () => {
      stop();
      beginEaseOutRef.current = () => {};
    };
  }, [viewer]);

  return stopIntro;
}
