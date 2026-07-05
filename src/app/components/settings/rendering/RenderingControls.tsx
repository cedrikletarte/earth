"use client";

import Box from "@mui/material/Box";
import { ControlSection, CheckboxControl, SliderControl, ToggleGroupControl } from "../SettingsControls";
import type { RenderingViewModel } from "./types";

interface RenderingControlsProps {
  viewModel: RenderingViewModel | null;
  onUpdateParameter: <K extends keyof RenderingViewModel>(key: K, value: RenderingViewModel[K]) => void;
}

const MSAA_OPTIONS = [1, 2, 4, 8].map((n) => ({ value: n, label: n === 1 ? "Off" : `${n}x` }));

export default function RenderingControls({ viewModel, onUpdateParameter }: RenderingControlsProps) {
  if (!viewModel) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <ControlSection title="Anti-aliasing">
        <ToggleGroupControl
          label="MSAA Samples"
          value={viewModel.msaaSamples}
          options={MSAA_OPTIONS}
          onChange={(v) => onUpdateParameter("msaaSamples", v)}
        />
        <CheckboxControl label="FXAA" checked={viewModel.fxaa} onChange={(v) => onUpdateParameter("fxaa", v)} />
      </ControlSection>

      <ControlSection title="Shadows">
        <CheckboxControl label="Enable Shadows" checked={viewModel.shadows} onChange={(v) => onUpdateParameter("shadows", v)} />
        <CheckboxControl
          label="Soft Shadows"
          checked={viewModel.softShadows}
          disabled={!viewModel.shadows}
          onChange={(v) => onUpdateParameter("softShadows", v)}
        />
      </ControlSection>

      <ControlSection title="Performance">
        <CheckboxControl
          label="Request Render Mode (render only on change)"
          checked={viewModel.requestRenderMode}
          onChange={(v) => onUpdateParameter("requestRenderMode", v)}
        />
        <SliderControl
          label="Resolution Scale"
          value={viewModel.resolutionScale}
          min={0.25}
          max={2}
          step={0.05}
          onChange={(v) => onUpdateParameter("resolutionScale", v)}
        />
      </ControlSection>
    </Box>
  );
}
