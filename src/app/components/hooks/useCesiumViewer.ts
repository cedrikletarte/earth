import { useEffect, useRef, useState } from "react";
import {
  Ion,
  Viewer,
  type Viewer as ViewerType,
  SkyBox,
  WebMercatorProjection,
  SceneMode,
  Math as CesiumMath,
  Cartographic,
  EllipsoidTerrainProvider,
  createWorldTerrainAsync,
  createOsmBuildingsAsync,
} from "cesium";

export function useCesiumViewer(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const viewerRef = useRef<ViewerType | null>(null);
  const [viewer, setViewer] = useState<ViewerType | null>(null);

  useEffect(() => {
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) {
      console.warn("VITE_CESIUM_ION_TOKEN is not set. Add it to your .env file.");
    } else {
      Ion.defaultAccessToken = token;
    }

    if (!containerRef.current) return;

    const v = new Viewer(containerRef.current, {
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
      const camera = scene.camera as any;
      const frustum: any = camera.frustum;
      if (
        frustum == null ||
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

    v.scene.morphComplete.addEventListener(() => {
      const sceneMode = v.scene.mode;
      const globe = v.scene.globe;
      const skyAtmosphere = v.scene.skyAtmosphere;

      if (sceneMode === SceneMode.SCENE2D || sceneMode === SceneMode.COLUMBUS_VIEW) {
        v.scene.primitives.removeAll();
        v.terrainProvider = new EllipsoidTerrainProvider();
        globe.enableLighting = false;
        globe.showGroundAtmosphere = false;
        if (skyAtmosphere) skyAtmosphere.show = false;
        v.scene.fog.enabled = false;
        v.scene.highDynamicRange = false;
      } else if (sceneMode === SceneMode.SCENE3D) {
        globe.enableLighting = true;
        globe.showGroundAtmosphere = true;
        globe.atmosphereLightIntensity = 20.0;
        globe.dynamicAtmosphereLighting = true;
        globe.dynamicAtmosphereLightingFromSun = true;
        if (skyAtmosphere) skyAtmosphere.show = true;
        v.scene.fog.enabled = true;
        v.scene.highDynamicRange = true;
        (async () => {
          try {
            v.terrainProvider = await createWorldTerrainAsync();
            v.scene.primitives.add(await createOsmBuildingsAsync());
          } catch (error) {
            console.warn("Could not restore 3D elements:", error);
          }
        })();
      }
    });

    (async () => {
      if (v.scene.mode !== SceneMode.SCENE3D) return;
      try {
        v.terrainProvider = await createWorldTerrainAsync();
      } catch (error) {
        console.warn("Could not load terrain provider:", error);
      }
      try {
        v.scene.primitives.add(await createOsmBuildingsAsync());
      } catch (error) {
        console.warn("Could not load OSM buildings:", error);
      }
    })();

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
  }, []);

  return { viewer, viewerRef };
}
