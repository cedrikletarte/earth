"use client";

import Box from "@mui/material/Box";
import { ControlSection, CheckboxControl, SliderControl } from "../SettingsControls";
import type { CameraViewModel } from "./types";

interface CameraControlsProps {
  viewModel: CameraViewModel | null;
  onUpdateParameter: <K extends keyof CameraViewModel>(key: K, value: CameraViewModel[K]) => void;
}

export default function CameraControls({ viewModel, onUpdateParameter }: CameraControlsProps) {
  if (!viewModel) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <ControlSection title="Allowed Inputs">
        <CheckboxControl label="Rotate" checked={viewModel.enableRotate} onChange={(v) => onUpdateParameter("enableRotate", v)} />
        <CheckboxControl label="Translate" checked={viewModel.enableTranslate} onChange={(v) => onUpdateParameter("enableTranslate", v)} />
        <CheckboxControl label="Zoom" checked={viewModel.enableZoom} onChange={(v) => onUpdateParameter("enableZoom", v)} />
        <CheckboxControl label="Tilt" checked={viewModel.enableTilt} onChange={(v) => onUpdateParameter("enableTilt", v)} />
        <CheckboxControl label="Look" checked={viewModel.enableLook} onChange={(v) => onUpdateParameter("enableLook", v)} />
      </ControlSection>

      <ControlSection title="Zoom Distance">
        <SliderControl
          label="Minimum (m)"
          value={viewModel.minimumZoomDistance}
          min={0}
          max={1000}
          step={1}
          format={(v) => v.toFixed(0)}
          onChange={(v) => onUpdateParameter("minimumZoomDistance", v)}
        />
        <SliderControl
          label="Maximum (m)"
          value={viewModel.maximumZoomDistance}
          min={1000}
          max={50_000_000}
          step={1000}
          format={(v) => v.toFixed(0)}
          onChange={(v) => onUpdateParameter("maximumZoomDistance", v)}
        />
      </ControlSection>

      <ControlSection title="Inertia" defaultExpanded={false}>
        <SliderControl
          label="Spin"
          value={viewModel.inertiaSpin}
          min={0}
          max={0.99}
          step={0.01}
          onChange={(v) => onUpdateParameter("inertiaSpin", v)}
        />
        <SliderControl
          label="Translate"
          value={viewModel.inertiaTranslate}
          min={0}
          max={0.99}
          step={0.01}
          onChange={(v) => onUpdateParameter("inertiaTranslate", v)}
        />
        <SliderControl
          label="Zoom"
          value={viewModel.inertiaZoom}
          min={0}
          max={0.99}
          step={0.01}
          onChange={(v) => onUpdateParameter("inertiaZoom", v)}
        />
      </ControlSection>
    </Box>
  );
}
