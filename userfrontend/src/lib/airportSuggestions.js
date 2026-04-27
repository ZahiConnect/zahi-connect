export const OURAIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
export const AIRPORT_SUGGESTIONS_CACHE_KEY = "zahi.customer.airportSuggestions.v1";
export const AIRPORT_SUGGESTIONS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

const AIRPORT_TYPES = new Set(["large_airport", "medium_airport", "small_airport", "seaplane_base"]);

export const REFERENCE_AIRPORTS = [
  {
    value: "DEL - New Delhi",
    label: "Indira Gandhi International Airport, IN, VIDP",
    code: "DEL",
  },
  {
    value: "BOM - Mumbai",
    label: "Chhatrapati Shivaji Maharaj International Airport, IN, VABB",
    code: "BOM",
  },
  {
    value: "DXB - Dubai",
    label: "Dubai International Airport, AE, OMDB",
    code: "DXB",
  },
];

export const cleanText = (value) => String(value || "").trim();

export const parseAirportCode = (value = "") => {
  const match = cleanText(value).toUpperCase().match(/\b[A-Z]{3}\b/);
  return match?.[0] || "";
};

export const formatAirportLabel = (value = "") => {
  const normalized = cleanText(value);
  if (!normalized) return "";
  if (normalized.includes(" - ")) return normalized;

  const code = parseAirportCode(normalized);
  const known = REFERENCE_AIRPORTS.find((airport) => airport.code === code);
  return known?.value || normalized;
};

export const parseCsvRows = (csvText = "") => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  return rows;
};

export const parseOurAirportsCsv = (csvText = "") => {
  const [headers = [], ...rows] = parseCsvRows(csvText);
  const index = Object.fromEntries(headers.map((header, idx) => [header, idx]));
  const seen = new Set();

  return rows
    .map((row) => {
      const iata = cleanText(row[index.iata_code]).toUpperCase();
      const icao = cleanText(row[index.icao_code]).toUpperCase();
      const type = cleanText(row[index.type]);
      if (!iata || seen.has(iata) || !AIRPORT_TYPES.has(type)) return null;
      seen.add(iata);

      const city = cleanText(row[index.municipality]);
      const name = cleanText(row[index.name]);
      const country = cleanText(row[index.iso_country]);
      const scheduled = cleanText(row[index.scheduled_service]).toLowerCase() === "yes";
      const value = `${iata} - ${city || name}`;
      const label = [name, country, icao].filter(Boolean).join(", ");

      return {
        value,
        label,
        code: iata,
        search: `${value} ${label}`.toLowerCase(),
        scheduled,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.scheduled !== right.scheduled) return left.scheduled ? -1 : 1;
      return left.value.localeCompare(right.value);
    });
};

export const getCachedAirportSuggestions = () => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(AIRPORT_SUGGESTIONS_CACHE_KEY) || "null");
    if (!cached?.storedAt || !Array.isArray(cached.data)) return [];
    if (Date.now() - cached.storedAt > AIRPORT_SUGGESTIONS_CACHE_MS) return [];
    return cached.data;
  } catch {
    return [];
  }
};

export const cacheAirportSuggestions = (suggestions) => {
  try {
    window.localStorage.setItem(
      AIRPORT_SUGGESTIONS_CACHE_KEY,
      JSON.stringify({ storedAt: Date.now(), data: suggestions })
    );
  } catch {
    // Ignore storage failures; suggestions still work for this session.
  }
};

export const mergeAirportSuggestions = (externalAirports = [], routeLabels = []) => {
  const map = new Map();
  const add = (item) => {
    const value = cleanText(item?.value || item);
    if (!value) return;
    const code = cleanText(item?.code || parseAirportCode(value)).toUpperCase();
    const key = (code || value).toUpperCase();
    if (map.has(key)) return;

    const label = cleanText(item?.label || value);
    map.set(key, {
      value: formatAirportLabel(value),
      label,
      code,
      search: `${value} ${label}`.toLowerCase(),
    });
  };

  REFERENCE_AIRPORTS.forEach(add);
  externalAirports.forEach(add);
  routeLabels.forEach(add);

  return [...map.values()];
};

export const filterAirportSuggestions = (suggestions = [], query = "", limit = 8) => {
  const trimmed = cleanText(query).toLowerCase();
  if (!trimmed) return suggestions.slice(0, limit);

  const code = parseAirportCode(trimmed);
  return suggestions
    .map((item) => {
      const search = item.search || `${item.value} ${item.label}`.toLowerCase();
      const itemCode = cleanText(item.code || parseAirportCode(item.value)).toUpperCase();
      let score = 0;

      if (code && itemCode === code) score += 100;
      if (item.value.toLowerCase().startsWith(trimmed)) score += 70;
      if (item.label.toLowerCase().startsWith(trimmed)) score += 45;
      if (search.includes(trimmed)) score += 20;
      if (item.scheduled) score += 4;

      return score > 0 ? { ...item, score } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
    .slice(0, limit);
};

