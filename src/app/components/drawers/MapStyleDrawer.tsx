import { useEffect, useEffectEvent, useState } from "react";
import Box from "@mui/material/Box";
import { Tooltip } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import LayersIcon from "@mui/icons-material/Layers";
import { type Viewer as ViewerType } from "cesium";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { MapStyle } from "../imagery/styles";
import { GIBS_MIN_DATE, defaultGibsDate } from "../imagery/gibs";
import { useRightDockOffset, useSetRightDockOffset } from "../controls/rightDock";
import MiniViewer from "./MiniViewer";


type MapStyleDrawerProps = {
  viewer: ViewerType | null;
  styles: MapStyle[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
  /** Day shown by the dated NASA styles (YYYY-MM-DD) */
  nasaDate: string;
  onNasaDateChange: (date: string) => void;
  /** City lights overlay on the night side, whatever the base style */
  nightLights: boolean;
  onNightLightsChange: (enabled: boolean) => void;
  /** False in 2D/Columbus or with globe lighting off, where the overlay can't be drawn */
  nightLightsAvailable: boolean;
  /** Extra sections rendered above the styles (e.g. natural events) */
  children?: React.ReactNode;
};

const GROUP_TITLES: Record<MapStyle["group"], string> = {
  Map: "Map styles",
  NASA: "NASA imagery",
};

export default function MapStyleDrawer({
  viewer,
  styles,
  selectedKey,
  onSelect,
  onOpenChange,
  nasaDate,
  onNasaDateChange,
  nightLights,
  onNightLightsChange,
  nightLightsAvailable,
  children,
}: MapStyleDrawerProps) {
  const [open, setOpen] = useState(false);
  const [maxNasaDate] = useState(defaultGibsDate);
  const rightOffset = useRightDockOffset();
  const setRightOffset = useSetRightDockOffset();

  const notifyOpenChange = useEffectEvent((isOpen: boolean) => onOpenChange?.(isOpen));

  useEffect(() => {
    setRightOffset(open ? 300 : 0);
    notifyOpenChange(open);
    return () => setRightOffset(0);
  }, [open, setRightOffset]);

  return (
    <>
      <Tooltip title="Layers" placement="left">
        <Box
          sx={{
            position: "fixed",
            right: rightOffset,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: (theme) => theme.zIndex.drawer + 2,
            transition: (theme) =>
              theme.transitions.create("right", {
                duration: theme.transitions.duration.enteringScreen,
                easing: theme.transitions.easing.easeOut,
              }),
          }}
        >
          <Box
            role="button"
            aria-label={open ? "Close layers" : "Open layers"}
            aria-pressed={open}
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
            <LayersIcon />
          </Box>
        </Box>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        variant="persistent"
        hideBackdrop
        sx={{ "& .MuiDrawer-paper": { width: 300 } }}
      >
        <Box sx={{ p: 2, width: "100%", boxSizing: "border-box", height: "100%", overflowY: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>Layers</Typography>
            <IconButton aria-label="close layers" onClick={() => setOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {children}
          {(Object.keys(GROUP_TITLES) as MapStyle["group"][]).map((group) => (
            <Box key={group} sx={{ mb: 2 }}>
              <Typography variant="overline" color="textSecondary" sx={{ display: "block", fontWeight: "bold" }}>
                {GROUP_TITLES[group]}
              </Typography>
              {group === "NASA" && (
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  label="Imagery date"
                  value={nasaDate}
                  onChange={(e) => {
                    // Cleared or partially typed dates come through as ""
                    if (e.target.value) onNasaDateChange(e.target.value);
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: GIBS_MIN_DATE, max: maxNasaDate },
                  }}
                  sx={{ mb: 1 }}
                />
              )}
              {group === "NASA" && (
                <Box sx={{ mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={nightLights}
                        disabled={!nightLightsAvailable}
                        onChange={(e) => onNightLightsChange(e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">City lights on the night side</Typography>}
                  />
                  {!nightLightsAvailable && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                      Needs the 3D view with globe lighting enabled.
                    </Typography>
                  )}
                </Box>
              )}
              {styles.filter((s) => s.group === group).map((s) => (
                <Box key={s.key} sx={{ mb: 1.5 }}>
                  <Box
                    onClick={() => { onSelect(s.key); setOpen(false); }}
                    sx={{
                      position: "relative",
                      cursor: "pointer",
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: 0,
                      transition: "box-shadow 120ms ease",
                      width: 260,
                      mx: "auto",
                    }}
                  >
                    <MiniViewer
                      mainViewer={viewer}
                      createProviders={s.createProviders}
                      width={260}
                      height={90}
                      rounded
                      selected={selectedKey === s.key}
                      active={open}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        px: 0.75,
                        py: 0.25,
                        bgcolor: "rgba(0,0,0,0.6)",
                        borderRadius: 3,
                      }}
                    >
                      <Typography variant="caption" color="#fff">{s.name}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
}
