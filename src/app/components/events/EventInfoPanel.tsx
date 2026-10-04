import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { EONET_CATEGORIES, categoryColor, latestPosition, type EonetEvent } from "./eonet";

type Props = {
  event: EonetEvent | null;
  onClose: () => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Details of a selected EONET event; laid out like CityInfoPanel so the two read alike. */
export default function EventInfoPanel({ event, onClose }: Props) {
  const latest = event?.geometry[event.geometry.length - 1];
  const first = event?.geometry[0];
  const position = event && latestPosition(event);

  return (
    <Dialog
      open={!!event}
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
            width: { xs: "92vw", sm: 380 },
            maxHeight: "85vh",
            boxSizing: "border-box",
            borderRadius: 2,
          },
        },
      }}
    >
      {event && (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {event.title}
            </Typography>
            <IconButton aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: "wrap" }}>
            {event.categories.map((c) => (
              <Chip
                key={c.id}
                size="small"
                label={EONET_CATEGORIES[c.id]?.title ?? c.title}
                sx={{ bgcolor: categoryColor(c.id), color: "#fff", textShadow: "0 0 2px rgba(0,0,0,0.6)" }}
              />
            ))}
          </Stack>
          <Divider sx={{ mb: 1.5 }} />

          {event.description && (
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {event.description}
            </Typography>
          )}
          <Stack spacing={0.5}>
            {latest && (
              <Typography variant="body2">
                <strong>Last observed:</strong> {formatDate(latest.date)}
              </Typography>
            )}
            {first && event.geometry.length > 1 && (
              <Typography variant="body2">
                <strong>First observed:</strong> {formatDate(first.date)} ({event.geometry.length} observations)
              </Typography>
            )}
            {latest?.magnitudeValue != null && (
              <Typography variant="body2">
                <strong>Magnitude:</strong> {latest.magnitudeValue.toLocaleString()} {latest.magnitudeUnit}
              </Typography>
            )}
            {position && (
              <Typography variant="body2">
                <strong>Position:</strong> {position[1].toFixed(2)}°, {position[0].toFixed(2)}°
              </Typography>
            )}
          </Stack>

          {event.sources.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="textSecondary">
                Sources:{" "}
              </Typography>
              {event.sources.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={s.url} target="_blank" rel="noopener" variant="caption">
                    {s.id}
                  </Link>
                </span>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  );
}
