import { useEffect, useMemo, useState } from "react";

export type WikiSummary = {
  title: string;
  extract?: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
};

const PROVINCES = new Set([
  "Québec", "Quebec", "Ontario", "British Columbia", "Alberta", "Manitoba",
  "Saskatchewan", "New Brunswick", "Nova Scotia", "Prince Edward Island",
  "Newfoundland and Labrador", "Yukon", "Nunavut", "Northwest Territories",
  "Canada", "United States", "USA",
]);

interface Params {
  open: boolean;
  placeLabel?: string;
  lon?: number;
  lat?: number;
  wikidataId?: string;
  wikipediaTag?: string;
}

async function fetchRestSummary(lang: string, title: string): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const isDisambig =
    json?.type === "disambiguation" ||
    /disambiguation/i.test(json?.description || "");
  if (!json || isDisambig || !(json.extract || json.description)) return null;
  return {
    title: json.title,
    extract: json.extract,
    description: json.description,
    thumbnail: json.thumbnail,
    content_urls: json.content_urls,
  };
}

function buildCandidates(placeLabel: string): string[] {
  const q = placeLabel.trim();
  if (!q) return [];
  const tokens = q.split(",").map((t) => t.trim()).filter((t) => !/[0-9]/.test(t) && t);
  const out: string[] = [];
  const push = (s?: string) => {
    const v = s?.trim();
    if (v && !out.includes(v)) out.push(v);
  };
  const [t0, t1] = tokens;
  const provinceToken = tokens.find((t) => PROVINCES.has(t));
  const countryToken = tokens.find((t) => /Canada|United States|USA/i.test(t));
  push(t0);
  push(t1);
  if (t0 && t1) push(`${t0}-${t1}`);
  if (t0 && provinceToken) push(`${t0}, ${provinceToken}`);
  if (t1 && provinceToken) push(`${t1}, ${provinceToken}`);
  if (t0 && countryToken) push(`${t0}, ${countryToken}`);
  if (t1 && countryToken) push(`${t1}, ${countryToken}`);
  push(q);
  return out;
}

function buildLangOrder(wikipediaTag?: string): string[] {
  const tagLang = (wikipediaTag || "").match(/^([a-z-]+):/i)?.[1]?.toLowerCase();
  const browserLangs = navigator.languages
    ? navigator.languages.map((l) => l.split("-")[0].toLowerCase())
    : navigator.language
    ? [navigator.language.split("-")[0].toLowerCase()]
    : [];
  return Array.from(new Set(["en", "fr", tagLang, ...browserLangs].filter(Boolean) as string[]));
}

export function useWikipediaInfo({ open, placeLabel, lon, lat, wikidataId, wikipediaTag }: Params) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WikiSummary | null>(null);

  const candidates = useMemo(() => buildCandidates(placeLabel || ""), [placeLabel]);

  useEffect(() => {
    if (!open || candidates.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const langs = buildLangOrder(wikipediaTag);

    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      // 1) Wikidata sitelinks
      if (wikidataId) {
        try {
          const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wikidataId)}&props=sitelinks|labels&format=json&origin=*`;
          const res = await fetch(url);
          if (res.ok) {
            const wd = (await res.json()) as any;
            const sitelinks = wd?.entities?.[wikidataId]?.sitelinks || {};
            for (const lang of langs) {
              const title = sitelinks[`${lang}wiki`]?.title as string | undefined;
              if (!title) continue;
              const summary = await fetchRestSummary(lang, title);
              if (summary) {
                if (!cancelled) { setData(summary); setLoading(false); }
                return;
              }
            }
          }
        } catch { /* continue */ }
      }

      // 2) Direct wikipedia tag (e.g., "en:Montreal")
      if (wikipediaTag) {
        const [lang, ...rest] = wikipediaTag.split(":");
        const title = rest.join(":");
        if (lang && title) {
          try {
            const summary = await fetchRestSummary(lang, title);
            if (summary) {
              if (!cancelled) { setData(summary); setLoading(false); }
              return;
            }
          } catch { /* continue */ }
        }
      }

      // 3) Coordinate-based GeoSearch
      if (typeof lon === "number" && typeof lat === "number") {
        try {
          for (const lang of langs) {
            const listUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${encodeURIComponent(`${lat}|${lon}`)}&gsradius=20000&gslimit=20&format=json&origin=*`;
            const listRes = await fetch(listUrl);
            if (!listRes.ok) continue;
            const pageIds: number[] = ((await listRes.json()) as any)?.query?.geosearch?.map((i: any) => i.pageid).filter(Boolean) || [];
            if (!pageIds.length) continue;

            const pagesUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&pageids=${pageIds.slice(0, 10).join("|")}&prop=pageimages|extracts|pageprops|info&inprop=url&exintro=1&explaintext=1&pithumbsize=800&format=json&origin=*`;
            const pagesRes = await fetch(pagesUrl);
            if (!pagesRes.ok) continue;
            const pages = Object.values(((await pagesRes.json()) as any)?.query?.pages || {}) as any[];
            const pick = pages.find((p) => p?.ns === 0 && !p?.pageprops?.disambiguation) || pages[0];
            if (pick) {
              if (!cancelled) {
                setData({
                  title: pick.title,
                  extract: pick.extract,
                  thumbnail: pick.thumbnail ? { source: pick.thumbnail.source, width: pick.thumbnail.width, height: pick.thumbnail.height } : undefined,
                  content_urls: pick.fullurl ? { desktop: { page: pick.fullurl } } : undefined,
                });
                setLoading(false);
              }
              return;
            }
          }
        } catch { /* continue */ }
      }

      // 4) Text-based: REST summary for each candidate
      let disambigHint: { title?: string; lang?: string } | null = null;
      for (const title of candidates) {
        for (const lang of langs) {
          try {
            const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
            if (!res.ok) continue;
            const json = (await res.json()) as any;
            const isDisambig = json?.type === "disambiguation" || /disambiguation/i.test(json?.description || "");
            if (json && (json.extract || json.description) && !isDisambig) {
              if (!cancelled) {
                setData({ title: json.title, extract: json.extract, description: json.description, thumbnail: json.thumbnail, content_urls: json.content_urls });
                setLoading(false);
              }
              return;
            } else if (isDisambig) {
              disambigHint = { title: json?.title, lang };
            }
          } catch { /* continue */ }
        }
      }

      // 5) Search API fallback with scoring
      try {
        const tokens = (placeLabel || "").split(",").map((t) => t.trim()).filter(Boolean);
        const [t0, t1] = tokens;
        const provinceToken = tokens.find((t) => PROVINCES.has(t));
        const searchTerms = Array.from(new Set([candidates[0], candidates[1], t0, t1, disambigHint?.title].filter(Boolean) as string[]));

        const scorePage = (p: any): number => {
          const title: string = p?.title || "";
          const extract: string = p?.extract || "";
          const lower = title.toLowerCase();
          let s = 0;
          if (t0 && lower === t0.toLowerCase()) s += 120;
          if (t1 && lower === t1.toLowerCase()) s += 110;
          if (t0 && lower.startsWith(t0.toLowerCase())) s += 60;
          if (t1 && lower.startsWith(t1.toLowerCase())) s += 55;
          if (t0 && t1 && lower.includes(t0.toLowerCase()) && lower.includes(t1.toLowerCase())) s += 40;
          if (/-/.test(title)) s += 15;
          if (provinceToken && (title.includes(provinceToken) || extract.includes(provinceToken))) s += 20;
          if (/Québec|Quebec/i.test(extract)) s += 10;
          if (/\(disambiguation\)/i.test(title) || p?.pageprops?.disambiguation !== undefined) s -= 200;
          if (p?.ns === 0) s += 5;
          return s;
        };

        for (const lang of langs) {
          for (const term of searchTerms) {
            const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=10&prop=pageimages|extracts|pageprops&exintro=1&explaintext=1&pithumbsize=800&format=json&origin=*`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const pages = Object.values(((await res.json()) as any)?.query?.pages || {}) as any[];
            const articlePages = pages.filter((p) => p?.ns === 0).sort((a, b) => scorePage(b) - scorePage(a));
            const best = articlePages[0];
            if (best) {
              if (!cancelled) {
                setData({
                  title: best.title,
                  extract: best.extract,
                  thumbnail: best.thumbnail ? { source: best.thumbnail.source, width: best.thumbnail.width, height: best.thumbnail.height } : undefined,
                  content_urls: { desktop: { page: `https://${lang}.wikipedia.org/?curid=${best.pageid}` } },
                });
                setLoading(false);
              }
              return;
            }
          }
        }

        if (!cancelled) { setError("No summary found for this location."); setLoading(false); }
      } catch {
        if (!cancelled) { setError("Error retrieving summary."); setLoading(false); }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [open, candidates, lon, lat, wikidataId, wikipediaTag]);

  return { loading, error, data };
}
