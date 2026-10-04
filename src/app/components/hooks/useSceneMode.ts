import { useEffect, useState } from "react";
import { type SceneMode, type Viewer as ViewerType } from "cesium";

/** The viewer's current scene mode, updated after each morph; null without a viewer. */
export function useSceneMode(viewer: ViewerType | null): SceneMode | null {
  // Only morphs change the mode, so state is set from morphComplete; before the first one, read the viewer directly
  const [morphed, setMorphed] = useState<{ viewer: ViewerType; mode: SceneMode } | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const update = () => setMorphed({ viewer, mode: viewer.scene.mode });
    const removeListener = viewer.scene.morphComplete.addEventListener(update);
    return () => {
      if (!viewer.isDestroyed()) removeListener();
    };
  }, [viewer]);

  if (!viewer) return null;
  return morphed?.viewer === viewer ? morphed.mode : viewer.scene.mode;
}
