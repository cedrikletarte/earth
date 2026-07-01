import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { Tooltip } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import LayersIcon from "@mui/icons-material/Layers";
import { type ImageryProvider, type Viewer as ViewerType } from "cesium";
import { useRightDockOffset, useSetRightDockOffset } from "../controls/RightDockContext";
import MiniViewer from "./MiniViewer";

export type MapStyle = {
  key: string;
  name: string;
  createProvider: () => ImageryProvider;
};

type MapStyleDrawerProps = {
  viewer: ViewerType | null;
  styles: MapStyle[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export default function MapStyleDrawer({
  viewer,
  styles,
  selectedKey,
  onSelect,
  onOpenChange,
}: MapStyleDrawerProps) {
  const [open, setOpen] = useState(false);
  const rightOffset = useRightDockOffset();
  const setRightOffset = useSetRightDockOffset();

  useEffect(() => {
    setRightOffset(open ? 300 : 0);
    onOpenChange?.(open);
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
            zIndex: (theme) => (theme as any).zIndex.drawer + 2,
            transition: (theme) =>
              `right ${(theme as any).transitions?.duration?.enteringScreen || 225}ms ${(theme as any).transitions?.easing?.easeOut || "cubic-bezier(0.0, 0, 0.2, 1)"}`,
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
            <Typography variant="h6" sx={{ flex: 1 }}>Map styles</Typography>
            <IconButton aria-label="close layers" onClick={() => setOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {styles.map((s) => (
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
                  createProvider={s.createProvider}
                  width={260}
                  height={90}
                  rounded
                  selected={selectedKey === s.key}
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
      </Drawer>
    </>
  );
}
