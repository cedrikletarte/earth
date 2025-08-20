"use client";

import { useState } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import AtmosphereControls from "../atmosphere/AtmosphereControls";
import type { AtmosphereViewModel } from "../atmosphere/types";

interface SettingsDrawerProps {
  viewModel: AtmosphereViewModel | null;
  onUpdateParameter: <K extends keyof AtmosphereViewModel>(
    key: K,
    value: AtmosphereViewModel[K]
  ) => void;
  viewer?: any;
}

export default function SettingsDrawer({
  viewModel,
  onUpdateParameter,
  viewer,
}: SettingsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Drawer handle (center-left, vertically centered) */}
      <IconButton
        aria-label={open ? "close settings" : "open settings"}
        onClick={() => setOpen(!open)}
        sx={{
          position: "fixed",
          top: "50%",
          left: open ? 360 : 0,
          transform: "translateY(-50%)",
          zIndex: (theme) => (theme as any).zIndex.drawer + 1,
          backgroundColor: "rgba(255,255,255,0.9)",
          boxShadow: 2,
          borderRadius: "0 8px 8px 0",
          width: 32,
          height: 64,
          "&:hover": { backgroundColor: "rgba(255,255,255,1)" },
          transition: (theme) =>
            `left ${
              (theme as any).transitions?.duration?.enteringScreen || 225
            }ms ${
              (theme as any).transitions?.easing?.easeOut ||
              "cubic-bezier(0.0, 0, 0.2, 1)"
            }`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Typography>
            {open ? (
              <ArrowBackIosNewIcon fontSize="small" />
            ) : (
              <ArrowForwardIosIcon fontSize="small" />
            )}
          </Typography>
        </Box>
      </IconButton>

      {/* Left Drawer with settings */}
      <Drawer
        anchor="left"
        open={open}
        variant="persistent"
        sx={{
          "& .MuiDrawer-paper": {
            width: 360,
            boxSizing: "border-box",
            overflowX: "hidden", // Hide horizontal scrollbar
          },
        }}
      >
        <Box
          sx={{
            width: 360,
            p: 2,
            overflowX: "hidden", // Hide horizontal scrollbar
            display: "flex",
            flexDirection: "column",
          }}
          role="presentation"
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Settings
            </Typography>
            <IconButton aria-label="close" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ mt: 2 }}>
            <AtmosphereControls
              viewModel={viewModel}
              onUpdateParameter={onUpdateParameter}
              viewer={viewer}
            />
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
