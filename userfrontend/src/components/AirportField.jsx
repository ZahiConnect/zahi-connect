import { useMemo, useState } from "react";

import {
  filterAirportSuggestions,
  formatAirportLabel,
} from "../lib/airportSuggestions";

const inputStyle = "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none text-gray-900 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all";

const AirportField = ({ label, icon: Icon, value, onChange, onSelect, onWarmup, suggestions, loading }) => {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(
    () => filterAirportSuggestions(suggestions, value, 8),
    [suggestions, value]
  );
  const showPanel = focused && (loading || matches.length > 0);

  return (
    <div className="relative">
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
        {Icon && <Icon className="text-sky-500" />}
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          onFocus={() => {
            setFocused(true);
            onWarmup?.();
          }}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
            const formatted = formatAirportLabel(value);
            if (formatted && formatted !== value) onChange(formatted);
          }}
          onChange={(event) => onChange(event.target.value)}
          placeholder="City or Airport Code"
          className={inputStyle}
        />
        {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-sky-900/10">
          {loading && matches.length === 0 ? (
            <div className="px-4 py-3 text-xs font-bold text-gray-400">Loading airport suggestions...</div>
          ) : (
            matches.map((airport) => (
              <button
                key={`${airport.code || airport.value}-${airport.value}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(airport.value);
                  setFocused(false);
                }}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-sky-50"
              >
                <span className="block text-sm font-extrabold text-gray-900">{airport.value}</span>
                <span className="mt-0.5 block truncate text-[11px] font-semibold text-gray-400">{airport.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AirportField;

