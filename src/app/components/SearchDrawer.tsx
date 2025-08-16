"use client";

import { useEffect, useRef, useState } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

type SearchResult = {
  label: string;
  lon: number;
  lat: number;
  // From Nominatim
  osm_type?: string; // 'node' | 'way' | 'relation'
  osm_id?: number;
  geojson?: any; // boundary geometry when polygon_geojson=1
};
type HistoryItem = SearchResult & { ts: number };

export interface SearchDrawerProps {
  onSelectLocation: (lon: number, lat: number) => void;
  onSelectPlace?: (
    label: string,
    extras?: { geometry?: any | null; osmType?: string; osmId?: number }
  ) => void; // optional callback to open info panel + boundary geometry
}

export default function SearchDrawer({ onSelectLocation, onSelectPlace }: SearchDrawerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Helpers for localStorage persistence
  const HISTORY_KEY = "searchDrawer.history.v1";
  const MAX_HISTORY = 15;

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [] as HistoryItem[];
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (!Array.isArray(parsed)) return [] as HistoryItem[];
      return parsed.filter(
        (h) => typeof h?.label === "string" && Number.isFinite(h?.lon) && Number.isFinite(h?.lat)
      );
    } catch {
      return [] as HistoryItem[];
    }
  };

  const saveHistory = (items: HistoryItem[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    } catch {
      // ignore quota errors
    }
  };

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
  const keyOf = (x: {lon: number; lat: number}) => `${round6(x.lon)},${round6(x.lat)}`;

  const addToHistory = (item: SearchResult) => {
    setHistory((prev) => {
      const existing = new Map(prev.map((h) => [keyOf(h), h]));
      const k = keyOf(item);
      const nextItem: HistoryItem = { ...item, ts: Date.now() };
      existing.set(k, nextItem);
      const merged = Array.from(existing.values())
        .sort((a, b) => b.ts - a.ts)
        .slice(0, MAX_HISTORY);
      saveHistory(merged);
      return merged;
    });
  };

  const removeFromHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => keyOf(h) !== keyOf(item));
      saveHistory(filtered);
      return filtered;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const runSearch = async (searchQuery?: string) => {
    const queryToSearch = (searchQuery ?? query).trim();
    if (!queryToSearch) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      // Ask Nominatim for polygon geometry when available
      const base = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL;
      const url = `${base}/search?format=jsonv2&q=${encodeURIComponent(
        queryToSearch
      )}&limit=7&addressdetails=1&extratags=1&namedetails=1&polygon_geojson=1&polygon_threshold=0`;
      const resp = await fetch(url);
      const data = await resp.json();
      const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
        label: item.display_name as string,
        lon: parseFloat(item.lon),
        lat: parseFloat(item.lat),
        osm_type: item.osm_type as string | undefined,
        osm_id: typeof item.osm_id === 'number' ? (item.osm_id as number) : parseInt(item.osm_id, 10),
        geojson: item.geojson as any,
      } as SearchResult));
      setResults(mapped);
    } catch (e) {
      console.error("Nominatim geocoding error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Drawer handle (center-left) */}
      <IconButton
        aria-label={open ? "close search" : "open search"}
        onClick={() => setOpen(!open)}
        sx={{
          position: "fixed",
          top: "50%",
          left: open ? 360 : 0,
          transform: "translateY(-50%)",
          zIndex: (theme) => (theme as any).zIndex.drawer + 1,
          backgroundColor: "rgba(255,255,255,0.9)",
          boxShadow: 2,
          borderRadius: "0 8px 8px 0",
          width: 32,
          height: 64,
          "&:hover": { backgroundColor: "rgba(255,255,255,1)" },
          transition: (theme) =>
            `left ${(theme as any).transitions?.duration?.enteringScreen || 225}ms ${
              (theme as any).transitions?.easing?.easeOut || 'cubic-bezier(0.0, 0, 0.2, 1)'
            }`,
        }}
      >
        <Typography>
          {open ? <ArrowBackIosNewIcon fontSize="small" /> : <ArrowForwardIosIcon fontSize="small"/>}
        </Typography>
      </IconButton>

      {/* Left Drawer with search */}
      <Drawer 
        anchor="left" 
        open={open} 
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: 360,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ width: 360, p: 2 }} role="presentation">
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Research
            </Typography>
            <IconButton aria-label="close" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            placeholder="Research a location"
            value={query}
            onChange={(e) => {
              const newQuery = e.target.value;
              setQuery(newQuery);
              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }
              if (!newQuery.trim()) {
                setResults([]);
                return;
              }
              debounceTimeoutRef.current = setTimeout(() => {
                runSearch(newQuery);
              }, 300);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SearchIcon fontSize="small" />
                  )}
                </InputAdornment>
              ),
            }}
          />
          <Divider sx={{ my: 1 }} />
          <List
            dense
            disablePadding
            subheader={
              results.length > 0 ? (
                <ListSubheader component="div">Results</ListSubheader>
              ) : null
            }
          >
    {results.map((r, idx) => (
              <ListItemButton
                key={`${r.lon}-${r.lat}-${idx}`}
                onClick={() => {
                  onSelectLocation(r.lon, r.lat);
                  if (onSelectPlace)
                    onSelectPlace(r.label, {
                      geometry: r.geojson ?? null,
                      osmType: r.osm_type,
                      osmId: r.osm_id,
                    });
                  addToHistory(r);
                  setOpen(false);
                }}
              >
                <ListItemText primary={r.label} />
              </ListItemButton>
            ))}
            {!loading && results.length === 0 && query.trim() && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                No results found
              </Typography>
            )}
          </List>

          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon fontSize="small" />
              <Typography variant="subtitle2">History</Typography>
            </Stack>
            <Tooltip title="Clear history">
              <span>
                <IconButton size="small" onClick={clearHistory} disabled={history.length === 0}>
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1, pt: 0 }}>
              No visited places yet
            </Typography>
          ) : (
            <List dense disablePadding>
              {history.map((h, idx) => (
                <ListItem
                  key={`${h.lon}-${h.lat}-${h.ts}-${idx}`}
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Remove from history">
                      <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); removeFromHistory(h); }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
          <ListItemButton
                    onClick={() => {
                      onSelectLocation(h.lon, h.lat);
                      if (onSelectPlace)
                        onSelectPlace(h.label, {
                          geometry: (h as any).geojson ?? null,
                          osmType: (h as any).osm_type,
                          osmId: (h as any).osm_id,
                        });
                      // bump to top
                      addToHistory(h);
                      setOpen(false);
                    }}
                  >
                    <ListItemText primary={h.label} secondary={`${round6(h.lon)}, ${round6(h.lat)}`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>
    </>
  );
}
