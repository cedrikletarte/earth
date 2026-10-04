import { useEffect, useRef, useState } from "react";
import {
  Viewer,
  OrthographicOffCenterFrustum,
  type Viewer as ViewerType,
  SkyBox,
  WebMercatorProjection,
  SceneMode,
  Math as CesiumMath,
  Cartographic,
  EllipsoidTerrainProvider,
} from "cesium";

export function useCesiumViewer(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const viewerRef = useRef<ViewerType | null>(null);
  const [viewer, setViewer] = useState<ViewerType | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const v = new Viewer(containerRef.current, {
      creditContainer: document.createElement("div"),
      baseLayer: false,
      baseLayerPicker: false,
      sceneModePicker: false,
      homeButton: false,
      navigationHelpButton: false,
      timeline: false,
      animation: false,
      geocoder: false,
      mapProjection: new WebMercatorProjection(),
      skyBox: new SkyBox({
        sources: {
          positiveX: "/skybox/px.png",
          negativeX: "/skybox/nx.png",
          positiveY: "/skybox/ny.png",
          negativeY: "/skybox/py.png",
          positiveZ: "/skybox/pz.png",
          negativeZ: "/skybox/nz.png",
        },
      }),
      sceneMode: SceneMode.SCENE3D,
    });

    viewerRef.current = v;
    setViewer(v);

    //if (v.scene.sun) v.scene.sun.show = true;

    const clampCamera2D = () => {
      const scene = v.scene;
      if (scene.mode !== SceneMode.SCENE2D) return;
      const camera = scene.camera;
      const frustum = camera.frustum;
      if (
        !(frustum instanceof OrthographicOffCenterFrustum) ||
        typeof frustum.left !== "number" ||
        typeof frustum.right !== "number" ||
        typeof frustum.top !== "number" ||
        typeof frustum.bottom !== "number"
      ) return;
      const maxCoord = scene.mapProjection.project(
        new Cartographic(CesiumMath.PI, CesiumMath.PI_OVER_TWO)
      );
      const minY = -maxCoord.y - frustum.bottom;
      const maxY = maxCoord.y - frustum.top;
      const pos = camera.position;
      const clampedY = CesiumMath.clamp(pos.y, minY, maxY);
      if (clampedY !== pos.y) camera.position.y = clampedY;
    };

    v.scene.preRender.addEventListener(clampCamera2D);

    // Atmosphere effects only make sense on the 3D globe; useAtmosphereControls restores them on return to 3D
    v.scene.morphComplete.addEventListener(() => {
      const sceneMode = v.scene.mode;
      if (sceneMode !== SceneMode.SCENE2D && sceneMode !== SceneMode.COLUMBUS_VIEW) return;
      const globe = v.scene.globe;
      v.terrainProvider = new EllipsoidTerrainProvider();
      globe.enableLighting = false;
      globe.showGroundAtmosphere = false;
      if (v.scene.skyAtmosphere) v.scene.skyAtmosphere.show = false;
      v.scene.fog.enabled = false;
      v.scene.highDynamicRange = false;
    });

    return () => {
      try {
        if (viewerRef.current) {
          viewerRef.current.scene.preRender.removeEventListener(clampCamera2D);
        }
        viewerRef.current?.destroy();
      } finally {
        viewerRef.current = null;
        setViewer(null);
      }
    };
  }, [containerRef]);

  return { viewer, viewerRef };
}
