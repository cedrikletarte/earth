"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { type Viewer as ViewerType, SceneMode } from "cesium";
import ViewInArIcon from "@mui/icons-material/ViewInAr"; // 3D
import GridOnIcon from "@mui/icons-material/GridOn"; // 2D
import ViewWeekIcon from "@mui/icons-material/ViewWeek"; // Columbus View (CV)
import { useRightDockOffset } from "./RightDockContext";

type Props = {
  viewer: ViewerType | null;
};

export default function SceneModeSwitcher({ viewer }: Props) {
  const [mode, setMode] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rightOffset = useRightDockOffset();
  // Slower morph for smoother visual transition between modes (seconds)
  const morphDuration = 1.2;

  // Sync local state with viewer scene mode
  useEffect(() => {
    if (!viewer) return;
    setMode(viewer.scene.mode);
    const update = () => setMode(viewer.scene.mode);
    viewer.scene.morphComplete.addEventListener(update);
    return () => {
      try {
        viewer.scene.morphComplete.removeEventListener(update);
      } catch {}
    };
  }, [viewer]);

  const isSelected = (m: number) => mode === m;

  const switchTo = (target: number) => {
    if (!viewer) return;
    if (viewer.scene.mode === target) return;
    if (target === SceneMode.SCENE3D) viewer.scene.morphTo3D(morphDuration);
    else if (target === SceneMode.SCENE2D)
      viewer.scene.morphTo2D(morphDuration);
    else if (target === SceneMode.COLUMBUS_VIEW)
      viewer.scene.morphToColumbusView(morphDuration);
  };

  const Btn = ({
    label,
    active,
    onClick,
    children,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <Tooltip title={label} placement="left">
      <Box
        role="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: active ? "#4caf50" : "rgba(0,0,0,0.55)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: 2,
          cursor: "pointer",
          "&:hover": { bgcolor: active ? "#43a047" : "rgba(0,0,0,0.75)" },
          backdropFilter: "blur(2px)",
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );

  // Close the sub-buttons when clicking outside or on Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const CurrentIcon = () => {
    if (mode === SceneMode.SCENE2D) return <GridOnIcon fontSize="small" />;
    if (mode === SceneMode.COLUMBUS_VIEW)
      return <ViewWeekIcon fontSize="small" />;
    return <ViewInArIcon fontSize="small" />; // default 3D
  };

  // Build list of alternative modes (exclude current)
  const allModes = [
    {
      id: SceneMode.SCENE3D,
      label: "3D",
      icon: <ViewInArIcon fontSize="small" />,
    },
    {
      id: SceneMode.SCENE2D,
      label: "2D",
      icon: <GridOnIcon fontSize="small" />,
    },
    {
      id: SceneMode.COLUMBUS_VIEW,
      label: "Columbus View",
      icon: <ViewWeekIcon fontSize="small" />,
    },
  ];
  const alternatives = allModes.filter((m) => m.id !== mode);

  return (
    <Box
      ref={rootRef}
      sx={{
        position: "fixed",
        right: rightOffset,
        top: "50%",
        transform: "translateY(calc(-50% + 56px))", // slightly below the Layers button
        zIndex: (theme) => (theme as any).zIndex.drawer + 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        transition: (theme) =>
          `right ${
            (theme as any).transitions?.duration?.enteringScreen || 225
          }ms ${
            (theme as any).transitions?.easing?.easeOut ||
            "cubic-bezier(0.0, 0, 0.2, 1)"
          } `,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Main toggle button shows current mode icon */}
        <Tooltip
          title={open ? "Close scene mode" : "Change scene mode"}
          placement="left"
        >
          <Box
            role="button"
            aria-label="Scene mode"
            aria-expanded={open}
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
            <CurrentIcon />
          </Box>
        </Tooltip>

        {open && (
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              // subtle slide/fade in
              opacity: 1,
              transform: "translateY(0)",
              transition: "opacity 150ms ease, transform 150ms ease",
            }}
          >
            {alternatives.map((m) => (
              <Btn
                key={m.id}
                label={m.label}
                active={false}
                onClick={() => {
                  switchTo(m.id);
                  setOpen(false);
                }}
              >
                {m.icon}
              </Btn>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
