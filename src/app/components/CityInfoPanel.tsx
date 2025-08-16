"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import CloseIcon from "@mui/icons-material/Close";

export interface CityInfoPanelProps {
  open: boolean;
  onClose: () => void;
  placeLabel?: string; // raw label from search (e.g., "Montreal, Quebec, Canada")
}

type WikiSummary = {
  title: string;
  extract?: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
};

export default function CityInfoPanel({ open, onClose, placeLabel }: CityInfoPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WikiSummary | null>(null);

  const candidates = useMemo(() => {
    const q = (placeLabel || "").trim();
    if (!q) return [] as string[];
    const rawTokens = q.split(",").map((t) => t.trim()).filter(Boolean);
    // Drop tokens that look like postal codes or contain digits
    const tokens = rawTokens.filter((t) => !/[0-9]/.test(t));

    const provinces = new Set([
      // Canadian provinces/territories
      "Québec",
      "Quebec",
      "Ontario",
      "British Columbia",
      "Alberta",
      "Manitoba",
      "Saskatchewan",
      "New Brunswick",
      "Nova Scotia",
      "Prince Edward Island",
      "Newfoundland and Labrador",
      "Yukon",
      "Nunavut",
      "Northwest Territories",
      // Common country fallback
      "Canada",
      "United States",
      "USA",
    ]);

    const out: string[] = [];
    const push = (s?: string) => {
      if (!s) return;
      const v = s.trim();
      if (!v) return;
      if (!out.includes(v)) out.push(v);
    };

    const t0 = tokens[0];
    const t1 = tokens[1];
    const provinceToken = tokens.find((t) => provinces.has(t));
    const countryToken = tokens.find((t) => /Canada|United States|USA/i.test(t));

    // Most likely page titles first
    push(t0); // City
    push(t1); // Sometimes the second token is the actual city (e.g., Vaudreuil-Dorion)
    if (t0 && t1) push(`${t0}-${t1}`); // Hyphenated variant
    if (t0 && provinceToken) push(`${t0}, ${provinceToken}`); // City, Province
    if (t1 && provinceToken) push(`${t1}, ${provinceToken}`); // Second token with province
    if (t0 && countryToken) push(`${t0}, ${countryToken}`); // City, Country
    if (t1 && countryToken) push(`${t1}, ${countryToken}`);

    // As a last resort, the entire label
    push(q);

    return out;
  }, [placeLabel]);

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      if (!open || candidates.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setData(null);
  // Try REST summary for each candidate, with language fallback
      const langs = ["en" /*, "fr"*/];
      if (process.env.NODE_ENV !== "production") {
        // Helpful during development to see what we try
        console.debug("CityInfoPanel candidates:", candidates);
      }
  let disambigHint: { title?: string; lang?: string } | null = null;
      for (const title of candidates) {
        for (const lang of langs) {
          try {
            const res = await fetch(
              `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`
            );
            if (!res.ok) continue;
            const json = (await res.json()) as any;
            // Some error payloads also have ok status; check required fields
    const isDisambig = json?.type === "disambiguation" || /disambiguation/i.test(json?.description || "");
    if (json && (json.extract || json.description) && !isDisambig) {
              if (!cancelled) {
                setData({
                  title: json.title,
                  extract: json.extract,
                  description: json.description,
                  thumbnail: json.thumbnail,
                  content_urls: json.content_urls,
                });
                setLoading(false);
              }
              return;
    } else if (isDisambig) {
      // Save hint and continue to smarter search
      disambigHint = { title: json?.title, lang };
            }
          } catch {
            // ignore, try next
          }
        }
      }

      // Fallback: use action API with search generator to get first page with thumb+extract
      try {
        const langs2 = ["en", "fr"];
        // Build flexible search terms: candidates + tokens from label + disambig title hint
        const label = (placeLabel || "").trim();
        const tokens = label.split(",").map((t) => t.trim()).filter(Boolean);
        const t0 = tokens[0];
        const t1 = tokens[1];
        const searchTerms = Array.from(new Set([
          candidates[0],
          candidates[1],
          t0,
          t1,
          disambigHint?.title,
        ].filter(Boolean) as string[]));

        const provinces = ["Québec","Quebec","Ontario","British Columbia","Alberta","Manitoba","Saskatchewan","New Brunswick","Nova Scotia","Prince Edward Island","Newfoundland and Labrador","Yukon","Nunavut","Northwest Territories"]; 
        const provinceToken = tokens.find((t) => provinces.includes(t));
        const countryToken = tokens.find((t) => /Canada|United States|USA/i.test(t));

        // Scoring function for pages
        const scorePage = (p: any): number => {
          const title: string = p?.title || "";
          const extract: string = p?.extract || "";
          const lower = title.toLowerCase();
          const l0 = (t0 || "").toLowerCase();
          const l1 = (t1 || "").toLowerCase();
          let s = 0;
          if (l0 && lower === l0) s += 120; // exact city
          if (l1 && lower === l1) s += 110; // exact 2nd token
          if (l0 && lower.startsWith(l0)) s += 60;
          if (l1 && lower.startsWith(l1)) s += 55;
          if (l0 && l1 && lower.includes(l0) && lower.includes(l1)) s += 40; // contains both
          if (/-/.test(title)) s += 15; // hyphenated often better (e.g., Vaudreuil-Dorion)
          if (provinceToken && (title.includes(provinceToken) || extract.includes(provinceToken))) s += 20;
          if (/Québec|Quebec/i.test(extract)) s += 10;
          if (/\(disambiguation\)/i.test(title)) s -= 200;
          if (p?.pageprops?.disambiguation !== undefined) s -= 200;
          // prefer articles namespace (0)
          if (p?.ns === 0) s += 5;
          return s;
        };

        for (const lang of langs2) {
          for (const term of searchTerms) {
            const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
              term
            )}&gsrlimit=10&prop=pageimages|extracts|pageprops&exintro=1&explaintext=1&pithumbsize=800&format=json&origin=*`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = (await res.json()) as any;
            const pagesObj = json?.query?.pages || {};
            const pages = Object.values(pagesObj) as any[];
            const articlePages = pages.filter((p) => p?.ns === 0);
            if (articlePages.length === 0) continue;
            articlePages.sort((a, b) => scorePage(b) - scorePage(a));
            const best = articlePages[0];
            if (best) {
              if (!cancelled) {
                setData({
                  title: best.title,
                  extract: best.extract,
                  thumbnail: best.thumbnail
                    ? { source: best.thumbnail.source, width: best.thumbnail.width, height: best.thumbnail.height }
                    : undefined,
                  content_urls: {
                    desktop: { page: `https://${lang}.wikipedia.org/?curid=${best.pageid}` },
                  },
                });
                setLoading(false);
              }
              return;
            }
          }
        }
        if (!cancelled) {
          setError("Aucun résumé trouvé pour cette ville.");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setError("Erreur lors de la récupération du résumé.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [open, candidates]);

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
      disableEscapeKeyDown
      hideBackdrop
      disableEnforceFocus
      disableScrollLock
      disableAutoFocus
      disableRestoreFocus
      sx={{ pointerEvents: 'none' }}
      PaperProps={{
        sx: {
          pointerEvents: 'auto',
          position: 'fixed',
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          m: 0,
          width: { xs: '92vw', sm: 420 },
          maxHeight: '85vh',
          boxSizing: 'border-box',
          borderRadius: 2,
          overflow: 'hidden',
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }} noWrap>
            {data?.title || placeLabel || 'Détails'}
          </Typography>
          <IconButton aria-label="Fermer" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="text.secondary">{error}</Typography>
        ) : data ? (
          <Box sx={{ overflow: 'auto' }}>
            {data.thumbnail?.source && (
              <Box
                component="img"
                src={data.thumbnail.source}
                alt={data.title}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  mb: 2,
                  boxShadow: 1,
                }}
              />
            )}
            {data.description && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {data.description}
              </Typography>
            )}
            {data.extract && (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
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
