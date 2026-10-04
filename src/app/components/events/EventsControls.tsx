import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { EONET_CATEGORIES, categoryColor, type EonetEvent } from "./eonet";

const EVENT_WINDOWS_DAYS = [7, 30, 90, 365] as const;

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  days: number;
  onDaysChange: (days: number) => void;
  /** All loaded events, before category filtering */
  events: EonetEvent[];
  loading: boolean;
  error: string | null;
  hiddenCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
};

/** Layers-drawer section for NASA EONET natural events. */
export default function EventsControls({
  enabled,
  onEnabledChange,
  days,
  onDaysChange,
  events,
  loading,
  error,
  hiddenCategories,
  onToggleCategory,
}: Props) {
  // Only offer chips for categories present in the current window
  const counts = new Map<string, number>();
  for (const event of events) {
    const id = event.categories[0]?.id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="textSecondary" sx={{ display: "block", fontWeight: "bold" }}>
        Natural events (NASA EONET)
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <FormControlLabel
          sx={{ flex: 1, mr: 0 }}
          control={<Switch size="small" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />}
          label={<Typography variant="body2">Show on globe</Typography>}
        />
        {loading && <CircularProgress size={16} />}
      </Box>
      {enabled && (
        <>
          <TextField
            select
            size="small"
            fullWidth
            label="Observed in the last"
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            sx={{ mb: 1 }}
          >
            {EVENT_WINDOWS_DAYS.map((d) => (
              <MenuItem key={d} value={d}>
                {d === 365 ? "year" : `${d} days`}
              </MenuItem>
            ))}
          </TextField>
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
              {error}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {[...counts].map(([id, count]) => {
              const hidden = hiddenCategories.has(id);
              return (
                <Chip
                  key={id}
                  size="small"
                  label={`${EONET_CATEGORIES[id]?.title ?? id} (${count})`}
                  variant={hidden ? "outlined" : "filled"}
                  onClick={() => onToggleCategory(id)}
                  icon={
                    <Box
                      component="span"
                      sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: categoryColor(id), opacity: hidden ? 0.4 : 1 }}
                    />
                  }
                />
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
