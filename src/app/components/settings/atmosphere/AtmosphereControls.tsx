"use client";

import { useState, useEffect } from "react";
import { SceneMode } from "cesium";
import type { AtmosphereViewModel } from "./types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Alert from "@mui/material/Alert";
import { ControlSection, CheckboxControl as SharedCheckboxControl, SliderControl as SharedSliderControl } from "../SettingsControls";

interface AtmosphereControlsProps {
  viewModel: AtmosphereViewModel | null;
  onUpdateParameter: <K extends keyof AtmosphereViewModel>(
    key: K,
    value: AtmosphereViewModel[K]
  ) => void;
  viewer?: any; // Pass viewer to check scene mode
}

export default function AtmosphereControls({
  viewModel,
  onUpdateParameter,
  viewer,
}: AtmosphereControlsProps) {
  const [activeTab, setActiveTab] = useState<
    "globe" | "ground" | "sky" | "fog" | "scene"
  >("globe");
  const [is3DMode, setIs3DMode] = useState(true);

  // Check if we're in 3D mode
  useEffect(() => {
    if (!viewer) return;

    const checkSceneMode = () => {
      const sceneMode = viewer.scene.mode;
      setIs3DMode(sceneMode === SceneMode.SCENE3D);
    };

    // Check initially
    checkSceneMode();

    // Listen for scene mode changes
    const removeListener =
      viewer.scene.morphComplete.addEventListener(checkSceneMode);

    return () => {
      if (removeListener) removeListener();
    };
  }, [viewer]);

  if (!viewModel) {
    return null;
  }

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const CheckboxControl = ({
    label,
    property,
    checked,
  }: {
    label: string;
    property: keyof AtmosphereViewModel;
    checked: boolean;
  }) => (
    <SharedCheckboxControl
      label={label}
      checked={checked}
      disabled={!is3DMode}
      onChange={(v) => onUpdateParameter(property, v as AtmosphereViewModel[keyof AtmosphereViewModel])}
    />
  );

  const SliderControl = ({
    label,
    property,
    value,
    min,
    max,
    step = 0.01,
  }: {
    label: string;
    property: keyof AtmosphereViewModel;
    value: number;
    min: number;
    max: number;
    step?: number;
  }) => (
    <SharedSliderControl
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={!is3DMode}
      onChange={(v) => onUpdateParameter(property, v as AtmosphereViewModel[keyof AtmosphereViewModel])}
    />
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflowX: "hidden", // Hide horizontal scrollbar
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="body1" sx={{ flex: 1 }}>
          Atmosphere
        </Typography>
      </Box>

      {/* 2D Mode Warning */}
      {!is3DMode && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: "0.75rem" }}>
          <Typography variant="caption">
            <strong>Note:</strong> Atmosphere effects are disabled in 2D mode.
            Switch to 3D view to use these controls.
          </Typography>
        </Alert>
      )}

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          minHeight: "auto",
          maxWidth: "100%",
          "& .MuiTab-root": {
            minHeight: "auto",
            py: 1,
            fontSize: "0.75rem",
            fontWeight: 500,
            minWidth: "auto",
            px: 1.5,
          },
          "& .MuiTabs-scrollButtons": {
            display: "none", // Hide scroll buttons if not needed
          },
        }}
      >
        <Tab label="Globe" value="globe" />
        <Tab label="Ground" value="ground" />
        <Tab label="Sky" value="sky" />
        <Tab label="Fog" value="fog" />
        <Tab label="Scene" value="scene" />
      </Tabs>

      {/* Tab Content */}
      <Box
        sx={{
          overflowY: "auto",
          overflowX: "hidden", // Hide horizontal scrollbar
          flex: 1,
          maxHeight: "calc(100vh - 200px)",
          width: "100%",
        }}
      >
        {activeTab === "globe" && (
          <Box>
            <ControlSection title="Basic Settings">
              <CheckboxControl
                label="Enable Lighting"
                property="enableLighting"
                checked={viewModel.enableLighting}
              />
              <CheckboxControl
                label="Ground Translucency"
                property="groundTranslucency"
                checked={viewModel.groundTranslucency}
              />
            </ControlSection>
          </Box>
        )}

        {activeTab === "ground" && (
          <Box>
            <ControlSection title="Ground Atmosphere">
              <CheckboxControl
                label="Show Ground Atmosphere"
                property="showGroundAtmosphere"
                checked={viewModel.showGroundAtmosphere}
              />
              <CheckboxControl
                label="Dynamic Lighting"
                property="dynamicLighting"
                checked={viewModel.dynamicLighting}
              />
              <CheckboxControl
                label="Dynamic Lighting From Sun"
                property="dynamicLightingFromSun"
                checked={viewModel.dynamicLightingFromSun}
              />
            </ControlSection>

            <ControlSection title="Light Intensity">
              <SliderControl
                label="Light Intensity"
                property="groundAtmosphereLightIntensity"
                value={viewModel.groundAtmosphereLightIntensity}
                min={0}
                max={50}
                step={0.1}
              />
            </ControlSection>

            <ControlSection title="Rayleigh Coefficients">
              <SliderControl
                label="Red"
                property="groundAtmosphereRayleighCoefficientR"
                value={viewModel.groundAtmosphereRayleighCoefficientR}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Green"
                property="groundAtmosphereRayleighCoefficientG"
                value={viewModel.groundAtmosphereRayleighCoefficientG}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Blue"
                property="groundAtmosphereRayleighCoefficientB"
                value={viewModel.groundAtmosphereRayleighCoefficientB}
                min={0}
                max={50}
                step={0.1}
              />
            </ControlSection>

            <ControlSection title="Other Parameters">
              <SliderControl
                label="Mie Coefficient"
                property="groundAtmosphereMieCoefficient"
                value={viewModel.groundAtmosphereMieCoefficient}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Hue Shift"
                property="groundHueShift"
                value={viewModel.groundHueShift}
                min={-1}
                max={1}
                step={0.01}
              />
              <SliderControl
                label="Saturation Shift"
                property="groundSaturationShift"
                value={viewModel.groundSaturationShift}
                min={-1}
                max={1}
                step={0.01}
              />
              <SliderControl
                label="Brightness Shift"
                property="groundBrightnessShift"
                value={viewModel.groundBrightnessShift}
                min={-1}
                max={1}
                step={0.01}
              />
            </ControlSection>
          </Box>
        )}

        {activeTab === "sky" && (
          <Box>
            <ControlSection title="Sky Atmosphere">
              <CheckboxControl
                label="Show Sky Atmosphere"
                property="showSkyAtmosphere"
                checked={viewModel.showSkyAtmosphere}
              />
              <CheckboxControl
                label="Per Fragment Atmosphere"
                property="perFragmentAtmosphere"
                checked={viewModel.perFragmentAtmosphere}
              />
            </ControlSection>

            <ControlSection title="Light Intensity">
              <SliderControl
                label="Light Intensity"
                property="skyAtmosphereLightIntensity"
                value={viewModel.skyAtmosphereLightIntensity}
                min={0}
                max={50}
                step={0.1}
              />
            </ControlSection>

            <ControlSection title="Rayleigh Coefficients">
              <SliderControl
                label="Red"
                property="skyAtmosphereRayleighCoefficientR"
                value={viewModel.skyAtmosphereRayleighCoefficientR}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Green"
                property="skyAtmosphereRayleighCoefficientG"
                value={viewModel.skyAtmosphereRayleighCoefficientG}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Blue"
                property="skyAtmosphereRayleighCoefficientB"
                value={viewModel.skyAtmosphereRayleighCoefficientB}
                min={0}
                max={50}
                step={0.1}
              />
            </ControlSection>

            <ControlSection title="Other Parameters">
              <SliderControl
                label="Mie Coefficient"
                property="skyAtmosphereMieCoefficient"
                value={viewModel.skyAtmosphereMieCoefficient}
                min={0}
                max={50}
                step={0.1}
              />
              <SliderControl
                label="Hue Shift"
                property="skyHueShift"
                value={viewModel.skyHueShift}
                min={-1}
                max={1}
                step={0.01}
              />
              <SliderControl
                label="Saturation Shift"
                property="skySaturationShift"
                value={viewModel.skySaturationShift}
                min={-1}
                max={1}
                step={0.01}
              />
              <SliderControl
                label="Brightness Shift"
                property="skyBrightnessShift"
                value={viewModel.skyBrightnessShift}
                min={-1}
                max={1}
                step={0.01}
              />
            </ControlSection>
          </Box>
        )}

        {activeTab === "fog" && (
          <Box>
            <ControlSection title="Fog Settings">
              <CheckboxControl
                label="Show Fog"
                property="showFog"
                checked={viewModel.showFog}
              />
              <SliderControl
                label="Density"
                property="density"
                value={viewModel.density}
                min={0}
                max={5}
                step={0.01}
              />
              <SliderControl
                label="Minimum Brightness"
                property="minimumBrightness"
                value={viewModel.minimumBrightness}
                min={0}
                max={1}
                step={0.01}
              />
            </ControlSection>
          </Box>
        )}

        {activeTab === "scene" && (
          <Box>
            <ControlSection title="Scene Settings">
              <CheckboxControl
                label="HDR"
                property="hdr"
                checked={viewModel.hdr}
              />
            </ControlSection>
          </Box>
        )}
      </Box>
    </Box>
  );
}
