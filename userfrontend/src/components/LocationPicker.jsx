import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMapPin, FiNavigation, FiSearch, FiX } from "react-icons/fi";

import useCustomerLocation from "../hooks/useCustomerLocation";

const SEARCH_LIMIT = 5;
const PANEL_WIDTH = 420;
const PANEL_MARGIN = 16;

const cleanText = (value) => String(value || "").trim();

const buildPlaceSuggestion = (result) => {
  const address = result?.address || {};
  const latitude = Number.parseFloat(result?.lat);
  const longitude = Number.parseFloat(result?.lon);
  const label = cleanText(result?.display_name);
  const shortLabel = [
    address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.village ||
      address.town ||
      address.city ||
      address.county,
    address.state,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: `${result?.place_id || label}-${result?.lat}-${result?.lon}`,
    label,
    shortLabel: cleanText(shortLabel) || label,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
};

const buildPhotonSuggestion = (feature) => {
  const [longitude, latitude] = feature?.geometry?.coordinates || [];
  const properties = feature?.properties || {};
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
  const label = [...new Set(labelParts)].join(", ");
  const shortLabel = [...new Set(shortParts)].join(", ");

  return {
    id: `photon-${properties.osm_id || label}-${latitude}-${longitude}`,
    label,
    shortLabel: shortLabel || label,
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
  };
};

const dedupeSuggestions = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.label || item.latitude === null || item.longitude === null) return false;
    const key = `${item.label.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const LocationPicker = ({
  compact = false,
  tone = "orange",
  className = "",
  placeholder = "Type a place and pick a suggestion",
}) => {
  const {
    coordinates,
    locationLabel,
    requestLocation,
    setManualLocation,
    status,
  } = useCustomerLocation(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const toneClasses = useMemo(() => {
    if (tone === "indigo") {
      return {
        button: "text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100",
        icon: "text-indigo-500",
        ring: "focus-within:border-indigo-500 focus-within:ring-indigo-500/10",
      };
    }
    if (tone === "sky") {
      return {
        button: "text-sky-700 bg-sky-50 border-sky-100 hover:bg-sky-100",
        icon: "text-sky-500",
        ring: "focus-within:border-sky-500 focus-within:ring-sky-500/10",
      };
    }
    return {
      button: "text-orange-700 bg-orange-50 border-orange-100 hover:bg-orange-100",
      icon: "text-orange-500",
      ring: "focus-within:border-orange-500 focus-within:ring-orange-500/10",
    };
  }, [tone]);

  useEffect(() => {
    const searchText = query.trim();
    if (!open || searchText.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&dedupe=1&limit=${SEARCH_LIMIT}&q=${encodeURIComponent(
            searchText
          )}`,
          { signal: controller.signal }
        );
        const nominatimPayload = await nominatimResponse.json();
        const nominatimSuggestions = Array.isArray(nominatimPayload)
          ? nominatimPayload.map(buildPlaceSuggestion)
          : [];

        if (nominatimSuggestions.length > 0) {
          setSuggestions(dedupeSuggestions(nominatimSuggestions));
          return;
        }

        const photonResponse = await fetch(
          `https://photon.komoot.io/api/?limit=${SEARCH_LIMIT}&lang=en&q=${encodeURIComponent(
            searchText
          )}`,
          { signal: controller.signal }
        );
        const photonPayload = await photonResponse.json();
        const photonSuggestions = Array.isArray(photonPayload?.features)
          ? photonPayload.features.map(buildPhotonSuggestion)
          : [];
        setSuggestions(dedupeSuggestions(photonSuggestions));
      } catch (error) {
        if (error.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePanelPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
      const left = Math.min(
        Math.max(PANEL_MARGIN, rect.left),
        window.innerWidth - width - PANEL_MARGIN
      );
      const belowTop = rect.bottom + 12;
      const availableBelow = window.innerHeight - belowTop - PANEL_MARGIN;
      const availableAbove = rect.top - PANEL_MARGIN - 12;
      const shouldOpenAbove = availableBelow < 260 && availableAbove > availableBelow;
      const maxHeight = Math.min(
        420,
        Math.max(260, shouldOpenAbove ? availableAbove : availableBelow)
      );
      const top = shouldOpenAbove
        ? Math.max(PANEL_MARGIN, rect.top - maxHeight - 12)
        : belowTop;

      setPanelStyle({
        left,
        top,
        width,
        maxHeight,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  const selectSuggestion = (suggestion) => {
    if (setManualLocation(suggestion)) {
      setQuery("");
      setSuggestions([]);
      setOpen(false);
    }
  };

  const useCurrentLocation = () => {
    requestLocation();
    setOpen(false);
  };

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="fixed z-[9999] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl shadow-gray-900/20"
    >
      <div
        className={`flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 focus-within:ring-4 ${toneClasses.ring}`}
      >
        <FiSearch className="text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          autoFocus
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          aria-label="Close location search"
        >
          <FiX />
        </button>
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${toneClasses.button}`}>
          <FiNavigation className={toneClasses.icon} />
        </span>
        Use my current location
      </button>

      {searching ? (
        <p className="px-3 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Finding places...
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-gray-100">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.id}
              onClick={() => selectSuggestion(suggestion)}
              className="block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0"
            >
              <span className="block text-sm font-bold text-gray-900 line-clamp-1">
                {suggestion.shortLabel}
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500 line-clamp-2">
                {suggestion.label}
              </span>
            </button>
          ))}
        </div>
      ) : query.trim().length >= 3 && !searching ? (
        <p className="px-3 py-3 text-sm font-medium text-gray-500">
          No matching places found.
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {coordinates && locationLabel ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            title={locationLabel}
            className={`inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${toneClasses.button}`}
          >
            <FiMapPin className={`${toneClasses.icon} shrink-0`} />
            <span className="truncate">
              Near <span className="font-bold text-gray-900">{locationLabel}</span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${toneClasses.button}`}
          >
            <FiMapPin className={toneClasses.icon} />
            Set location
          </button>
        )}

        {!compact ? (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={status === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiNavigation className={status === "loading" ? "animate-pulse" : ""} />
            {status === "loading" ? "Updating..." : "Use current"}
          </button>
        ) : null}
      </div>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
};

export default LocationPicker;
