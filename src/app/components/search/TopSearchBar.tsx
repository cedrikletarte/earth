"use client";

import { useEffect, useRef, useState } from "react";
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  CircularProgress,
  InputAdornment,
  Fade,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import LocationOnIcon from "@mui/icons-material/LocationOn";

type SearchResult = {
  label: string;
  lon: number;
  lat: number;
  osm_type?: string;
  osm_id?: number;
  geojson?: any;
  extratags?: any;
  wikidata?: string;
  wikipedia?: string; // like "en:Montreal"
};
type HistoryItem = SearchResult & { ts: number };

export interface TopSearchBarProps {
  onSelectLocation: (lon: number, lat: number) => void;
  onSelectPlace?: (
    label: string,
    extras?: {
      geometry?: any | null;
      osmType?: string;
      osmId?: number;
      lon?: number;
      lat?: number;
      wikidataId?: string;
      wikipediaTag?: string;
    }
  ) => void;
}

export default function TopSearchBar({
  onSelectLocation,
  onSelectPlace,
}: TopSearchBarProps) {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [focused, setFocused] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("search-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      } catch (error) {
        console.warn("Failed to parse search history:", error);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("search-history", JSON.stringify(newHistory));
  };

  // Add item to history
  const addToHistory = (item: SearchResult) => {
    const historyItem: HistoryItem = { ...item, ts: Date.now() };
    const newHistory = [
      historyItem,
      ...history.filter((h) => h.label !== item.label),
    ].slice(0, 10);
    saveHistory(newHistory);
  };

  // Remove item from history
  const removeFromHistory = (label: string) => {
    const newHistory = history.filter((h) => h.label !== label);
    saveHistory(newHistory);
  };

  // Clear all history
  const clearHistory = () => {
    saveHistory([]);
  };

  // Search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    try {
      const base =
        process.env
          .NEXT_PUBLIC_NOMINATIM_BASE_URL; /*|| "https://nominatim.openstreetmap.org"*/
  const url = `${base}/search?format=json&limit=8&q=${encodeURIComponent(
        searchQuery
  )}&addressdetails=1&polygon_geojson=1&extratags=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const formatted: SearchResult[] = data.map((item: any) => ({
        label: item.display_name,
        lon: parseFloat(item.lon),
        lat: parseFloat(item.lat),
        osm_type: item.osm_type,
        osm_id: item.osm_id,
        geojson: item.geojson,
        extratags: item.extratags,
        wikidata: item.extratags?.wikidata,
        wikipedia: item.extratags?.wikipedia,
      }));

      setResults(formatted);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle item selection
  const handleItemSelect = (item: SearchResult) => {
    addToHistory(item);
    onSelectLocation(item.lon, item.lat);

    if (onSelectPlace) {
      onSelectPlace(item.label, {
        geometry: item.geojson,
        osmType: item.osm_type,
  osmId: item.osm_id,
  lon: item.lon,
  lat: item.lat,
  wikidataId: item.wikidata,
  wikipediaTag: item.wikipedia,
      });
    }

    setQuery("");
    setShowResults(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setFocused(false);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      // Additional check for focus events
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("focusin", handleFocusOut);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("focusin", handleFocusOut);
    };
  }, []);

  return (
    <Box
      ref={searchRef}
      sx={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 50,
        width: 320,
      }}
    >
      {/* Search Input */}
      <TextField
        ref={inputRef}
        fullWidth
        size="small"
        variant="outlined"
        placeholder="Search for places..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : null,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
            boxShadow: 2,
            borderRadius: 3,
            "&:hover": {
              boxShadow: 4,
            },
            "&.Mui-focused": {
              boxShadow: 6,
            },
          },
          // Make the input more compact vertically
          "& .MuiOutlinedInput-input": {
            py: 1, // reduce vertical padding
          },
        }}
      />

      {/* Results Dropdown */}
      <Fade in={focused} timeout={200}>
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflow: "hidden",
            zIndex: 1000,
            borderRadius: 3,
          }}
        >
          <Box sx={{ maxHeight: 400, overflowY: "auto", overflowX: "hidden" }}>
            {/* Search Results */}
            {query && results.length > 0 && (
              <>
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography
                    variant="overline"
                    color="textSecondary"
                    fontWeight="bold"
                  >
                    Search Results
                  </Typography>
                </Box>
                <List dense>
                  {results.map((result, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => handleItemSelect(result)}
                        sx={{
                          py: 1.5,
                          borderBottom:
                            index < results.length - 1 ? "1px solid" : "none",
                          borderColor: "divider",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <LocationOnIcon color="action" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              noWrap
                            >
                              {result.label.split(",")[0]}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              noWrap
                            >
                              {result.label
                                .split(",")
                                .slice(1)
                                .join(",")
                                .trim()}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* No Results */}
            {query && results.length === 0 && !loading && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <SearchIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  No places found
                </Typography>
              </Box>
            )}

            {/* History */}
            {!query && history.length > 0 && (
              <>
                {query && results.length > 0 && <Divider />}
                <Box
                  sx={{
                    p: 2,
                    pb: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="overline"
                    color="textSecondary"
                    fontWeight="bold"
                  >
                    Recent Searches
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={clearHistory}
                    sx={{
                      color: "text.secondary",
                      "&:hover": { color: "error.main" },
                    }}
                  >
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense>
                  {history.map((item, index) => (
                    <ListItem
                      key={index}
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(item.label);
                          }}
                          sx={{
                            opacity: 0,
                            transition: "opacity 0.2s",
                            color: "text.secondary",
                            "&:hover": { color: "error.main" },
                            ".MuiListItem-root:hover &": { opacity: 1 },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{
                        "&:hover .MuiIconButton-root": { opacity: 1 },
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleItemSelect(item)}
                        sx={{
                          py: 1.5,
                          borderBottom:
                            index < history.length - 1 ? "1px solid" : "none",
                          borderColor: "divider",
                          pr: 6, // Make room for delete button
                          minWidth: 0, // Allow shrinking
                          overflow: "hidden", // Prevent overflow
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <HistoryIcon color="action" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              noWrap
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.label.split(",")[0]}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              noWrap
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.label.split(",").slice(1).join(",").trim()}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Empty State */}
            {!query && history.length === 0 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <HistoryIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  No recent searches
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
