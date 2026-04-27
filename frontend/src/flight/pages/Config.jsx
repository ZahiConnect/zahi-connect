import { useState, useEffect, useMemo } from "react";
import { 
  FiPlus, FiTrash2, FiEdit3, FiX, FiRefreshCw, FiSearch, 
  FiChevronDown, FiCheck, FiUpload, FiEye, FiClock, FiMapPin
} from "react-icons/fi";
import { MdFlightTakeoff, MdOutlineEventSeat } from "react-icons/md";
import { HiOutlineInformationCircle } from "react-icons/hi2";
import dbs from "../api/db";
import { REFERENCE_AIRPORTS, formatAirportLabel, parseAirportCode } from "../lib/workspace";

const BRAND = "#037ffc";
const OURAIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const AIRPORT_SUGGESTIONS_CACHE_KEY = "zahi.flight.airportSuggestions.v1";
const AIRPORT_SUGGESTIONS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const AIRPORT_TYPES = new Set(["large_airport", "medium_airport", "small_airport", "seaplane_base"]);

const STATUSES = [
  { value: "Active",    label: "Active",    bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", dot: "bg-emerald-500" },
  { value: "Delayed",   label: "Delayed",   bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", dot: "bg-amber-500" },
  { value: "Cancelled", label: "Cancelled", bg: "bg-red-50", text: "text-red-600", border: "border-red-100", dot: "bg-red-500" },
];

const DAYS = [
  { val: 1, label: "M" }, { val: 2, label: "T" }, { val: 3, label: "W" },
  { val: 4, label: "T" }, { val: 5, label: "F" }, { val: 6, label: "S" }, { val: 7, label: "S" }
];

const Btn = ({ children, onClick, disabled, variant = "primary", className = "" }) => {
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-5 py-2.5 text-sm gap-2";
  if (variant === "primary") return <button onClick={onClick} disabled={disabled} className={`${base} text-white bg-[#037ffc] hover:bg-[#0269d4] shadow-sm hover:shadow ${className}`}>{children}</button>;
  if (variant === "ghost") return <button onClick={onClick} disabled={disabled} className={`${base} bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 ${className}`}>{children}</button>;
  if (variant === "outline") return <button onClick={onClick} disabled={disabled} className={`${base} bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 ${className}`}>{children}</button>;
};

const Input = ({ label, required, ...props }) => (
  <div className="space-y-1">
    {label && <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex gap-1">{label} {required && <span className="text-[#037ffc]">*</span>}</label>}
    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#037ffc] focus:ring-4 focus:ring-[#037ffc]/10 transition-all placeholder:text-slate-300" {...props} />
  </div>
);

const cleanText = (value) => String(value || "").trim();

const buildAirportValue = (airport) => `${airport.code} - ${airport.city}`;

const parseCsvRows = (csvText = "") => {
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

const parseOurAirportsCsv = (csvText = "") => {
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

      return {
        value: `${iata} - ${city || name}`,
        label: [name, country, icao].filter(Boolean).join(", "),
        code: iata,
        scheduled,
        type,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.scheduled !== right.scheduled) return left.scheduled ? -1 : 1;
      return left.value.localeCompare(right.value);
    });
};

const getCachedAirportSuggestions = () => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(AIRPORT_SUGGESTIONS_CACHE_KEY) || "null");
    if (!cached?.storedAt || !Array.isArray(cached.data)) return [];
    if (Date.now() - cached.storedAt > AIRPORT_SUGGESTIONS_CACHE_MS) return [];
    return cached.data;
  } catch {
    return [];
  }
};

const cacheAirportSuggestions = (suggestions) => {
  try {
    window.localStorage.setItem(
      AIRPORT_SUGGESTIONS_CACHE_KEY,
      JSON.stringify({ storedAt: Date.now(), data: suggestions })
    );
  } catch {
    // Local storage can fail in private windows or under quota pressure.
  }
};

const fetchAirportSuggestions = async () => {
  const cached = getCachedAirportSuggestions();
  if (cached.length) return cached;

  const response = await fetch(OURAIRPORTS_CSV_URL);
  if (!response.ok) throw new Error("Airport data could not be loaded.");
  const suggestions = parseOurAirportsCsv(await response.text());
  cacheAirportSuggestions(suggestions);
  return suggestions;
};

const buildLocationSuggestions = (flights = [], externalAirports = []) => {
  const suggestions = new Map();
  const addSuggestion = (value, meta = {}) => {
    const raw = cleanText(value);
    if (!raw) return;

    const code = cleanText(meta.code || parseAirportCode(raw)).toUpperCase();
    const city = cleanText(meta.city);
    const label = code && city ? `${code} - ${city}` : formatAirportLabel(raw);
    const key = (code || label).toUpperCase();

    if (!key || suggestions.has(key)) return;

    const detail = cleanText(
      meta.name && meta.country
        ? `${meta.name}, ${meta.country}`
        : meta.name || meta.country || raw
    );

    suggestions.set(key, {
      value: label,
      label: detail && detail !== label ? detail : label,
    });
  };

  REFERENCE_AIRPORTS.forEach((airport) => {
    addSuggestion(buildAirportValue(airport), airport);
  });

  externalAirports.forEach((airport) => {
    addSuggestion(airport.value, {
      code: airport.code,
      name: airport.label,
    });
  });

  flights.forEach((flight) => {
    addSuggestion(flight.from);
    addSuggestion(flight.to);
  });

  return [...suggestions.values()].sort((left, right) =>
    left.value.localeCompare(right.value)
  );
};

const LocationInput = ({ id, label, value, onChange, suggestions = [], ...props }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex gap-1">
      {label} {props.required && <span className="text-[#037ffc]">*</span>}
    </label>
    <input
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#037ffc] focus:ring-4 focus:ring-[#037ffc]/10 transition-all placeholder:text-slate-300"
      list={id}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        const formatted = formatAirportLabel(event.target.value);
        if (formatted && formatted !== event.target.value) {
          onChange({ target: { value: formatted } });
        }
      }}
      {...props}
    />
    <datalist id={id}>
      {suggestions.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </datalist>
  </div>
);

const ImgUpload = ({ url, onUpload, onClear }) => {
  const [busy, setBusy] = useState(false);
  const upload = async e => {
    if (!e.target.files[0]) return;
    setBusy(true);
    try {
      const res = await dbs.uploadImage(e.target.files[0]);
      onUpload(res.url);
    } catch { alert("Upload failed."); }
    setBusy(false);
  };
  return url ? (
    <div className="relative w-full h-32 rounded-2xl border border-slate-200 overflow-hidden group">
      <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Preview"/>
      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
        <button onClick={onClear} className="w-10 h-10 bg-white/20 hover:bg-white/40 flex items-center justify-center rounded-xl text-white transition"><FiTrash2 size={18} /></button>
      </div>
    </div>
  ) : (
    <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#037ffc]/50 bg-slate-50 cursor-pointer hover:bg-[#037ffc]/5 transition-all duration-300">
      <input type="file" accept="image/*" className="hidden" onChange={upload} />
      {busy ? <FiRefreshCw size={24} className="text-[#037ffc] animate-spin" /> : (
        <div className="flex flex-col items-center text-slate-400">
          <FiUpload size={24} className="mb-2" />
          <span className="text-xs font-medium">Browse image</span>
        </div>
      )}
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FARE CLASSES 
// ═══════════════════════════════════════════════════════════════════════════════

const FareClasses = ({ toast }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({ name: "", description: "" });
  const [modOpen, setModOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const res = await dbs.readCollection("flight_types", 100);
    setClasses(res.data || res || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const openMod = (c = null) => {
    setEditing(c);
    setF(c ? { ...c } : { name: "", description: "" });
    setModOpen(true);
  };

  const save = async () => {
    if (!f.name?.trim()) return;
    setSaving(true);
    try {
      const doc = { name: f.name.trim(), description: f.description || "", updatedAt: new Date().toISOString() };
      if (editing) await dbs.editDocument("flight_types", editing.id, doc);
      else await dbs.addAutoIdDocument("flight_types", { ...doc, createdAt: new Date().toISOString() });
      setModOpen(false);
      fetch();
      toast("Fare class saved.");
    } catch { toast("Failed to save.", "err"); }
    setSaving(false);
  };

  const del = async id => {
    await dbs.deleteDocument("flight_types", id);
    toast("Deleted.");
    fetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Define seating tiers and rules across all operating flights.</p>
        <Btn onClick={() => openMod()}><FiPlus size={16} /> New Class</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-10 flex justify-center"><FiRefreshCw size={24} className="animate-spin text-slate-300" /></div>
        ) : classes.map((c, i) => (
          <div key={c.id} className="group bg-white rounded-[24px] border border-slate-100 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-4px_rgba(3,127,252,0.08)] transition-all duration-300" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[#037ffc]/5 text-[#037ffc] flex items-center justify-center text-xl">
                <MdOutlineEventSeat />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openMod(c)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"><FiEdit3 size={15}/></button>
                <button onClick={() => del(c.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500"><FiTrash2 size={15}/></button>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{c.name}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{c.description || "No official description set."}</p>
          </div>
        ))}
      </div>

      {modOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <h3 className="text-2xl font-bold text-slate-800">{editing ? "Edit Class" : "New Fare Class"}</h3>
              <Input label="Class Identifier" placeholder="e.g. Premium Economy" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">In-flight Perks</label>
                <textarea className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#037ffc] focus:ring-4 focus:ring-[#037ffc]/10 transition-all placeholder:text-slate-300 resize-none h-24" placeholder="Standard cabin, one carry-on..." value={f.description} onChange={e => setF({...f, description: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="outline" className="flex-1" onClick={() => setModOpen(false)}>Cancel</Btn>
                <Btn className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Class"}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

const FlightModal = ({ open, existing, onClose, onSave, locationSuggestions = [] }) => {
  const [f, setF] = useState({
    flightNumber: "", from: "", to: "", departTime: "08:00", arriveTime: "10:00",
    durationMin: 120, daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    totalSeats: 180, economySeats: 150, businessSeats: 30, firstSeats: 0,
    economyPrice: 5000, businessPrice: 15000, firstPrice: 0,
    aircraftType: "Boeing 737", status: "Active", imageUrl: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF(existing ? { ...existing } : {
        flightNumber: "", from: "", to: "", departTime: "08:00", arriveTime: "10:00",
        durationMin: 120, daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        totalSeats: 180, economySeats: 150, businessSeats: 30, firstSeats: 0,
        economyPrice: 5000, businessPrice: 15000, firstPrice: 0,
        aircraftType: "Boeing 737", status: "Active", imageUrl: ""
      });
    }
  }, [open, existing]);

  if (!open) return null;

  const toggleDay = d => {
    setF(prev => {
      const days = prev.daysOfWeek || [];
      return {
        ...prev,
        daysOfWeek: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort()
      };
    });
  };

  const save = async () => {
    if (!f.flightNumber?.trim() || !f.from?.trim() || !f.to?.trim()) return;
    setSaving(true);
    try {
      const doc = {
        ...f,
        totalSeats: Number(f.totalSeats), economySeats: Number(f.economySeats), businessSeats: Number(f.businessSeats), firstSeats: Number(f.firstSeats),
        economyPrice: Number(f.economyPrice), businessPrice: Number(f.businessPrice), firstPrice: Number(f.firstPrice),
        durationMin: Number(f.durationMin), updatedAt: new Date().toISOString()
      };
      if (existing) await dbs.editDocument("flights", existing.id, doc);
      else await dbs.addAutoIdDocument("flights", { ...doc, createdAt: new Date().toISOString() });
      onSave();
    } catch { alert("Failed to save."); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-800">{existing ? "Edit Sequence" : "New Flight Route"}</h3>
            <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-full text-slate-500 transition"><FiX size={20}/></button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input label="Flight Number" value={f.flightNumber} onChange={e => setF({ ...f, flightNumber: e.target.value })} placeholder="AI-101" required />
              <LocationInput id="flight-origin-options" label="Origin" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} placeholder="BOM or Mumbai" suggestions={locationSuggestions} required />
              <LocationInput id="flight-destination-options" label="Destination" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} placeholder="DEL or New Delhi" suggestions={locationSuggestions} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input label="Departure" type="time" value={f.departTime} onChange={e => setF({ ...f, departTime: e.target.value })} />
              <Input label="Arrival" type="time" value={f.arriveTime} onChange={e => setF({ ...f, arriveTime: e.target.value })} />
              <Input label="Flight Time (min)" type="number" value={f.durationMin} onChange={e => setF({ ...f, durationMin: e.target.value })} />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">Operating Days</label>
              <div className="flex gap-2">
                {DAYS.map(d => {
                  const active = (f.daysOfWeek || []).includes(d.val);
                  return (
                    <button key={d.val} onClick={() => toggleDay(d.val)} className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-300 ${active ? "bg-[#037ffc] text-white shadow-md shadow-[#037ffc]/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
               <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4 block">Cabin Configuration</label>
               <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-800">Economy</p>
                    <Input label="Allocations" type="number" value={f.economySeats} onChange={e => setF({ ...f, economySeats: e.target.value })} />
                    <Input label="Base Fare" type="number" value={f.economyPrice} onChange={e => setF({ ...f, economyPrice: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-800">Business</p>
                    <Input label="Allocations" type="number" value={f.businessSeats} onChange={e => setF({ ...f, businessSeats: e.target.value })} />
                    <Input label="Base Fare" type="number" value={f.businessPrice} onChange={e => setF({ ...f, businessPrice: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-800">First Class</p>
                    <Input label="Allocations" type="number" value={f.firstSeats} onChange={e => setF({ ...f, firstSeats: e.target.value })} />
                    <Input label="Base Fare" type="number" value={f.firstPrice} onChange={e => setF({ ...f, firstPrice: e.target.value })} />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-5">
                <Input label="Aircraft Equipment" value={f.aircraftType} onChange={e => setF({ ...f, aircraftType: e.target.value })} placeholder="Boeing 737-MAX" />
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex gap-1">Route Status</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#037ffc] focus:ring-4 focus:ring-[#037ffc]/10 transition-all font-medium" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1 block">Aircraft Avatar</label>
                <ImgUpload url={f.imageUrl} onUpload={v => setF({ ...f, imageUrl: v })} onClear={() => setF({ ...f, imageUrl: "" })} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
          <Btn variant="outline" onClick={onClose}>Discard</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Publish Route"}</Btn>
        </div>
      </div>
    </div>
  );
};


const Schedule = ({ toast }) => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modOpen, setModOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [airportSuggestions, setAirportSuggestions] = useState([]);
  const locationSuggestions = useMemo(
    () => buildLocationSuggestions(flights, airportSuggestions),
    [airportSuggestions, flights]
  );

  const fetch = async () => {
    setLoading(true);
    const res = await dbs.readCollection("flights", 500);
    setFlights(res.data || res || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);
  useEffect(() => {
    let active = true;
    fetchAirportSuggestions()
      .then((suggestions) => {
        if (active) setAirportSuggestions(suggestions);
      })
      .catch(() => {
        if (active) setAirportSuggestions([]);
      });
    return () => { active = false; };
  }, []);

  const del = async id => {
    await dbs.deleteDocument("flights", id);
    toast("Flight suspended.");
    fetch();
  };

  const openMod = (f = null) => {
    setEditing(f);
    setModOpen(true);
  };

  const filtered = flights.filter(f => 
    (f.flightNumber||"").toLowerCase().includes(search.toLowerCase()) || 
    (f.from||"").toLowerCase().includes(search.toLowerCase()) || 
    (f.to||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search network..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#037ffc] transition-all shadow-sm" />
        </div>
        <Btn onClick={() => { setEditing(null); setModOpen(true); }}><FiPlus size={18} /> Add Route</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><FiRefreshCw size={24} className="animate-spin text-slate-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm">
            <MdFlightTakeoff size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-lg font-bold text-slate-800">Network Empty</p>
            <p className="text-sm text-slate-500 mt-1">Deploy your first scheduled route to begin carrying passengers.</p>
          </div>
        ) : (
          filtered.map((f, i) => {
            const stat = STATUSES.find(s => s.value === f.status) || STATUSES[0];
            return (
              <div key={f.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                      {f.imageUrl ? <img src={f.imageUrl} className="w-full h-full object-cover"/> : <MdFlightTakeoff size={24} className="text-[#037ffc]"/>}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{f.flightNumber}</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{f.aircraftType || "Equipment unassigned"}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.bg} ${stat.text} ${stat.border} border`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`}/> {stat.label}
                  </span>
                </div>

                <div className="flex items-center justify-between px-2 mb-6">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-400 mb-1">Departure</p>
                    <p className="text-2xl font-bold text-slate-800">{f.departTime}</p>
                    <p className="text-xs font-bold text-[#037ffc] bg-[#037ffc]/10 px-2 py-1 rounded-md mt-1 inline-block">{f.from}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center px-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{Math.floor(f.durationMin/60)}h {f.durationMin%60}m</p>
                    <div className="w-full h-[2px] bg-slate-100 relative rounded-full">
                      <MdFlightTakeoff className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-400 mb-1">Arrival</p>
                    <p className="text-2xl font-bold text-slate-800">{f.arriveTime}</p>
                    <p className="text-xs font-bold text-[#037ffc] bg-[#037ffc]/10 px-2 py-1 rounded-md mt-1 inline-block">{f.to}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex gap-1">
                    {DAYS.map(d => (
                      <span key={d.val} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${(f.daysOfWeek||[]).includes(d.val) ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-300"}`}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openMod(f)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"><FiEdit3 size={16}/></button>
                    <button onClick={() => del(f.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><FiTrash2 size={16}/></button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <FlightModal open={modOpen} existing={editing} locationSuggestions={locationSuggestions} onClose={() => setModOpen(false)} onSave={() => { setModOpen(false); fetch(); toast("Schedule updated."); }} />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Config() {
  const [tab, setTab] = useState("flights");
  const [toastMsg, setToastMsg] = useState(null);

  const fire = msg => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Network Planning</h1>
        <p className="text-slate-500">Coordinate active corridors, assign equipment, and structure fare rules.</p>
        
        <div className="flex gap-2 mt-8 bg-slate-100/50 p-1 rounded-2xl w-fit">
          {[
            { id: "flights", label: "Operations Schedule" },
            { id: "classes", label: "Cabin Classes" }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {tab === "flights" && <Schedule toast={fire} />}
        {tab === "classes" && <FareClasses toast={fire} />}
      </div>

      {toastMsg && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/20 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><FiCheck size={14}/></div>
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
