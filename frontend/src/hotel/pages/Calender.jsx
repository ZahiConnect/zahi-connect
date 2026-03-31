import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Save, RefreshCw,
  CheckCircle, AlertTriangle, IndianRupee,
  Snowflake, Wind, Calendar, X, Edit3,
  Info, Zap, Layers, MousePointer2, Trash2,
} from "lucide-react";
import dbs from "../api/db";

// ─── Brand / constants ────────────────────────────────────────────────────────
const BRAND  = "#037ffc";
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const TYPE_COLORS = [
  { bg:"#eff6ff", border:"#bfdbfe", text:"#1d4ed8", pill:"#3b82f6" },
  { bg:"#f0fdf4", border:"#bbf7d0", text:"#15803d", pill:"#22c55e" },
  { bg:"#fdf4ff", border:"#e9d5ff", text:"#7e22ce", pill:"#a855f7" },
  { bg:"#fff7ed", border:"#fed7aa", text:"#c2410c", pill:"#f97316" },
  { bg:"#fefce8", border:"#fef08a", text:"#a16207", pill:"#eab308" },
  { bg:"#f0fdfa", border:"#99f6e4", text:"#0f766e", pill:"#14b8a6" },
];
const tc  = (i) => TYPE_COLORS[i % TYPE_COLORS.length];
const pad = (n) => String(n).padStart(2,"0");
const toKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const todayKey = () => {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
};
const isPast = (k) => k < todayKey();

// ─── Shared primitives ────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm "+
  "text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 "+
  "transition-all duration-200 placeholder:text-slate-300";

const Btn = ({ children, onClick, disabled, variant="primary", size="md", className="" }) => {
  const sz = { sm:"px-3 py-1.5 text-xs gap-1.5", md:"px-4 py-2.5 text-sm gap-2" }[size];
  const base = `inline-flex items-center justify-center rounded-xl font-medium transition-all
    duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sz} ${className}`;
  if (variant==="primary") return (
    <button onClick={onClick} disabled={disabled} className={`${base} text-white`}
      style={{ background: disabled ? "#a0c8fe" : BRAND }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background="#0269d4"; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.background=BRAND; }}>
      {children}
    </button>
  );
  if (variant==="danger") return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} border border-red-200 bg-red-50 text-red-500 hover:bg-red-100`}>
      {children}
    </button>
  );
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
      {children}
    </button>
  );
};

const FieldLabel = ({ children, required }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Toast = ({ msg, type }) => (
  <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3
    rounded-xl shadow-xl text-sm font-medium text-white`}
    style={{ background: type==="error" ? "#ef4444" : type==="warn" ? "#f59e0b" : "#0f172a",
             animation:"fadeSlideIn .25s ease" }}>
    {type==="error" ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}
    {msg}
  </div>
);

// ─── Price inputs for one type ────────────────────────────────────────────────
const TypePriceRow = ({ type, idx, ac, nonAc, onAc, onNonAc, defaultAc, defaultNonAc }) => {
  const c = tc(idx);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: c.border }}>
      <div className="px-3 py-2 flex items-center gap-2 justify-between" style={{ background: c.bg }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: c.pill }}/>
          <span className="text-xs font-bold" style={{ color: c.text }}>{type}</span>
        </div>
        {(defaultAc || defaultNonAc) && (
          <span className="text-[9px] text-slate-400">
            default ₹{defaultAc||"—"} / ₹{defaultNonAc||"—"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100 bg-white">
        {[
          { label:"AC", Icon:Snowflake, val:ac, set:onAc, ph:defaultAc, iconColor:c.pill },
          { label:"Non-AC", Icon:Wind, val:nonAc, set:onNonAc, ph:defaultNonAc, iconColor:"#94a3b8" },
        ].map(({ label, Icon, val, set, ph, iconColor }) => (
          <div key={label} className="p-3">
            <div className="flex items-center gap-1 mb-1.5">
              <Icon size={11} style={{ color: iconColor }}/>
              <span className="text-[10px] font-bold text-slate-500">{label}</span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
              <input type="number"
                className="w-full pl-6 pr-2 py-2 rounded-lg border border-slate-200 bg-slate-50
                  text-sm font-bold text-slate-800 outline-none focus:border-blue-400
                  focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                placeholder={ph ?? "—"}
                value={val ?? ""}
                onChange={e => set(e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-SELECT PANEL  (appears at bottom when dates are selected)
// ═══════════════════════════════════════════════════════════════════════════════
const MultiSelectPanel = ({ selectedDates, roomTypes, defaults, onApply, onClear, onClose }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = {};
    roomTypes.forEach(t => { init[t.name] = { ac:"", nonAc:"" }; });
    setForm(init);
  }, [selectedDates.length, roomTypes]);

  const apply = async () => {
    setSaving(true);
    await onApply(selectedDates, form);
    setSaving(false);
  };

  const setField = (name, field, val) =>
    setForm(f => ({ ...f, [name]: { ...f[name], [field]: val } }));

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden"
      style={{ boxShadow:"0 4px 24px -4px rgba(3,127,252,0.18)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
        style={{ background:"#f0f7ff" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: BRAND }}>
            <MousePointer2 size={13} color="#fff"/>
          </div>
          <span className="text-sm font-bold text-slate-800">
            {selectedDates.length} date{selectedDates.length!==1?"s":""} selected
          </span>
          {/* Date chips — show up to 6 */}
          <div className="flex gap-1 flex-wrap ml-1">
            {selectedDates.slice(0,6).map(d => (
              <span key={d} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:"#dbeafe", color:"#1d4ed8" }}>
                {new Date(d+"T00:00:00").toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}
              </span>
            ))}
            {selectedDates.length>6 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                +{selectedDates.length-6}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100">
            Clear selection
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition cursor-pointer">
            <X size={14}/>
          </button>
        </div>
      </div>

      {/* Price inputs in a horizontal grid */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Set prices for selected dates (blank = keep existing)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {roomTypes.map((t,i) => (
            <TypePriceRow key={t.name} type={t.name} idx={i}
              ac={form[t.name]?.ac} nonAc={form[t.name]?.nonAc}
              onAc={v=>setField(t.name,"ac",v)} onNonAc={v=>setField(t.name,"nonAc",v)}
              defaultAc={defaults[t.name]?.ac} defaultNonAc={defaults[t.name]?.nonAc}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info size={11} className="text-slate-300"/>
          Blank fields won't overwrite existing prices for those types.
        </p>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn size="sm" onClick={apply} disabled={saving}>
            {saving
              ? <><RefreshCw size={12} className="animate-spin"/> Saving…</>
              : <><Save size={12}/> Apply to {selectedDates.length} date{selectedDates.length!==1?"s":""}</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE DAY SIDE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const DayPanel = ({ dateKey, roomTypes, defaults, prices, onSave, onClose }) => {
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = {};
    roomTypes.forEach(t => {
      const ex  = prices[dateKey]?.[t.name];
      const def = defaults[t.name];
      init[t.name] = { ac: ex?.ac??def?.ac??"", nonAc: ex?.nonAc??def?.nonAc??"" };
    });
    setForm(init);
  }, [dateKey, roomTypes, defaults, prices]);

  const setField = (name,field,val) =>
    setForm(f => ({ ...f, [name]: { ...f[name], [field]:val } }));

  const submit = async () => {
    setSaving(true);
    const clean = {};
    Object.keys(form).forEach(k => {
      clean[k] = { ac: form[k].ac?Number(form[k].ac):null, nonAc: form[k].nonAc?Number(form[k].nonAc):null };
    });
    await onSave(dateKey, clean);
    setSaving(false);
  };

  const clearDay = async () => {
    if (!window.confirm("Clear all custom prices for this date?")) return;
    await onSave(dateKey, null);
  };

  const d     = new Date(dateKey+"T00:00:00");
  const label = d.toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden"
      style={{ boxShadow:"0 4px 24px -4px rgba(3,127,252,0.12)" }}>
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editing</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 leading-tight">{label}</p>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer mt-0.5">
          <X size={15}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {roomTypes.map((t,i) => (
          <TypePriceRow key={t.name} type={t.name} idx={i}
            ac={form[t.name]?.ac} nonAc={form[t.name]?.nonAc}
            onAc={v=>setField(t.name,"ac",v)} onNonAc={v=>setField(t.name,"nonAc",v)}
            defaultAc={defaults[t.name]?.ac} defaultNonAc={defaults[t.name]?.nonAc}
          />
        ))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 space-y-2">
        <Btn onClick={submit} disabled={saving} className="w-full">
          {saving ? <><RefreshCw size={13} className="animate-spin"/> Saving…</> : <><Save size={13}/> Save Prices</>}
        </Btn>
        {prices[dateKey] && (
          <button onClick={clearDay}
            className="w-full py-2 text-xs font-medium text-red-400 hover:text-red-600 transition cursor-pointer">
            Clear custom prices for this date
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK DATE-RANGE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const BulkModal = ({ isOpen, onClose, roomTypes, defaults, onApply }) => {
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate,   setToDate]   = useState(todayKey());
  const [form,     setForm]     = useState({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init = {};
      roomTypes.forEach(t => { init[t.name]={ ac:"", nonAc:"" }; });
      setForm(init); setFromDate(todayKey()); setToDate(todayKey());
    }
  }, [isOpen, roomTypes]);

  const setField = (name,field,val) =>
    setForm(f => ({ ...f, [name]: { ...f[name], [field]:val } }));

  const dates = (() => {
    const out=[]; let cur=new Date(fromDate); const end=new Date(toDate);
    while(cur<=end){
      const k=cur.toISOString().slice(0,10);
      if(!isPast(k)) out.push(k);
      cur.setDate(cur.getDate()+1);
    }
    return out;
  })();

  const apply = async () => {
    if(!dates.length) return;
    setApplying(true);
    await onApply(dates, form);
    setApplying(false); onClose();
  };

  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:"#e8f2ff", color:BRAND }}><Zap size={16}/></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Bulk Date Pricing</h2>
              <p className="text-[11px] text-slate-400">Apply prices across a date range</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer">
            <X size={16}/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>From Date</FieldLabel>
              <input type="date" className={inputCls} value={fromDate}
                min={todayKey()} onChange={e=>setFromDate(e.target.value)}/>
            </div>
            <div>
              <FieldLabel>To Date</FieldLabel>
              <input type="date" className={inputCls} value={toDate}
                min={fromDate} onChange={e=>setToDate(e.target.value)}/>
            </div>
          </div>

          {dates.length>0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Calendar size={13} style={{ color:BRAND }}/>
              <span className="text-xs font-semibold text-blue-700">{dates.length} date{dates.length!==1?"s":""} will be updated (past dates skipped)</span>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Prices per Room Type (blank = skip)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomTypes.map((t,i) => (
                <TypePriceRow key={t.name} type={t.name} idx={i}
                  ac={form[t.name]?.ac} nonAc={form[t.name]?.nonAc}
                  onAc={v=>setField(t.name,"ac",v)} onNonAc={v=>setField(t.name,"nonAc",v)}
                  defaultAc={defaults[t.name]?.ac} defaultNonAc={defaults[t.name]?.nonAc}
                />
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
            <Info size={13} className="text-amber-500 mt-0.5 shrink-0"/>
            <p className="text-[11px] text-amber-700">
              Blank fields won't overwrite existing prices. Past dates are automatically skipped.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/60">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={apply} disabled={applying||!dates.length}>
            {applying
              ? <><RefreshCw size={13} className="animate-spin"/> Applying…</>
              : <><Zap size={13}/> Apply to {dates.length} Date{dates.length!==1?"s":""}</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ═══════════════════════════════════════════════════════════════════════════════
const CalendarTab = ({ roomTypes, defaults, prices, setPrices, showToast }) => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Single selected date (for side panel)
  const [singleDate, setSingleDate] = useState(null);
  // Multi-selected dates
  const [multiDates, setMultiDates] = useState([]);
  const [multiMode,  setMultiMode]  = useState(false); // toggle select mode
  const [bulkOpen,   setBulkOpen]   = useState(false);

  const tk = todayKey();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if(month===0){ setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1);
    setSingleDate(null); setMultiDates([]);
  };
  const nextMonth = () => {
    if(month===11){ setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1);
    setSingleDate(null); setMultiDates([]);
  };

  // Toggle a date in multi-select
  const toggleMulti = (key) => {
    setMultiDates(prev =>
      prev.includes(key) ? prev.filter(d=>d!==key) : [...prev, key]
    );
  };

  const handleDayClick = (key) => {
    if(isPast(key)) return;
    if(multiMode){
      toggleMulti(key);
      setSingleDate(null);
    } else {
      setSingleDate(k => k===key ? null : key);
      setMultiDates([]);
    }
  };

  // ── Save single day ──
  const saveDayPrices = async (dateKey, form) => {
    try {
      if(form===null){
        await dbs.deleteDocument("pricing", dateKey);
        setPrices(p => { const n={...p}; delete n[dateKey]; return n; });
        showToast("Prices cleared for "+dateKey);
        setSingleDate(null); return;
      }
      const payload = { date: dateKey, prices: form };
      const ex = await dbs.readDocument("pricing", dateKey);
      if(ex) await dbs.editDocument("pricing", dateKey, payload);
      else    await dbs.addDocument("pricing", dateKey, payload);
      setPrices(p => ({ ...p, [dateKey]: form }));
      showToast("Prices saved");
    } catch { showToast("Save failed","error"); }
  };

  // ── Save multi / bulk ──
  const saveMultiPrices = async (dates, priceMap) => {
    try {
      await Promise.all(dates.map(async dateKey => {
        const clean = {};
        let hasVal = false;
        Object.keys(priceMap).forEach(typeName => {
          const ac    = priceMap[typeName]?.ac    ? Number(priceMap[typeName].ac)    : null;
          const nonAc = priceMap[typeName]?.nonAc ? Number(priceMap[typeName].nonAc) : null;
          if(ac!==null || nonAc!==null){ clean[typeName]={ ac, nonAc }; hasVal=true; }
        });
        if(!hasVal) return;
        const ex = await dbs.readDocument("pricing", dateKey);
        let finalPrices = clean;
        if(ex){
          const merged = { ...(ex.prices||{}) };
          Object.keys(clean).forEach(k => {
            merged[k] = { ...merged[k] };
            if(clean[k].ac!==null)    merged[k].ac    = clean[k].ac;
            if(clean[k].nonAc!==null) merged[k].nonAc = clean[k].nonAc;
          });
          finalPrices = merged;
        }
        const payload = { date: dateKey, prices: finalPrices };
        if(ex) await dbs.editDocument("pricing", dateKey, payload);
        else    await dbs.addDocument("pricing", dateKey, payload);
        setPrices(p => ({ ...p, [dateKey]: finalPrices }));
      }));
      showToast(`Prices applied to ${dates.length} date${dates.length!==1?"s":""}`);
      setMultiDates([]); setSingleDate(null);
    } catch { showToast("Apply failed","error"); }
  };

  const customisedInMonth = Object.keys(prices).filter(k => {
    const d = new Date(k+"T00:00:00");
    return d.getFullYear()===year && d.getMonth()===month;
  }).length;

  // Build cells
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div className="space-y-5">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600
              hover:bg-slate-50 transition cursor-pointer">
            <ChevronLeft size={16}/>
          </button>
          <button onClick={nextMonth}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600
              hover:bg-slate-50 transition cursor-pointer">
            <ChevronRight size={16}/>
          </button>
          <h2 className="text-lg font-bold text-slate-800">{MONTHS[month]} {year}</h2>
          <span className="text-xs text-slate-400">{customisedInMonth} day{customisedInMonth!==1?"s":""} customised</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-select toggle */}
          <button onClick={() => { setMultiMode(m=>!m); setMultiDates([]); setSingleDate(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold
              transition-all cursor-pointer
              ${multiMode
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <MousePointer2 size={13}/>
            {multiMode ? "Exit Multi-Select" : "Multi-Select"}
          </button>
          <Btn variant="ghost" size="sm" onClick={() => setBulkOpen(true)}>
            <Zap size={13}/> Bulk Range
          </Btn>
        </div>
      </div>

      {/* ── Room type legend ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {roomTypes.map((t,i) => {
          const c = tc(i);
          return (
            <div key={t.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{ background:c.bg, borderColor:c.border, color:c.text }}>
              <div className="w-2 h-2 rounded-full" style={{ background:c.pill }}/>
              {t.name}
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-slate-200"/>
          Default rate
        </div>
      </div>

      {/* ── Multi-select info banner ── */}
      {multiMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <MousePointer2 size={14} style={{ color:BRAND }}/>
          <p className="text-xs text-blue-700 font-medium">
            Click multiple dates to select them, then set prices for all at once below.
            {multiDates.length>0 && ` ${multiDates.length} selected.`}
          </p>
          {multiDates.length>0 && (
            <button onClick={() => setMultiDates([])}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 cursor-pointer">
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Calendar + Side panel ── */}
      <div className={`grid gap-5 ${singleDate ? "grid-cols-[1fr_300px]" : "grid-cols-1"}`}>
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((d,i) => {
              if(!d) return <div key={`e-${i}`} className="border-b border-r border-slate-50 min-h-[90px] bg-slate-50/30"/>;

              const key      = toKey(year, month, d);
              const past     = isPast(key);
              const custom   = prices[key];
              const isToday  = key===tk;
              const isSingle = key===singleDate;
              const isMulti  = multiDates.includes(key);

              // What prices to show on cell
              const cellPrices = roomTypes.slice(0,3).map((t,ti) => {
                const cp = custom?.[t.name];
                const dp = defaults[t.name];
                const ac    = cp?.ac    ?? dp?.ac;
                const nonAc = cp?.nonAc ?? dp?.nonAc;
                const isCustom = !!(cp?.ac || cp?.nonAc);
                return { name:t.name, ac, nonAc, isCustom, color:tc(ti) };
              });

              // Count how many types have custom overrides
              let customCount = 0;
              if(custom) roomTypes.forEach(t => { if(custom[t.name]?.ac||custom[t.name]?.nonAc) customCount++; });

              return (
                <div key={key}
                  onClick={() => handleDayClick(key)}
                  className={`border-b border-r border-slate-50 min-h-[90px] p-2 flex flex-col
                    transition-all duration-150 relative select-none
                    ${past
                      ? "bg-slate-50/40 cursor-not-allowed"
                      : isMulti
                        ? "bg-blue-50 cursor-pointer ring-2 ring-inset ring-blue-400"
                        : isSingle
                          ? "bg-blue-50 cursor-pointer ring-2 ring-inset ring-blue-500"
                          : "bg-white cursor-pointer hover:bg-slate-50/80"}`}>

                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-extrabold leading-none flex items-center justify-center
                      ${isToday ? "w-6 h-6 rounded-full text-xs text-white" : ""}
                      ${past ? "text-slate-300" : isSingle||isMulti ? "text-blue-700" : "text-slate-700"}`}
                      style={isToday ? { background:BRAND } : {}}>
                      {d}
                    </span>
                    {/* Custom count badge */}
                    {!past && customCount>0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background:"#e8f2ff", color:BRAND }}>
                        {customCount}/{roomTypes.length}
                      </span>
                    )}
                  </div>

                  {/* Price preview rows */}
                  {!past && (
                    <div className="mt-auto space-y-0.5">
                      {cellPrices.map(({ name, ac, color, isCustom }) => (
                        ac ? (
                          <div key={name} className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCustom ? "" : "opacity-40"}`}
                              style={{ background:color.pill }}/>
                            <span className={`text-[9px] font-bold truncate ${isCustom ? "text-slate-700" : "text-slate-400"}`}>
                              ₹{Number(ac).toLocaleString()}
                            </span>
                            {!isCustom && <span className="text-[8px] text-slate-300">def</span>}
                          </div>
                        ) : null
                      ))}
                      {roomTypes.length>3 && (
                        <span className="text-[8px] text-slate-300">+{roomTypes.length-3} more</span>
                      )}
                    </div>
                  )}

                  {/* Multi-select checkmark */}
                  {isMulti && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background:BRAND }}>
                      <CheckCircle size={10} color="#fff"/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel for single date */}
        {singleDate && !multiMode && (
          <div style={{ position:"sticky", top:"1.5rem", maxHeight:"calc(100vh - 8rem)" }}>
            <DayPanel
              dateKey={singleDate}
              roomTypes={roomTypes}
              defaults={defaults}
              prices={prices}
              onSave={saveDayPrices}
              onClose={() => setSingleDate(null)}
            />
          </div>
        )}
      </div>

      {/* ── Multi-select bottom panel ── */}
      {multiMode && multiDates.length>0 && (
        <MultiSelectPanel
          selectedDates={multiDates}
          roomTypes={roomTypes}
          defaults={defaults}
          onApply={saveMultiPrices}
          onClear={() => setMultiDates([])}
          onClose={() => { setMultiDates([]); setMultiMode(false); }}
        />
      )}

      {/* Bulk modal */}
      <BulkModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        roomTypes={roomTypes}
        defaults={defaults}
        onApply={saveMultiPrices}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
const DefaultsTab = ({ roomTypes, defaults, onSave }) => {
  const [form,   setForm]  = useState({});
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    const init = {};
    roomTypes.forEach(t => {
      init[t.name] = { ac: defaults[t.name]?.ac??"", nonAc: defaults[t.name]?.nonAc??"" };
    });
    setForm(init);
  }, [defaults, roomTypes]);

  const setField = (name,field,val) =>
    setForm(f => ({ ...f, [name]:{ ...f[name], [field]:val } }));

  const submit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Default Room Rates</h2>
        <p className="text-xs text-slate-400 mt-1">
          These rates are used on the calendar for any date that doesn't have a custom price set.
          They appear as dimmed "def" indicators on each calendar cell.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5">
        <Info size={14} className="text-amber-500 mt-0.5 shrink-0"/>
        <p className="text-xs text-amber-700">
          Default rates are a fallback only. To override specific dates, go to the <strong>Calendar</strong> tab
          and click any date (or use Multi-Select / Bulk Range).
        </p>
      </div>

      <div className="space-y-3">
        {roomTypes.map((t,i) => (
          <TypePriceRow key={t.name} type={t.name} idx={i}
            ac={form[t.name]?.ac} nonAc={form[t.name]?.nonAc}
            onAc={v=>setField(t.name,"ac",v)} onNonAc={v=>setField(t.name,"nonAc",v)}
          />
        ))}
      </div>

      {roomTypes.length===0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl py-10 text-center">
          <p className="text-sm text-slate-400">
            No room types found. Configure them in <strong>Room Configuration</strong> first.
          </p>
        </div>
      )}

      <Btn onClick={submit} disabled={saving||roomTypes.length===0}>
        {saved
          ? <><CheckCircle size={13}/> Saved!</>
          : saving
            ? <><RefreshCw size={13} className="animate-spin"/> Saving…</>
            : <><Save size={13}/> Save Default Rates</>}
      </Btn>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PricingCalendar() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [roomTypes, setRoomTypes] = useState([]);
  const [defaults,  setDefaults]  = useState({});
  const [prices,    setPrices]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type }); setTimeout(()=>setToast(null), 2800);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, dRes, pRes] = await Promise.all([
        dbs.readCollection("room_types", 100),
        dbs.readDocument("pricing_defaults", "defaults"),
        dbs.readCollection("pricing", 500),
      ]);
      setRoomTypes(tRes.data || tRes || []);
      setDefaults(dRes?.prices || {});
      const pData = pRes.data || pRes || [];
      const idx = {};
      pData.forEach(doc => { if(doc.date) idx[doc.date] = doc.prices||{}; });
      setPrices(idx);
    } catch(e){ console.error(e); showToast("Failed to load","error"); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveDefaults = async (form) => {
    try {
      const clean = {};
      Object.keys(form).forEach(k => {
        clean[k] = { ac: form[k].ac?Number(form[k].ac):0, nonAc: form[k].nonAc?Number(form[k].nonAc):0 };
      });
      const ex = await dbs.readDocument("pricing_defaults","defaults");
      if(ex) await dbs.editDocument("pricing_defaults","defaults",{ prices:clean });
      else    await dbs.addDocument("pricing_defaults","defaults",{ prices:clean });
      setDefaults(clean);
      showToast("Default rates saved");
    } catch { showToast("Failed to save defaults","error"); }
  };

  const TABS = [
    { id:"calendar", label:"Calendar",      icon:<Calendar size={14}/> },
    { id:"defaults", label:"Default Rates", icon:<IndianRupee size={14}/> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {toast && <Toast {...toast}/>}

      {/* ── Page header ── */}
      <div className="px-3 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:BRAND }}>
              <Calendar size={18} color="#fff"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Pricing Calendar</h1>
              <p className="text-xs text-slate-400 mt-0.5">Set room rates per type per date</p>
            </div>
          </div> */}

          <div className="flex items-center gap-3">
            {/* <Btn variant="ghost" size="sm" onClick={fetchAll}><RefreshCw size={13}/> Refresh</Btn> */}
            {/* Tab switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                    transition-all duration-200 cursor-pointer
                    ${activeTab===t.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <RefreshCw size={24} className="animate-spin text-slate-300"/>
          </div>
        ) : activeTab==="calendar" ? (
          <CalendarTab
            roomTypes={roomTypes}
            defaults={defaults}
            prices={prices}
            setPrices={setPrices}
            showToast={showToast}
          />
        ) : (
          <DefaultsTab
            roomTypes={roomTypes}
            defaults={defaults}
            onSave={saveDefaults}
          />
        )}
      </div>
    </div>
  );
}