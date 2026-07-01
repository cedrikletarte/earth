import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import CloseIcon from "@mui/icons-material/Close";
import { useWikipediaInfo } from "./hooks/useWikipediaInfo";

export interface CityInfoPanelProps {
  open: boolean;
  onClose: () => void;
  placeLabel?: string;
  lon?: number;
  lat?: number;
  wikidataId?: string;
  wikipediaTag?: string;
}

export default function CityInfoPanel({
  open,
  onClose,
  placeLabel,
  lon,
  lat,
  wikidataId,
  wikipediaTag,
}: CityInfoPanelProps) {
  const { loading, error, data } = useWikipediaInfo({
    open,
    placeLabel,
    lon,
    lat,
    wikidataId,
    wikipediaTag,
  });

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      hideBackdrop
      disableEnforceFocus
      disableScrollLock
      disableAutoFocus
      disableRestoreFocus
      sx={{ pointerEvents: "none" }}
      slotProps={{
        paper: {
          sx: {
            pointerEvents: "auto",
            position: "fixed",
            right: 64,
            top: "50%",
            transform: "translateY(-50%)",
            m: 0,
            width: { xs: "92vw", sm: 420 },
            maxHeight: "85vh",
            boxSizing: "border-box",
            borderRadius: 2,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%", maxHeight: "85vh" }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
          <Typography variant="h6" sx={{ flex: 1 }} noWrap>
            {data?.title || placeLabel || "Details"}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="text.secondary">{error}</Typography>
        ) : data ? (
          <Box sx={{ overflow: "auto" }}>
            {data.thumbnail?.source && (
              <Box
                component="img"
                src={data.thumbnail.source}
                alt={data.title}
                sx={{ width: "100%", borderRadius: 1, mb: 2, boxShadow: 1 }}
              />
            )}
            {data.description && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {data.description}
              </Typography>
            )}
            {data.extract && (
              <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
                {data.extract}
              </Typography>
            )}
            {data.content_urls?.desktop?.page && (
              <Box sx={{ mt: 2 }}>
                <Link href={data.content_urls.desktop.page} target="_blank" rel="noopener">
                  Learn more on Wikipedia
                </Link>
              </Box>
            )}
          </Box>
        ) : (
          <Typography color="text.secondary">Select a city to see the summary.</Typography>
        )}
      </Box>
    </Dialog>
  );
}
