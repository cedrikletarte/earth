"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import { type Viewer as ViewerType } from "cesium";
import { useRightDockOffset } from "./RightDockContext";

type Props = {
  viewer: ViewerType | null;
};

export default function HomeViewButton({ viewer }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rightOffset = useRightDockOffset();

  const flyHome = () => {
    if (!viewer) return;
    try {
      viewer.camera.flyHome(1.2);
    } catch {}
  };

  return (
    <Box
      ref={rootRef}
      sx={{
        position: "fixed",
        right: rightOffset,
        bottom: 24,
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
      <Tooltip title="Home view" placement="left">
        <Box
          role="button"
          aria-label="Home view"
          onClick={flyHome}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: 2,
            cursor: "pointer",
            "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
            backdropFilter: "blur(2px)",
          }}
        >
          <HomeOutlinedIcon fontSize="small" />
        </Box>
      </Tooltip>
    </Box>
  );
}
