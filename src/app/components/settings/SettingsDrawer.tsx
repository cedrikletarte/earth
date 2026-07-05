"use client";

import { useState } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import AtmosphereControls from "./atmosphere/AtmosphereControls";
import type { AtmosphereViewModel } from "./atmosphere/types";
import GlobeControls from "./globe/GlobeControls";
import type { GlobeViewModel } from "./globe/types";
import RenderingControls from "./rendering/RenderingControls";
import type { RenderingViewModel } from "./rendering/types";
import CameraControls from "./camera/CameraControls";
import type { CameraViewModel } from "./camera/types";
import DebugControls from "./debug/DebugControls";
import type { DebugViewModel } from "./debug/types";

interface CategoryProps<T> {
  viewModel: T | null;
  onUpdateParameter: <K extends keyof T>(key: K, value: T[K]) => void;
}

interface SettingsDrawerProps {
  atmosphere: CategoryProps<AtmosphereViewModel>;
  globe: CategoryProps<GlobeViewModel>;
  rendering: CategoryProps<RenderingViewModel>;
  camera: CategoryProps<CameraViewModel>;
  debug: CategoryProps<DebugViewModel>;
  hasBuildingsTileset: boolean;
  viewer?: any;
}

const CATEGORIES = [
  { key: "atmosphere", label: "Atmosphere" },
  { key: "globe", label: "Globe" },
  { key: "rendering", label: "Rendering" },
  { key: "camera", label: "Camera" },
  { key: "debug", label: "Debug" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export default function SettingsDrawer({
  atmosphere,
  globe,
  rendering,
  camera,
  debug,
  hasBuildingsTileset,
  viewer,
}: SettingsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("atmosphere");

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
            height: "100%",
            p: 2,
            overflowX: "hidden", // Hide horizontal scrollbar
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
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

          <Tabs
            value={activeCategory}
            onChange={(_, newValue) => setActiveCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 1,
              minHeight: "auto",
              "& .MuiTab-root": {
                minHeight: "auto",
                py: 1,
                fontSize: "0.75rem",
                fontWeight: 500,
                minWidth: "auto",
                px: 1.5,
              },
            }}
          >
            {CATEGORIES.map((c) => (
              <Tab key={c.key} label={c.label} value={c.key} />
            ))}
          </Tabs>

          <Box sx={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
            {activeCategory === "atmosphere" && (
              <AtmosphereControls
                viewModel={atmosphere.viewModel}
                onUpdateParameter={atmosphere.onUpdateParameter}
                viewer={viewer}
              />
            )}
            {activeCategory === "globe" && (
              <GlobeControls viewModel={globe.viewModel} onUpdateParameter={globe.onUpdateParameter} />
            )}
            {activeCategory === "rendering" && (
              <RenderingControls viewModel={rendering.viewModel} onUpdateParameter={rendering.onUpdateParameter} />
            )}
            {activeCategory === "camera" && (
              <CameraControls viewModel={camera.viewModel} onUpdateParameter={camera.onUpdateParameter} />
            )}
            {activeCategory === "debug" && (
              <DebugControls
                viewModel={debug.viewModel}
                onUpdateParameter={debug.onUpdateParameter}
                hasTileset={hasBuildingsTileset}
              />
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
