"use client";

import { type Viewer as ViewerType } from "cesium";
import SceneModeSwitcher from "./SceneModeSwitcher";
import LocateMeButton from "./LocateMeButton";
import HomeViewButton from "./HomeViewButton";
import { RightDockProvider } from "./RightDockContext";

type Props = { viewer: ViewerType | null; children?: React.ReactNode };

export default function RightControls({ viewer, children }: Props) {
  // Provide the right offset context and render controls + any children that need it (e.g., MapStyleSwitcher)
  return (
    <RightDockProvider>
      <SceneModeSwitcher viewer={viewer} />
      <LocateMeButton viewer={viewer} />
      <HomeViewButton viewer={viewer} />
      {children}
    </RightDockProvider>
  );
}
