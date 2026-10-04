import { useEffect, useState } from "react";
import { fetchEonetEvents, type EonetEvent } from "./eonet";

type Result = { days: number; events: EonetEvent[] } | { days: number; error: string };

/** Open EONET events for the last `days` days, fetched only while `enabled`. */
export function useEonetEvents(enabled: boolean, days: number) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchEonetEvents(days, controller.signal)
      .then((events) => setResult({ days, events }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn("Failed to load EONET events:", error);
        setResult({ days, error: "Could not load natural events." });
      });
    return () => controller.abort();
  }, [enabled, days]);

  // A result for another window is stale: we're waiting on the new one
  const current = result?.days === days ? result : null;
  return {
    events: current && "events" in current ? current.events : [],
    loading: enabled && !current,
    error: current && "error" in current ? current.error : null,
  };
}
