/**
 * PlaceAutocompleteInput — An inline place-search input with dropdown suggestions.
 *
 * Uses Nominatim (OpenStreetMap) + Photon (Komoot) as free geocoding providers,
 * the same sources already used by LocationPicker.jsx.
 *
 * The dropdown renders directly below the input so both pickup and drop
 * fields show suggestions in the same place.
 *
 * Props:
 *   value        — current string value
 *   onChange      — (newValue: string) => void
 *   placeholder   — input placeholder
 *   className     — classes for the wrapper <input>
 *   icon          — optional trailing React node
 */

import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiLoader } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";

const SEARCH_LIMIT = 5;
const DEBOUNCE_MS = 350;

/* ── helpers (same logic as LocationPicker) ──────────── */

const cleanText = (v) => String(v || "").trim();

const buildNominatimSuggestion = (result) => {
  const address = result?.address || {};
  const shortParts = [
    address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.village ||
      address.town ||
      address.city ||
      address.county,
    address.state_district || address.state,
    address.postcode,
  ].filter(Boolean);
  return {
    id: `${result?.place_id}-${result?.lat}-${result?.lon}`,
    label: cleanText(result?.display_name),
    shortLabel: shortParts.length ? shortParts.slice(0, 3).join(", ") : cleanText(result?.display_name),
    latitude: Number(result?.lat),
    longitude: Number(result?.lon),
  };
};

const buildPhotonSuggestion = (feature) => {
  const p = feature?.properties || {};
  const labelParts = [p.name, p.street, p.district, p.city, p.county, p.state, p.postcode, p.country].filter(Boolean);
  const shortParts = [p.name, p.city || p.county, p.state].filter(Boolean);
  return {
    id: `photon-${p.osm_id || labelParts.join(",")}-${feature?.geometry?.coordinates?.[1]}-${feature?.geometry?.coordinates?.[0]}`,
    label: [...new Set(labelParts)].join(", "),
    shortLabel: [...new Set(shortParts)].join(", ") || [...new Set(labelParts)].join(", "),
    latitude: Number(feature?.geometry?.coordinates?.[1]),
    longitude: Number(feature?.geometry?.coordinates?.[0]),
  };
};

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.label) return false;
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/* ── component ───────────────────────────────────────── */

const PlaceAutocompleteInput = ({
  value = "",
  onChange,
  onSelect,
  placeholder = "Search a place…",
  className = "",
  icon = null,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const suppressNextSearch = useRef(false);

  // Sync external value → internal query (only when not focused)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(value);
    }
  }, [value]);

  // Click outside → close dropdown
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (
        wrapperRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return undefined;
    }

    const text = query.trim();
    if (text.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        let nextSuggestions = [];

        try {
          const nRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&dedupe=1&limit=${SEARCH_LIMIT}&q=${encodeURIComponent(text)}`,
            { signal: controller.signal }
          );
          if (nRes.ok) {
            const nData = await nRes.json();
            nextSuggestions = Array.isArray(nData) ? nData.map(buildNominatimSuggestion) : [];
          }
        } catch (err) {
          if (err.name === "AbortError") throw err;
        }

        if (!nextSuggestions.length) {
          const pRes = await fetch(
            `https://photon.komoot.io/api/?limit=${SEARCH_LIMIT}&lang=en&q=${encodeURIComponent(text)}`,
            { signal: controller.signal }
          );
          const pData = await pRes.json();
          nextSuggestions = Array.isArray(pData?.features) ? pData.features.map(buildPhotonSuggestion) : [];
        }

        const dedupedSuggestions = dedupe(nextSuggestions);
        setSuggestions(dedupedSuggestions);
        if (dedupedSuggestions.length) {
          setOpen(true);
        }
        setHighlightIndex(-1);
      } catch (err) {
        if (err.name !== "AbortError") setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const pick = (suggestion) => {
    suppressNextSearch.current = true;
    setQuery(suggestion.shortLabel);
    setSuggestions([]);
    setOpen(false);
    onChange?.(suggestion.shortLabel);
    onSelect?.(suggestion);
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange?.(v);
  };

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      pick(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const dropdown =
    open && suggestions.length > 0
      ? (
        <AnimatePresence>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full z-[10000] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            {suggestions.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-b-0 ${
                  idx === highlightIndex ? "bg-orange-50" : "hover:bg-gray-50"
                }`}
              >
                <FiMapPin
                  className="text-orange-400 mt-0.5 shrink-0"
                  size={14}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {s.shortLabel}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {s.label}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Trailing icon or spinner */}
      {searching ? (
        <FiLoader
          className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 animate-spin"
          size={16}
        />
      ) : icon ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
          {icon}
        </span>
      ) : null}

      {dropdown}
    </div>
  );
};

export default PlaceAutocompleteInput;
