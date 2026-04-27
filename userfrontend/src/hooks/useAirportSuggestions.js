import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  OURAIRPORTS_CSV_URL,
  cacheAirportSuggestions,
  getCachedAirportSuggestions,
  mergeAirportSuggestions,
  parseOurAirportsCsv,
} from "../lib/airportSuggestions";

const useAirportSuggestions = (routeLabels = []) => {
  const [airportSuggestions, setAirportSuggestions] = useState(() => getCachedAirportSuggestions());
  const [loading, setLoading] = useState(false);
  const workerRef = useRef(null);

  const suggestions = useMemo(
    () => mergeAirportSuggestions(airportSuggestions, routeLabels),
    [airportSuggestions, routeLabels]
  );

  const warmup = useCallback(() => {
    if (airportSuggestions.length > 3 || loading || workerRef.current) return;

    const cached = getCachedAirportSuggestions();
    if (cached.length) {
      setAirportSuggestions(cached);
      return;
    }

    setLoading(true);

    if (typeof Worker !== "undefined") {
      const worker = new Worker(new URL("../workers/airportSuggestions.worker.js", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data?.type === "airports-loaded") {
          const next = event.data.suggestions || [];
          cacheAirportSuggestions(next);
          setAirportSuggestions(next);
        }
        setLoading(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setLoading(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage({ type: "load-airports" });
      return;
    }

    fetch(OURAIRPORTS_CSV_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Airport data could not be loaded.");
        return response.text();
      })
      .then((csv) => {
        const next = parseOurAirportsCsv(csv);
        cacheAirportSuggestions(next);
        setAirportSuggestions(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [airportSuggestions.length, loading]);

  useEffect(() => () => {
    if (workerRef.current) workerRef.current.terminate();
  }, []);

  return { suggestions, loading, warmup };
};

export default useAirportSuggestions;

