"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Slider from "@mui/material/Slider";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Shared, view-model-agnostic controls used by every settings category
// (Atmosphere, Globe, Rendering, Camera, Debug) so each one doesn't
// reimplement the same accordion/slider/checkbox boilerplate.

export function ControlSection({
  title,
  children,
  defaultExpanded = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      sx={{
        mb: 1,
        boxShadow: 1,
        width: "100%",
        "& .MuiAccordionSummary-content": { minWidth: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: "600" }}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {children}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export function CheckboxControl({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
        />
      }
      label={
        <Typography variant="body2" sx={{ opacity: disabled ? 0.5 : 1 }}>
          {label}
        </Typography>
      }
      sx={{ margin: 0, opacity: disabled ? 0.5 : 1 }}
    />
  );
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 0.01,
  disabled = false,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Box sx={{ opacity: disabled ? 0.5 : 1 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        {label}: {format ? format(localValue) : localValue.toFixed(2)}
      </Typography>
      <Slider
        value={localValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(_, newValue) => setLocalValue(newValue as number)}
        onChangeCommitted={(_, newValue) => onChange(newValue as number)}
        size="small"
        sx={{
          "& .MuiSlider-thumb": { width: 16, height: 16 },
          "& .MuiSlider-track": { height: 3 },
          "& .MuiSlider-rail": { height: 3 },
        }}
      />
    </Box>
  );
}

export function ToggleGroupControl<T extends string | number>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <Box sx={{ opacity: disabled ? 0.5 : 1 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: "block" }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        size="small"
        disabled={disabled}
        onChange={(_, newValue) => {
          if (newValue !== null) onChange(newValue as T);
        }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.25, fontSize: "0.7rem" }}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

export function ColorControl({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, opacity: disabled ? 0.5 : 1 }}>
      <Typography variant="body2" sx={{ flex: 1 }}>
        {label}
      </Typography>
      <Box
        component="input"
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{
          width: 32,
          height: 24,
          p: 0,
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: 0.5,
          cursor: disabled ? "default" : "pointer",
        }}
      />
    </Box>
  );
}
