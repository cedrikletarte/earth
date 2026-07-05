"use client";

import Box from "@mui/material/Box";
import { ControlSection, CheckboxControl, SliderControl, ColorControl } from "../SettingsControls";
import type { GlobeViewModel } from "./types";

interface GlobeControlsProps {
  viewModel: GlobeViewModel | null;
  onUpdateParameter: <K extends keyof GlobeViewModel>(key: K, value: GlobeViewModel[K]) => void;
}

export default function GlobeControls({ viewModel, onUpdateParameter }: GlobeControlsProps) {
  if (!viewModel) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <ControlSection title="Globe">
        <CheckboxControl label="Show Globe" checked={viewModel.show} onChange={(v) => onUpdateParameter("show", v)} />
        <CheckboxControl
          label="Depth Test Against Terrain"
          checked={viewModel.depthTestAgainstTerrain}
          onChange={(v) => onUpdateParameter("depthTestAgainstTerrain", v)}
        />
        <CheckboxControl
          label="Water Effect"
          checked={viewModel.showWaterEffect}
          onChange={(v) => onUpdateParameter("showWaterEffect", v)}
        />
        <ColorControl
          label="Base Color"
          value={viewModel.baseColor}
          onChange={(v) => onUpdateParameter("baseColor", v)}
        />
      </ControlSection>

      <ControlSection title="Terrain Tiles">
        <SliderControl
          label="Max Screen-Space Error (lower = more detail)"
          value={viewModel.maximumScreenSpaceError}
          min={0.5}
          max={16}
          step={0.5}
          onChange={(v) => onUpdateParameter("maximumScreenSpaceError", v)}
        />
        <SliderControl
          label="Tile Cache Size"
          value={viewModel.tileCacheSize}
          min={0}
          max={1000}
          step={10}
          format={(v) => v.toFixed(0)}
          onChange={(v) => onUpdateParameter("tileCacheSize", v)}
        />
        <CheckboxControl
          label="Preload Ancestor Tiles"
          checked={viewModel.preloadAncestors}
          onChange={(v) => onUpdateParameter("preloadAncestors", v)}
        />
        <CheckboxControl
          label="Preload Sibling Tiles"
          checked={viewModel.preloadSiblings}
          onChange={(v) => onUpdateParameter("preloadSiblings", v)}
        />
      </ControlSection>

      <ControlSection title="Vertical Exaggeration">
        <SliderControl
          label="Exaggeration"
          value={viewModel.verticalExaggeration}
          min={1}
          max={5}
          step={0.1}
          onChange={(v) => onUpdateParameter("verticalExaggeration", v)}
        />
        <SliderControl
          label="Relative Height (m)"
          value={viewModel.verticalExaggerationRelativeHeight}
          min={-1000}
          max={1000}
          step={10}
          format={(v) => v.toFixed(0)}
          onChange={(v) => onUpdateParameter("verticalExaggerationRelativeHeight", v)}
        />
      </ControlSection>

      <ControlSection title="Imagery Layer" defaultExpanded={false}>
        <SliderControl
          label="Alpha"
          value={viewModel.imageryAlpha}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onUpdateParameter("imageryAlpha", v)}
        />
        <SliderControl
          label="Brightness"
          value={viewModel.imageryBrightness}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => onUpdateParameter("imageryBrightness", v)}
        />
        <SliderControl
          label="Contrast"
          value={viewModel.imageryContrast}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => onUpdateParameter("imageryContrast", v)}
        />
        <SliderControl
          label="Hue (rad)"
          value={viewModel.imageryHue}
          min={-Math.PI}
          max={Math.PI}
          step={0.05}
          onChange={(v) => onUpdateParameter("imageryHue", v)}
        />
        <SliderControl
          label="Saturation"
          value={viewModel.imagerySaturation}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => onUpdateParameter("imagerySaturation", v)}
        />
        <SliderControl
          label="Gamma"
          value={viewModel.imageryGamma}
          min={0.1}
          max={3}
          step={0.05}
          onChange={(v) => onUpdateParameter("imageryGamma", v)}
        />
      </ControlSection>
    </Box>
  );
}
