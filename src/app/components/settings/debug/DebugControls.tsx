"use client";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { ControlSection, CheckboxControl } from "../SettingsControls";
import type { DebugViewModel } from "./types";

interface DebugControlsProps {
  viewModel: DebugViewModel | null;
  onUpdateParameter: <K extends keyof DebugViewModel>(key: K, value: DebugViewModel[K]) => void;
  hasTileset: boolean;
}

export default function DebugControls({ viewModel, onUpdateParameter, hasTileset }: DebugControlsProps) {
  if (!viewModel) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <ControlSection title="Scene">
        <CheckboxControl label="Show FPS Counter" checked={viewModel.showFps} onChange={(v) => onUpdateParameter("showFps", v)} />
      </ControlSection>

      <ControlSection title="Buildings Tileset">
        {!hasTileset && (
          <Alert severity="info" sx={{ fontSize: "0.75rem" }}>
            <Typography variant="caption">Tileset not loaded yet.</Typography>
          </Alert>
        )}
        <CheckboxControl
          label="Wireframe"
          checked={viewModel.tilesetWireframe}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetWireframe", v)}
        />
        <CheckboxControl
          label="Show Bounding Volumes"
          checked={viewModel.tilesetShowBoundingVolume}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetShowBoundingVolume", v)}
        />
        <CheckboxControl
          label="Colorize Tiles"
          checked={viewModel.tilesetColorizeTiles}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetColorizeTiles", v)}
        />
        <CheckboxControl
          label="Show Geometric Error"
          checked={viewModel.tilesetShowGeometricError}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetShowGeometricError", v)}
        />
        <CheckboxControl
          label="Show Rendering Statistics"
          checked={viewModel.tilesetShowRenderingStatistics}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetShowRenderingStatistics", v)}
        />
        <CheckboxControl
          label="Show Memory Usage"
          checked={viewModel.tilesetShowMemoryUsage}
          disabled={!hasTileset}
          onChange={(v) => onUpdateParameter("tilesetShowMemoryUsage", v)}
        />
      </ControlSection>
    </Box>
  );
}
