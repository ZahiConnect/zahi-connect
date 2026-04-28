import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, MapPin } from "lucide-react";

const SEARCH_LIMIT = 6;
const DEBOUNCE_MS = 350;

const cleanText = (value) => String(value || "").trim();

const buildNominatimSuggestion = (result) => {
  const address = result?.address || {};
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
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
    id: `nominatim-${result?.place_id || result?.osm_id}-${latitude}-${longitude}`,
    label: cleanText(result?.display_name),
    shortLabel: shortParts.length
      ? shortParts.slice(0, 3).join(", ")
      : cleanText(result?.display_name),
    latitude,
    longitude,
  };
};

const buildPhotonSuggestion = (feature) => {
  const properties = feature?.properties || {};
  const [longitude, latitude] = feature?.geometry?.coordinates || [];
  const labelParts = [
    properties.name,
    properties.street,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ].filter(Boolean);
  const shortParts = [
    properties.name,
    properties.city || properties.county,
    properties.state,
  ].filter(Boolean);

  return {
    id: `photon-${properties.osm_id || labelParts.join("-")}-${latitude}-${longitude}`,
    label: [...new Set(labelParts)].join(", "),
    shortLabel: [...new Set(shortParts)].join(", ") || [...new Set(labelParts)].join(", "),
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
};

const dedupeSuggestions = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.label || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
      return false;
    }
    const key = `${item.label.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const PlaceAutocompleteInput = ({
  value = "",
  onChange,
  onSelect,
  placeholder = "Search a place",
  className = "",
  disabled = false,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const suppressNextSearchRef = useRef(false);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setSearching(false);
      setOpen(false);
      return undefined;
    }

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return undefined;
    }

    const searchText = query.trim();
    if (searchText.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        let nextSuggestions = [];

        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&dedupe=1&limit=${SEARCH_LIMIT}&q=${encodeURIComponent(
            searchText
          )}`,
          { signal: controller.signal }
        );
        if (nominatimResponse.ok) {
          const payload = await nominatimResponse.json();
          nextSuggestions = Array.isArray(payload) ? payload.map(buildNominatimSuggestion) : [];
        }

        if (!nextSuggestions.length) {
          const photonResponse = await fetch(
            `https://photon.komoot.io/api/?limit=${SEARCH_LIMIT}&lang=en&q=${encodeURIComponent(
              searchText
            )}`,
            { signal: controller.signal }
          );
          const photonPayload = await photonResponse.json();
          nextSuggestions = Array.isArray(photonPayload?.features)
            ? photonPayload.features.map(buildPhotonSuggestion)
            : [];
        }

        const deduped = dedupeSuggestions(nextSuggestions);
        setSuggestions(deduped);
        setOpen(deduped.length > 0);
        setHighlightIndex(-1);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [disabled, query]);

  const pickSuggestion = (suggestion) => {
    suppressNextSearchRef.current = true;
    setQuery(suggestion.shortLabel);
    setSuggestions([]);
    setOpen(false);
    onChange?.(suggestion.shortLabel);
    onSelect?.(suggestion);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onChange?.(nextValue);
  };

  const handleKeyDown = (event) => {
    if (!open || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[highlightIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />

      {searching && !disabled ? (
        <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-500" />
      ) : (
        <MapPin className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-200" : "text-slate-300"}`} />
      )}

      <AnimatePresence>
        {open && suggestions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full z-[10000] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-zinc-900/15"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  pickSuggestion(suggestion);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                  index === highlightIndex ? "bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-zinc-900">
                    {suggestion.shortLabel}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">
                    {suggestion.label}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default PlaceAutocompleteInput;
