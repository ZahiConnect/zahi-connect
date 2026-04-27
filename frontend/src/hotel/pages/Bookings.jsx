/**
 * Booking.jsx — StayyInn Front Desk
 * Fresh design. All features from scratch.
 *
 * Views:   [Rooms] [Timeline] [History]
 * Modals:  CheckInWizard | GuestPanel
 *
 * Design: Dashboard-consistent. Blue/slate surfaces, soft status accents.
 * Clean booking controls, room visibility, and timeline density.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LayoutGrid, CalendarRange, Archive, LogIn, Plus, RefreshCw,
  X, ChevronLeft, ChevronRight, Check, Ban, Sparkles,
  Upload, Eye, Trash2, Save, Edit2,
  CreditCard, ShoppingBag, FileText, Wallet, Printer,
  BedDouble, Snowflake, Wind, IndianRupee, Filter,
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  Package, Coffee, WashingMachine, Droplets, Zap,
} from "lucide-react";
import {
  Page, Text, View, Document, StyleSheet,
  PDFDownloadLink, BlobProvider, Image as PdfImg,
} from "@react-pdf/renderer";
import dbs from "../api/db";
import {
  buildInvoiceId,
  DEFAULT_BILLING_SETTINGS,
  DEFAULT_HOTEL_SETTINGS,
  formatCurrency,
  mergeBillingSettings,
  mergeHotelSettings,
  normalizeBillColor,
  toAmount,
} from "../utils/billing";

// ─── Config ───────────────────────────────────────────────────────────────────
const HOTEL    = "HOTEL GS SUITES";
const ADDR     = "1st Cross, Tavarekere Main Rd, Koramangala, Bengaluru";
const TEL      = "+91 90350 99375";
const GSTIN    = "29BONPM2971J1Z9";
const LOGO     = "https://i.ibb.co/Q7wxM04Q/sign.png";
const BRAND    = "#037ffc";
const BRAND_DK = "#0260c4";
const BRAND_LT = "#e8f3ff";

// ─── Utils ────────────────────────────────────────────────────────────────────
const zp    = n => String(n).padStart(2, "0");
const dFmt  = d => { const x = new Date(d); return `${zp(x.getDate())}/${zp(x.getMonth()+1)}/${x.getFullYear()}`; };
const tFmt  = d => new Date(d).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
const dtFmt = d => `${dFmt(d)} ${tFmt(d)}`;
const isoNow= () => { const d=new Date(); return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const co11  = from => {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate()+1); d.setHours(11,0,0,0);
  return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
const nightCount = (ci, co) => {
  const a=new Date(ci); a.setHours(0,0,0,0);
  const b=new Date(co||new Date()); b.setHours(0,0,0,0);
  return Math.max(1, Math.round((b-a)/86400000));
};
const todayKey  = () => new Date().toLocaleDateString("en-CA");
const parseJ    = (s, fb=[]) => { try{ return JSON.parse(s)||fb; }catch{ return fb; } };
const inrFmt    = n => "₹" + Number(n).toLocaleString("en-IN");

// Invoice ID: ddmmyyyy-nnnn
const LEGACY_BUILD_INV_ID = seq => {
  const d = new Date();
  return `${zp(d.getDate())}${zp(d.getMonth()+1)}${d.getFullYear()}-${String(seq).padStart(4,"0")}`;
};
const nextSeq = async () => {
  const key = todayKey();
  try {
    const doc = await dbs.readDocument("inv_seq", key);
    const n   = (doc?.n || 0) + 1;
    if (doc) await dbs.editDocument("inv_seq", key, { n, key });
    else     await dbs.addDocument ("inv_seq", key, { n, key });
    return n;
  } catch { return 1; }
};

const positiveAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const roomBaseRate = (room) => positiveAmount(room?.basePrice ?? room?.base_price);

const typeBaseRate = (rooms, type) => {
  const matchingRates = rooms
    .filter((room) => room?.type === type)
    .map(roomBaseRate)
    .filter((rate) => rate > 0);

  return matchingRates[0] || 0;
};

const priceLookup = (pMap, pDef, type, mode, ci, fallbackRate = 0) => {
  const dateKey = ci ? ci.slice(0,10) : todayKey();
  const field   = mode === "AC" ? "ac" : "nonAc";
  return (
    positiveAmount(pMap[dateKey]?.[type]?.[field]) ||
    positiveAmount(pDef[type]?.[field]) ||
    positiveAmount(fallbackRate)
  );
};

const buildAutoBillItems = (booking, extras = [], billingSettings = DEFAULT_BILLING_SETTINGS) => {
  if (!booking) return [];
  const nights = nightCount(booking.checkIn, booking.actualCheckOut || booking.checkOut);
  const roomLabel = billingSettings.customBillDefaults?.roomLabel?.trim() || "Accommodation Charges";
  const roomMeta = [
    booking.roomNumber ? `Room ${booking.roomNumber}` : null,
    booking.roomType || null,
    booking.mode || "AC",
  ].filter(Boolean).join(" · ");

  return [
    {
      name: roomMeta ? `${roomLabel} · ${roomMeta}` : roomLabel,
      qty: String(nights),
      rate: String(toAmount(booking.pricePerNight)),
    },
    ...extras.map((item, index) => ({
      name: String(item?.name || `Item ${index + 1}`).trim(),
      qty: "1",
      rate: String(toAmount(item?.amount)),
    })),
  ];
};

const normalizeBillItems = (items = []) =>
  items
    .map((item, index) => ({
      name: String(item?.name || `Item ${index + 1}`).trim(),
      qty: String(Math.max(0, toAmount(item?.qty || 0))),
      rate: String(Math.max(0, toAmount(item?.rate || 0))),
    }))
    .filter(item => item.name && toAmount(item.qty) > 0);

const buildBillItems = ({ booking, extras = [], customBill, billingSettings }) => {
  const autoItems = buildAutoBillItems(booking, extras, billingSettings);
  if (!customBill?.enabled) return autoItems;
  const customItems = normalizeBillItems(customBill.items);
  return customItems.length ? customItems : autoItems;
};

const buildCustomBillDraft = ({ booking, extras = [], billingSettings = DEFAULT_BILLING_SETTINGS }) => ({
  enabled: false,
  guestName: billingSettings.customBillDefaults?.guestName || booking?.guestName || "",
  guestAddress: billingSettings.customBillDefaults?.guestAddress || "",
  notes: billingSettings.customBillDefaults?.notes || "",
  items: buildAutoBillItems(booking, extras, billingSettings).map(item => ({ ...item })),
});

const getBillSubtotal = (items = []) =>
  items.reduce((sum, item) => sum + (toAmount(item.qty) * toAmount(item.rate)), 0);

// ─── Status config ────────────────────────────────────────────────────────────
const SC = {
  Available:   { bg:"#f0fdf4", ring:"#86efac", txt:"#166534", dot:"#22c55e" },
  Occupied:    { bg:"#eff6ff", ring:"#93c5fd", txt:"#1d4ed8", dot:BRAND },
  "Due Out":   { bg:"#fff7ed", ring:"#fdba74", txt:"#9a3412", dot:"#f97316" },
  Cleaning:    { bg:"#fff7ed", ring:"#fdba74", txt:"#c2410c", dot:"#f59e0b" },
  Maintenance: { bg:"#fef2f2", ring:"#fca5a5", txt:"#991b1b", dot:"#ef4444" },
  Reserved:    { bg:"#fdf4ff", ring:"#d8b4fe", txt:"#6b21a8", dot:"#a855f7" },
};

// ─── Shared primitives ────────────────────────────────────────────────────────
const Dot = ({ status }) => {
  const c = SC[status] || SC.Available;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase"
      style={{ background: c.bg, color: c.txt, boxShadow: `inset 0 0 0 1px ${c.ring}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {status}
    </span>
  );
};

const Btn = ({ ch, onClick, disabled, v="pri", sz="md", full, cls="" }) => {
  const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[.97] cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${full?"w-full":""}`;
  const sizes = { xs:"px-2.5 py-1.5 text-xs", sm:"px-3 py-2 text-xs", md:"px-4 py-2.5 text-sm", lg:"px-5 py-3 text-sm" };
  const vars  = {
    pri:  "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    sec:  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
    gho:  "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    red:  "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    grn:  "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm",
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[sz]} ${vars[v]} ${cls}`}>{ch}</button>;
};

const Field = ({ label, children, className="" }) => (
  <div className={className}>
    {label && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>}
    {children}
  </div>
);

const TextInput = ({ label, ...props }) => (
  <Field label={label}>
    <input {...props}
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800
        outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition placeholder:text-slate-300 ${props.className||""}`}/>
  </Field>
);

const SlideOver = ({ open, onClose, title, width="max-w-xl", children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(2,14,30,.72)", backdropFilter:"blur(6px)" }}>
      <div className={`relative bg-white w-full ${width} rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
        style={{ maxHeight:"94vh", boxShadow:"0 32px 80px -10px rgba(3,127,252,.18), 0 8px 32px rgba(0,0,0,.16)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition cursor-pointer"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  const bg = type==="err" ? "#dc2626" : type==="warn" ? "#d97706" : BRAND;
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white"
      style={{ background: bg, animation:"rise .25s ease" }}>
      {type==="err"?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}{msg}
    </div>
  );
};

// ─── ID Upload ────────────────────────────────────────────────────────────────
const IdBox = ({ label, url, onFile, onClear }) => {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  const upload = async file => {
    if (!file) return; setBusy(true);
    try { const r = await dbs.uploadImage(file); onFile(r.url); }
    catch { alert("Upload failed"); }
    setBusy(false);
  };
  if (url) return (
    <div onClick={()=>window.open(url,"_blank")}
      className="relative flex-1 h-24 rounded-xl overflow-hidden border-2 border-emerald-400 cursor-pointer group">
      <img src={url} className="w-full h-full object-cover"/>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
        <Eye size={16} className="text-white"/>
        <button onClick={e=>{e.stopPropagation();onClear();}} className="text-red-300 hover:text-white"><X size={16}/></button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 py-1 bg-emerald-500/80 text-center">
        <span className="text-[9px] font-bold text-white uppercase tracking-widest">{label} ✓</span>
      </div>
    </div>
  );
  return (
    <div onClick={()=>ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0]);}}
      className={`flex-1 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
        ${drag?"border-blue-500 bg-blue-50 scale-[1.02]":"border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"}`}>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e=>upload(e.target.files[0])}/>
      {busy ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
             : <><Upload size={15} className={`mb-1 ${drag?"text-blue-500":"text-slate-400"}`}/><span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span></>}
    </div>
  );
};

const IdCard = ({ name, front, back, onFront, onBack, onCF, onCB }) => {
  const done = front && back;
  return (
    <div className={`rounded-xl border p-3 ${done?"border-emerald-200 bg-emerald-50/60":"border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
          ${done?"bg-emerald-500 text-white":"bg-slate-200 text-slate-500"}`}>
          {done?<Check size={11}/>:name?.[0]?.toUpperCase()||"?"}
        </div>
        <span className="text-sm font-semibold text-slate-700">{name||"Guest"}</span>
        {done && <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Done</span>}
      </div>
      <div className="flex gap-2">
        <IdBox label="Front" url={front} onFile={onFront} onClear={onCF}/>
        <IdBox label="Back"  url={back}  onFile={onBack}  onClear={onCB}/>
      </div>
    </div>
  );
};

// ─── Mini date-time picker ────────────────────────────────────────────────────
const DatePick = ({ value, onChange, minDate, accent=BRAND, onClose }) => {
  const dv = value ? new Date(value) : new Date();
  const [vd, setVd] = useState(new Date(dv));
  const [hh, setHh] = useState(dv.getHours());
  const [mm, setMm] = useState(dv.getMinutes());
  const dIM = new Date(vd.getFullYear(), vd.getMonth()+1, 0).getDate();
  const fD  = new Date(vd.getFullYear(), vd.getMonth(), 1).getDay();

  const emit = (day, h=hh, m=mm) => {
    const nd = new Date(vd.getFullYear(), vd.getMonth(), day, h, m);
    onChange(new Date(nd-nd.getTimezoneOffset()*60000).toISOString().slice(0,16));
  };
  const setTime = (type, val) => {
    const v = parseInt(val);
    if (type==="h") { setHh(v); const cd=value?new Date(value).getDate():vd.getDate(); emit(cd,v,mm); }
    else            { setMm(v); const cd=value?new Date(value).getDate():vd.getDate(); emit(cd,hh,v); }
  };
  const chM = d => setVd(p => { const n=new Date(p); n.setMonth(n.getMonth()+d); return n; });

  return (
    <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-68 overflow-hidden" style={{width:272}}>
      <div className="flex items-center justify-between px-3 py-2.5 text-white text-sm font-bold" style={{background:accent}}>
        <button onClick={e=>{e.stopPropagation();chM(-1);}} className="p-1 hover:bg-black/10 rounded"><ChevronLeft size={15}/></button>
        <span>{vd.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
        <button onClick={e=>{e.stopPropagation();chM(1);}} className="p-1 hover:bg-black/10 rounded"><ChevronRight size={15}/></button>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 text-center mb-1.5">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d,i)=><span key={i} className="text-[9px] font-bold text-slate-400 uppercase">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({length:fD}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:dIM}).map((_,i)=>{
            const day=i+1, cell=new Date(vd.getFullYear(),vd.getMonth(),day);
            const sel=value&&new Date(value).toDateString()===cell.toDateString();
            const dis=minDate&&cell<new Date(new Date(minDate).setHours(0,0,0,0));
            return (
              <button key={day} disabled={dis}
                onClick={e=>{e.stopPropagation();emit(day);}}
                className={`h-7 w-full rounded text-xs font-semibold transition
                  ${sel?"text-white font-bold":""}
                  ${!sel&&!dis?"text-slate-600 hover:bg-blue-100":""}
                  ${dis?"text-slate-200 cursor-not-allowed":""}`}
                style={sel?{background:accent}:{}}>
                {day}
              </button>
            );
          })}
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
            <select value={hh} onClick={e=>e.stopPropagation()} onChange={e=>setTime("h",e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-700">
              {Array.from({length:24},(_,i)=><option key={i} value={i}>{zp(i)}</option>)}
            </select>
            <span className="text-slate-400 font-bold text-xs">:</span>
            <select value={mm} onClick={e=>e.stopPropagation()} onChange={e=>setTime("m",e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-700">
              {[0,15,30,45].map(m=><option key={m} value={m}>{zp(m)}</option>)}
            </select>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();onClose();}}
          className="w-full mt-3 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{background:accent}}>
          Confirm
        </button>
      </div>
    </div>
  );
};


// ─── PDF Invoice ──────────────────────────────────────────────────────────────
const PS = StyleSheet.create({
  pg:  { padding:40, fontFamily:"Helvetica", fontSize:10, color:"#18181b" },
  hdr: { flexDirection:"row", justifyContent:"space-between", paddingBottom:14, borderBottom:"2 solid #f59e0b", marginBottom:18 },
  bn:  { fontSize:20, fontWeight:"heavy", color:"#18181b" },
  sub: { fontSize:8.5, color:"#71717a", marginTop:2.5 },
  iT:  { fontSize:17, fontWeight:"bold", textAlign:"right" },
  iN:  { fontSize:11, color:"#dc2626", marginTop:3, fontWeight:"bold", textAlign:"right" },
  meta:{ flexDirection:"row", justifyContent:"space-between", backgroundColor:"#fafaf9", padding:11, borderRadius:5, marginBottom:14 },
  mL:  { fontSize:8, color:"#71717a", textTransform:"uppercase", letterSpacing:0.5 },
  mV:  { fontSize:10, fontWeight:"bold", marginTop:1.5 },
  th:  { flexDirection:"row", backgroundColor:"#18181b", padding:"7 8", color:"white", fontSize:8.5 },
  tr:  { flexDirection:"row", padding:"7 8", borderBottom:"1 solid #e4e4e7", fontSize:9 },
  trA: { flexDirection:"row", padding:"7 8", borderBottom:"1 solid #e4e4e7", fontSize:9, backgroundColor:"#fafaf9" },
  cD:{width:"44%"}, cN:{width:"12%",textAlign:"center"}, cR:{width:"18%",textAlign:"right"}, cA:{width:"26%",textAlign:"right"},
  sS:  { flexDirection:"row", justifyContent:"flex-end", marginTop:14 },
  sT:  { width:"46%" },
  sR:  { flexDirection:"row", justifyContent:"space-between", padding:"3 0", borderBottom:"1 solid #e4e4e7" },
  gR:  { flexDirection:"row", justifyContent:"space-between", padding:"7 0", borderTop:"2 solid #f59e0b", marginTop:5 },
  pH:  { flexDirection:"row", backgroundColor:"#f4f4f5", padding:"6 8", fontSize:8.5, marginTop:14 },
  pR:  { flexDirection:"row", padding:"6 8", borderBottom:"1 solid #f4f4f5", fontSize:8.5 },
  sig: { position:"absolute", bottom:80, right:40, alignItems:"center", width:150 },
  sI:  { width:80, height:38, marginBottom:5 },
  sL:  { fontSize:9.5, fontWeight:"bold", borderTop:"1 solid #000", paddingTop:4, width:"100%", textAlign:"center" },
  ft:  { position:"absolute", bottom:28, left:40, right:40, textAlign:"center", borderTop:"1 solid #e4e4e7", paddingTop:9, fontSize:7.5, color:"#a1a1aa" },
});

const LegacyInvoicePDF = ({ bk, invId, gst }) => {
  if (!bk) return null;
  const N     = nightCount(bk.checkIn, bk.actualCheckOut||bk.checkOut);
  const rent  = parseInt(bk.pricePerNight||0) * N;
  const exts  = parseJ(bk.extras, []);
  const pays  = parseJ(bk.payments, []);
  const extTot= exts.reduce((s,e)=>s+parseInt(e.amount||0),0);
  const gstAmt= gst ? (rent+extTot) * 0.05 : 0;
  const grand = rent + extTot + gstAmt;
  const paid  = pays.reduce((s,p)=>s+parseInt(p.amount||0),0);

  return (
    <Document>
      <Page size="A4" style={PS.pg}>
        {/* Header */}
        <View style={PS.hdr}>
          <View>
            <Text style={PS.bn}>{HOTEL}</Text>
            <Text style={PS.sub}>{ADDR}</Text>
            <Text style={PS.sub}>{TEL}{gst?`  ·  GSTIN: ${GSTIN}`:""}</Text>
          </View>
          <View>
            <Text style={PS.iT}>{gst?"TAX INVOICE":"RECEIPT"}</Text>
            <Text style={PS.iN}>#{invId}</Text>
            <Text style={{fontSize:8,color:"#71717a",textAlign:"right",marginTop:3}}>{dFmt(new Date())}</Text>
          </View>
        </View>
        {/* Meta */}
        <View style={PS.meta}>
          <View><Text style={PS.mL}>Guest</Text><Text style={PS.mV}>{bk.guestName}</Text><Text style={{fontSize:8.5,color:"#52525b"}}>{bk.phone}</Text></View>
          <View><Text style={PS.mL}>Check-In</Text><Text style={PS.mV}>{dtFmt(bk.checkIn)}</Text></View>
          <View><Text style={PS.mL}>Check-Out</Text><Text style={PS.mV}>{dtFmt(bk.actualCheckOut||bk.checkOut||new Date())}</Text></View>
        </View>
        {/* Table */}
        <View style={PS.th}>
          <Text style={PS.cD}>Description</Text><Text style={PS.cN}>Nights</Text><Text style={PS.cR}>Rate</Text><Text style={PS.cA}>Amount</Text>
        </View>
        <View style={PS.tr}>
          <Text style={PS.cD}>Room {bk.roomNumber} — {bk.roomType} ({bk.mode||"AC"})</Text>
          <Text style={PS.cN}>{N}</Text>
          <Text style={PS.cR}>₹{bk.pricePerNight}</Text>
          <Text style={PS.cA}>₹{rent.toFixed(2)}</Text>
        </View>
        {exts.map((e,i)=>(
          <View key={i} style={i%2===0?PS.trA:PS.tr}>
            <Text style={{...PS.cD,paddingLeft:12,color:"#52525b"}}>{e.name||"Extra"}</Text>
            <Text style={PS.cN}>1</Text>
            <Text style={PS.cR}>₹{e.amount}</Text>
            <Text style={PS.cA}>₹{parseInt(e.amount).toFixed(2)}</Text>
          </View>
        ))}
        {/* Summary */}
        <View style={PS.sS}>
          <View style={PS.sT}>
            <View style={PS.sR}><Text>Room Charges</Text><Text>₹{rent.toFixed(2)}</Text></View>
            {extTot>0&&<View style={PS.sR}><Text>Extras & Services</Text><Text>₹{extTot.toFixed(2)}</Text></View>}
            {gst&&<><View style={PS.sR}><Text>CGST 2.5%</Text><Text>₹{(gstAmt/2).toFixed(2)}</Text></View><View style={PS.sR}><Text>SGST 2.5%</Text><Text>₹{(gstAmt/2).toFixed(2)}</Text></View></>}
            <View style={PS.gR}>
              <Text style={{fontWeight:"bold",fontSize:11}}>Grand Total</Text>
              <Text style={{fontWeight:"bold",fontSize:11,color:"#d97706"}}>₹{grand.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        {/* Payments */}
        <View style={PS.pH}><Text style={{width:"32%"}}>Date</Text><Text style={{width:"38%"}}>Method</Text><Text style={{width:"30%",textAlign:"right"}}>Amount</Text></View>
        {pays.length>0 ? pays.map((p,i)=>(
          <View key={i} style={PS.pR}>
            <Text style={{width:"32%"}}>{dFmt(p.date)}</Text>
            <Text style={{width:"38%"}}>{p.method||p.type||"—"}</Text>
            <Text style={{width:"30%",textAlign:"right"}}>₹{parseInt(p.amount).toFixed(2)}</Text>
          </View>
        )) : <Text style={{fontSize:8.5,padding:7,color:"#a1a1aa"}}>No payments recorded.</Text>}
        <View style={{flexDirection:"row",justifyContent:"flex-end",marginTop:9,paddingTop:5,borderTop:"1 solid #18181b"}}>
          <Text style={{fontSize:9.5,fontWeight:"bold",marginRight:22}}>Total Paid: ₹{paid.toFixed(2)}</Text>
          <Text style={{fontSize:9.5,fontWeight:"bold",color:"#dc2626"}}>Balance: ₹{Math.max(0,grand-paid).toFixed(2)}</Text>
        </View>
        {/* Sig */}
        <View style={PS.sig}>
          <PdfImg style={PS.sI} src={LOGO}/>
          <Text style={PS.sL}>Authorised Signatory</Text>
          <Text style={{fontSize:8,marginTop:2,color:"#52525b"}}>{HOTEL}</Text>
        </View>
        <View style={PS.ft}><Text>Thank you for choosing {HOTEL}. We hope to see you again soon.</Text></View>
      </Page>
    </Document>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK-IN WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
const createPdfStyles = accent => StyleSheet.create({
  pg: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#18181b" },
  hdr: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, borderBottom: `2 solid ${accent}`, marginBottom: 18 },
  brandWrap: { flexDirection: "row", alignItems: "center", maxWidth: "62%" },
  brandLogo: { width: 70, height: 42, marginRight: 12, objectFit: "contain" },
  bn: { fontSize: 20, fontWeight: "heavy", color: accent },
  sub: { fontSize: 8.5, color: "#71717a", marginTop: 2.5, lineHeight: 1.4 },
  iT: { fontSize: 17, fontWeight: "bold", textAlign: "right" },
  iN: { fontSize: 11, color: accent, marginTop: 3, fontWeight: "bold", textAlign: "right" },
  meta: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fafaf9", padding: 11, borderRadius: 5, marginBottom: 14 },
  metaWide: { width: "40%" },
  metaCol: { width: "28%" },
  mL: { fontSize: 8, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5 },
  mV: { fontSize: 10, fontWeight: "bold", marginTop: 1.5 },
  metaSub: { fontSize: 8.5, color: "#52525b", marginTop: 2 },
  th: { flexDirection: "row", backgroundColor: "#18181b", padding: "7 8", color: "white", fontSize: 8.5 },
  tr: { flexDirection: "row", padding: "7 8", borderBottom: "1 solid #e4e4e7", fontSize: 9 },
  trA: { flexDirection: "row", padding: "7 8", borderBottom: "1 solid #e4e4e7", fontSize: 9, backgroundColor: "#fafaf9" },
  cD: { width: "48%" },
  cN: { width: "10%", textAlign: "center" },
  cR: { width: "18%", textAlign: "right" },
  cA: { width: "24%", textAlign: "right" },
  sS: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  sT: { width: "48%" },
  sR: { flexDirection: "row", justifyContent: "space-between", padding: "3 0", borderBottom: "1 solid #e4e4e7" },
  gR: { flexDirection: "row", justifyContent: "space-between", padding: "7 0", borderTop: `2 solid ${accent}`, marginTop: 5 },
  pH: { flexDirection: "row", backgroundColor: "#f4f4f5", padding: "6 8", fontSize: 8.5, marginTop: 14 },
  pR: { flexDirection: "row", padding: "6 8", borderBottom: "1 solid #f4f4f5", fontSize: 8.5 },
  sig: { position: "absolute", bottom: 80, right: 40, alignItems: "center", width: 150 },
  sI: { width: 95, height: 40, marginBottom: 5, objectFit: "contain" },
  sL: { fontSize: 9.5, fontWeight: "bold", borderTop: "1 solid #000", paddingTop: 4, width: "100%", textAlign: "center" },
  ft: { position: "absolute", bottom: 28, left: 40, right: 40, textAlign: "center", borderTop: "1 solid #e4e4e7", paddingTop: 9, fontSize: 7.5, color: "#a1a1aa" },
});

const InvoicePDF = ({
  bk,
  invId,
  gst,
  hotelSettings = DEFAULT_HOTEL_SETTINGS,
  billingSettings = DEFAULT_BILLING_SETTINGS,
}) => {
  if (!bk) return null;

  const business = bk.businessSnapshot
    ? mergeHotelSettings(parseJ(bk.businessSnapshot, null))
    : mergeHotelSettings(hotelSettings);
  const billing = bk.billingSnapshot
    ? mergeBillingSettings(parseJ(bk.billingSnapshot, null))
    : mergeBillingSettings(billingSettings);
  const customBill = parseJ(bk.customBill, null);
  const exts = parseJ(bk.extras, []);
  const pays = parseJ(bk.payments, []);
  const items = bk.billItems
    ? normalizeBillItems(parseJ(bk.billItems, []))
    : buildBillItems({ booking: bk, extras: exts, customBill, billingSettings: billing });

  const accent = normalizeBillColor(billing.billColor);
  const styles = createPdfStyles(accent);
  const subtotal = getBillSubtotal(items);
  const discount = toAmount(bk.discount);
  const taxRate = gst ? toAmount(billing.gstRate) : 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmt = taxableAmount * taxRate / 100;
  const grand = subtotal + gstAmt - discount;
  const paid = pays.reduce((sum, payment) => sum + toAmount(payment.amount), 0);
  const guestName = customBill?.enabled
    ? String(customBill.guestName || "").trim() || bk.guestName
    : bk.guestName;
  const guestAddress = customBill?.enabled
    ? String(customBill.guestAddress || "").trim()
    : "";
  const footerNote = (
    customBill?.enabled
      ? String(customBill.notes || "").trim()
      : ""
  ) || business.invoiceFooter || `Thank you for choosing ${business.name || "our property"}. We hope to see you again soon.`;
  const invoiceNo = invId || bk.invoiceId || "DRAFT";
  const halfRate = taxRate / 2;
  const symbol = billing.currencySymbol || "₹";

  return (
    <Document>
      <Page size="A4" style={styles.pg}>
        <View style={styles.hdr}>
          <View style={styles.brandWrap}>
            {business.logo ? <PdfImg style={styles.brandLogo} src={business.logo} /> : null}
            <View>
              <Text style={styles.bn}>{business.name || "Business Name"}</Text>
              {business.addr ? <Text style={styles.sub}>{business.addr}</Text> : null}
              {(business.phone || business.email || (gst && business.gstin)) ? (
                <Text style={styles.sub}>
                  {[business.phone, business.email, gst && business.gstin ? `GSTIN: ${business.gstin}` : null].filter(Boolean).join("  |  ")}
                </Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={styles.iT}>{gst ? "TAX INVOICE" : "RECEIPT"}</Text>
            <Text style={styles.iN}>#{invoiceNo}</Text>
            <Text style={{ fontSize: 8, color: "#71717a", textAlign: "right", marginTop: 3 }}>{dFmt(new Date())}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaWide}>
            <Text style={styles.mL}>Guest</Text>
            <Text style={styles.mV}>{guestName || "Guest"}</Text>
            {bk.phone ? <Text style={styles.metaSub}>{bk.phone}</Text> : null}
            {guestAddress ? <Text style={styles.metaSub}>{guestAddress}</Text> : null}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.mL}>Check-In</Text>
            <Text style={styles.mV}>{dtFmt(bk.checkIn)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.mL}>Check-Out</Text>
            <Text style={styles.mV}>{dtFmt(bk.actualCheckOut || bk.checkOut || new Date())}</Text>
          </View>
        </View>

        <View style={styles.th}>
          <Text style={styles.cD}>Description</Text>
          <Text style={styles.cN}>Qty</Text>
          <Text style={styles.cR}>Rate</Text>
          <Text style={styles.cA}>Amount</Text>
        </View>

        {items.map((item, index)=>(
          <View key={`${item.name}-${index}`} style={index % 2 === 0 ? styles.trA : styles.tr}>
            <Text style={styles.cD}>{item.name || "Charge"}</Text>
            <Text style={styles.cN}>{toAmount(item.qty)}</Text>
            <Text style={styles.cR}>{formatCurrency(toAmount(item.rate), symbol)}</Text>
            <Text style={styles.cA}>{formatCurrency(toAmount(item.qty) * toAmount(item.rate), symbol)}</Text>
          </View>
        ))}

        <View style={styles.sS}>
          <View style={styles.sT}>
            <View style={styles.sR}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(subtotal, symbol)}</Text>
            </View>
            {discount > 0 ? (
              <View style={styles.sR}>
                <Text>Discount</Text>
                <Text>-{formatCurrency(discount, symbol)}</Text>
              </View>
            ) : null}
            {gst ? (
              <>
                <View style={styles.sR}>
                  <Text>{billing.cgstLabel} {halfRate}%</Text>
                  <Text>{formatCurrency(gstAmt / 2, symbol)}</Text>
                </View>
                <View style={styles.sR}>
                  <Text>{billing.sgstLabel} {halfRate}%</Text>
                  <Text>{formatCurrency(gstAmt / 2, symbol)}</Text>
                </View>
              </>
            ) : null}
            <View style={styles.gR}>
              <Text style={{ fontWeight: "bold", fontSize: 11 }}>Grand Total</Text>
              <Text style={{ fontWeight: "bold", fontSize: 11, color: accent }}>{formatCurrency(grand, symbol)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pH}>
          <Text style={{ width: "32%" }}>Date</Text>
          <Text style={{ width: "38%" }}>Method</Text>
          <Text style={{ width: "30%", textAlign: "right" }}>Amount</Text>
        </View>
        {pays.length > 0 ? pays.map((payment, index)=>(
          <View key={index} style={styles.pR}>
            <Text style={{ width: "32%" }}>{dFmt(payment.date)}</Text>
            <Text style={{ width: "38%" }}>{payment.method || payment.type || "-"}</Text>
            <Text style={{ width: "30%", textAlign: "right" }}>{formatCurrency(payment.amount, symbol)}</Text>
          </View>
        )) : <Text style={{ fontSize: 8.5, padding: 7, color: "#a1a1aa" }}>No payments recorded.</Text>}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 9, paddingTop: 5, borderTop: "1 solid #18181b" }}>
          <Text style={{ fontSize: 9.5, fontWeight: "bold", marginRight: 22 }}>Total Paid: {formatCurrency(paid, symbol)}</Text>
          <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#dc2626" }}>Balance: {formatCurrency(Math.max(0, grand - paid), symbol)}</Text>
        </View>

        {business.signature ? (
          <View style={styles.sig}>
            <PdfImg style={styles.sI} src={business.signature} />
            <Text style={styles.sL}>Authorised Signatory</Text>
            <Text style={{ fontSize: 8, marginTop: 2, color: "#52525b" }}>{business.name || "Business"}</Text>
          </View>
        ) : null}

        <View style={styles.ft}>
          <Text>{footerNote}</Text>
        </View>
      </Page>
    </Document>
  );
};

const CheckInWizard = ({
  open, onClose, rooms, roomTypes, pMap, pDef,
  existing, preRoom, preMode="checkin", onDone
}) => {
  const isRes  = preMode === "reservation";
  const [step, setStep]   = useState(1);
  const [busy, setBusy]   = useState(false);
  const [cal,  setCal]    = useState(null);
  const [hits, setHits]   = useState([]);
  const [allC, setAllC]   = useState([]);
  const [prev, setPrev]   = useState([]);
  const [counts, setCounts] = useState({});
  const [selR,  setSelR]  = useState([]);
  const [rates, setRates] = useState({});
  const [adv,   setAdv]   = useState({ CASH:"", BANK:"", UPI:"", OTA:"" });

  const [F, setF_] = useState({
    guestName:"", phone:"", mode:"AC",
    checkIn:isoNow(), checkOut:co11(),
    idFront:"", idBack:"", members:[],
  });
  const set = (k,v) => setF_(f=>({...f,[k]:v}));

  // Init
  useEffect(()=>{
    if (!open) return;
    setStep(1); setCal(null); setHits([]); setPrev([]); setCounts({}); setSelR([]); setAdv({CASH:"",BANK:"",UPI:"",OTA:""});
    setF_({ guestName:"", phone:"", mode:"AC", checkIn:isoNow(), checkOut:co11(), idFront:"", idBack:"", members:[] });
    if (preRoom) { if(isRes) setCounts({[preRoom.type]:1}); else setSelR([preRoom.roomNumber]); }
    dbs.readCollection("customers",500).then(r=>setAllC(r.data||r||[]));
  },[open]);

  // Auto-price from calendar
  useEffect(()=>{
    const r={};
    roomTypes.forEach(t=>{
      r[t.name]=priceLookup(pMap,pDef,t.name,F.mode,F.checkIn,typeBaseRate(rooms,t.name));
    });
    setRates(r);
  },[F.mode,F.checkIn,roomTypes,rooms,pMap,pDef,open]);

  const unavail = useMemo(()=>{
    const s=new Date(F.checkIn).getTime(), e=new Date(F.checkOut).getTime();
    return existing.filter(b=>{
      if(["Checked Out","Cancelled"].includes(b.status)) return false;
      const bs=new Date(b.checkIn).getTime(), be=b.checkOut?new Date(b.checkOut).getTime():bs+86400000;
      return s<be&&e>bs;
    }).map(b=>b.roomNumber);
  },[existing,F.checkIn,F.checkOut]);

  const avail = rooms.filter(r=>!unavail.includes(r.roomNumber)&&r.status!=="Maintenance");
  const N = nightCount(F.checkIn, F.checkOut);

  const est = () => {
    if (isRes) return Object.entries(counts).reduce((s,[t,c])=>s+(rates[t]||0)*c*N,0);
    return selR.reduce((s,rn)=>{ const r=rooms.find(x=>x.roomNumber===rn); return r?s+(rates[r.type]||0)*N:s; },0);
  };

  const searchPhone = v => {
    set("phone",v);
    setHits(v.length>2?allC.filter(c=>c.phone?.includes(v)||c.guestName?.toLowerCase().includes(v.toLowerCase())).slice(0,5):[]);
  };
  const pickCust = c => {
    const ids = c.idPhotos?JSON.parse(c.idPhotos):[];
    set("guestName",c.guestName); set("phone",c.phone); set("idFront",ids[0]||""); set("idBack",ids[1]||"");
    setPrev(c.lastMembers?JSON.parse(c.lastMembers):[]);
    setHits([]);
  };
  const addMem  = (name="") => set("members",[...F.members,{name,age:"",idFront:"",idBack:""}]);
  const updMem  = (i,k,v) => { const m=[...F.members]; m[i]={...m[i],[k]:v}; set("members",m); };
  const remMem  = i => set("members",F.members.filter((_,idx)=>idx!==i));

  const STEPS = isRes
    ? [{n:1,l:"Guest Info"},{n:3,l:"Rooms & Pay"}]
    : [{n:1,l:"Guest Info"},{n:2,l:"ID Upload"},{n:3,l:"Rooms & Pay"}];
  const si = STEPS.findIndex(s=>s.n===step);

  const submit = async () => {
    setBusy(true);
    try {
      const ex = allC.find(c=>c.phone===F.phone);
      const ph  = ex?.lastMembers?JSON.parse(ex.lastMembers):[];
      F.members.forEach(m=>{ if(!ph.some(x=>x.name===m.name)) ph.push({name:m.name,age:m.age}); });
      const cDoc = { phone:F.phone, guestName:F.guestName, idPhotos:JSON.stringify([F.idFront,F.idBack]), lastVisit:new Date().toISOString(), lastMembers:JSON.stringify(ph) };
      if (ex) await dbs.editDocument("customers",ex.id,cDoc);
      else    await dbs.addAutoIdDocument("customers",cDoc);

      const advPays = Object.entries(adv).filter(([,v])=>parseFloat(v)>0)
        .map(([k,v])=>({method:k,amount:parseInt(v),date:new Date().toISOString()}));
      const totalR  = isRes?Object.values(counts).reduce((a,b)=>a+b,0):selR.length;
      const perRoom = totalR>0?advPays.map(p=>({...p,amount:Math.floor(p.amount/totalR)})):[];
      const batch   = `BATCH-${Date.now()}`;
      const base    = {
        ...F, members:JSON.stringify(F.members),
        idPhotos:JSON.stringify([F.idFront,F.idBack]),
        payments:JSON.stringify(perRoom), extras:JSON.stringify([]),
        bookingDate:new Date().toISOString(), batch,
      };

      if (isRes) {
        for (const [type,count] of Object.entries(counts))
          for (let i=0;i<count;i++)
            await dbs.addAutoIdDocument("reservations",{...base,roomNumber:"TBD",roomType:type,pricePerNight:rates[type]||0,status:"Reserved"});
      } else {
        for (const rn of selR) {
          const room = rooms.find(r=>String(r.roomNumber)===String(rn));
          await dbs.addAutoIdDocument("bookings",{...base,roomNumber:String(rn),roomType:room?.type||"",pricePerNight:rates[room?.type]||0,status:"Occupied"});
          await dbs.editDocument("rooms",String(rn),{status:"Occupied"});
        }
        for (const p of advPays)
          await dbs.addAutoIdDocument("transactions",{date:p.date,amount:p.amount,type:"Income",category:"Advance",description:F.guestName,method:p.method});
      }
      onDone();
    } catch(e){ console.error(e); alert("Save failed. Check console."); }
    setBusy(false);
  };

  if (!open) return null;

  const canGo1 = F.guestName && F.phone;
  const canSave= isRes ? Object.values(counts).reduce((a,b)=>a+b,0)>0 : selR.length>0;

  return (
    <SlideOver open={open} onClose={onClose} title={isRes?"New Reservation":"New Check-In"} width="max-w-2xl">
      {/* Step bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
        {STEPS.map((s,i)=>(
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                ${i<si?"bg-emerald-500 text-white":i===si?"bg-blue-600 text-white":"bg-slate-200 text-slate-400"}`}>
                {i<si?<Check size={10}/>:s.n}
              </div>
              <span className={`text-[11px] font-semibold ${i===si?"text-slate-800":"text-slate-400"}`}>{s.l}</span>
            </div>
            {i<STEPS.length-1&&<div className={`h-px flex-1 max-w-[40px] ${i<si?"bg-emerald-400":"bg-slate-200"}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* ── STEP 1: Guest Info ── */}
        {step===1&&(<>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {k:"checkIn",  l:"Check-In",  acc:BRAND,    onC:(v)=>setF_(f=>({...f,checkIn:v,checkOut:co11(v)}))},
              {k:"checkOut", l:"Check-Out", acc:BRAND_DK, onC:(v)=>set("checkOut",v)},
            ].map(cfg=>(
              <div key={cfg.k} className="relative">
                <Field label={cfg.l}>
                  <div onClick={()=>setCal(c=>c===cfg.k?null:cfg.k)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 cursor-pointer transition-all
                      ${cal===cfg.k?"ring-2 ring-offset-0":"hover:border-slate-300"}`}
                    style={{ borderColor: cal===cfg.k?cfg.acc:"#e4e4e7" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:cfg.acc+"20"}}>
                      <CalendarRange size={15} style={{color:cfg.acc}}/>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{dFmt(F[cfg.k])}</p>
                      <p className="text-[11px] text-slate-400">{tFmt(F[cfg.k])}</p>
                    </div>
                    {cfg.k==="checkOut"&&(
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{background:cfg.acc+"20",color:cfg.acc}}>{N}N</span>
                    )}
                  </div>
                </Field>
                {cal===cfg.k&&(
                  <DatePick value={F[cfg.k]} onChange={cfg.onC}
                    minDate={cfg.k==="checkOut"?F.checkIn:undefined}
                    accent={cfg.acc} onClose={()=>setCal(null)}/>
                )}
              </div>
            ))}
          </div>

          {/* Phone + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <TextInput label="Phone *" placeholder="Search or enter number…" value={F.phone} onChange={e=>searchPhone(e.target.value)}/>
              {hits.length>0&&(
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                  {hits.map(c=>(
                    <button key={c.id} onClick={()=>pickCust(c)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition cursor-pointer border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                        {c.guestName?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div><p className="text-sm font-bold text-slate-800">{c.guestName}</p><p className="text-[11px] text-slate-400">{c.phone}</p></div>
                      <ArrowRight size={13} className="ml-auto text-slate-300"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <TextInput label="Guest Name *" placeholder="Full name" value={F.guestName} onChange={e=>set("guestName",e.target.value)}/>
          </div>

          {/* AC toggle */}
          <div>
            <Field label="Room Climate">
              <div className="flex gap-2">
                {[["AC",<Snowflake size={13}/>],["Non-AC",<Wind size={13}/>]].map(([m,ic])=>(
                  <button key={m} onClick={()=>set("mode",m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition cursor-pointer
                      ${F.mode===m?"border-blue-500 bg-blue-50 text-blue-800":"border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    {ic}{m}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Additional Members</p>
              <div className="flex items-center gap-2">
                {prev.length>0&&(
                  <select className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer text-slate-600"
                    onChange={e=>{ if(e.target.value) addMem(e.target.value); e.target.value=""; }}>
                    <option value="">+ from history</option>
                    {prev.map((m,i)=><option key={i} value={m.name}>{m.name}</option>)}
                  </select>
                )}
                <Btn ch="+ Add" v="gho" sz="xs" onClick={()=>addMem()}/>
              </div>
            </div>
            <div className="space-y-2">
              {F.members.map((m,i)=>(
                <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <input placeholder="Name" value={m.name} onChange={e=>updMem(i,"name",e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400"/>
                  <input placeholder="Age" value={m.age||""} onChange={e=>updMem(i,"age",e.target.value)}
                    className="w-14 px-2 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400"/>
                  <button onClick={()=>remMem(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"><X size={13}/></button>
                </div>
              ))}
              {F.members.length===0&&<p className="text-xs text-slate-400 italic text-center py-1.5">No additional members</p>}
            </div>
          </div>
        </>)}

        {/* ── STEP 2: IDs ── */}
        {step===2&&(
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <Upload size={13} className="text-blue-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-700">Upload Aadhaar / Passport — front & back for each person. Drag-drop or click.</p>
            </div>
            <IdCard name={F.guestName||"Main Guest"} front={F.idFront} back={F.idBack}
              onFront={u=>set("idFront",u)} onBack={u=>set("idBack",u)}
              onCF={()=>set("idFront","")} onCB={()=>set("idBack","")}/>
            {F.members.map((m,i)=>(
              <IdCard key={i} name={m.name||`Member ${i+1}`} front={m.idFront} back={m.idBack}
                onFront={u=>updMem(i,"idFront",u)} onBack={u=>updMem(i,"idBack",u)}
                onCF={()=>updMem(i,"idFront","")} onCB={()=>updMem(i,"idBack","")}/>
            ))}
          </div>
        )}

        {/* ── STEP 3: Rooms & Pay ── */}
        {step===3&&(
          <div className="grid grid-cols-5 gap-5">
            <div className="col-span-3 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BedDouble size={12}/>{isRes?"Room Types":"Select Rooms"}
                <span className="ml-auto font-normal text-blue-500 normal-case">Prices from calendar</span>
              </p>

              {isRes ? (
                <div className="space-y-2">
                  {roomTypes.map(t=>{
                    const cnt = avail.filter(r=>r.type===t.name).length;
                    return (
                      <div key={t.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-slate-800">{t.name}</p>
                          <p className="text-[10px] text-slate-400">{cnt} available</p>
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                          <IndianRupee size={10} className="text-slate-400"/>
                          <input type="number" value={rates[t.name]||""} onChange={e=>setRates(r=>({...r,[t.name]:parseFloat(e.target.value)||0}))}
                            className="w-16 text-sm font-bold outline-none text-right text-slate-700"/>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setCounts(p=>({...p,[t.name]:Math.max(0,(p[t.name]||0)-1)}))}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-lg leading-none">−</button>
                          <span className="w-4 text-center font-bold text-sm text-slate-800">{counts[t.name]||0}</span>
                          <button onClick={()=>setCounts(p=>({...p,[t.name]:Math.min(cnt,(p[t.name]||0)+1)}))}
                            disabled={cnt===0}
                            className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-30 cursor-pointer text-lg leading-none">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {avail.map(r=>{
                      const sel = selR.includes(r.roomNumber);
                      return (
                        <button key={r.roomNumber} onClick={()=>setSelR(p=>p.includes(r.roomNumber)?p.filter(x=>x!==r.roomNumber):[...p,r.roomNumber])}
                          className={`p-2.5 rounded-xl border-2 text-center transition cursor-pointer
                            ${sel?"border-blue-600 bg-blue-600 text-white":"border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}>
                          <p className="font-bold text-sm font-mono">{r.roomNumber}</p>
                          <p className={`text-[9px] mt-0.5 uppercase tracking-wide ${sel?"text-blue-100":"text-slate-400"}`}>{r.type?.split(" ")[0]}</p>
                        </button>
                      );
                    })}
                    {avail.length===0&&<p className="col-span-4 text-center py-3 text-sm text-slate-400">No rooms available</p>}
                  </div>
                  {selR.length>0&&(
                    <div className="space-y-1.5 mt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate Override</p>
                      {roomTypes.filter(t=>selR.some(rn=>rooms.find(r=>r.roomNumber===rn)?.type===t.name)).map(t=>(
                        <div key={t.name} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-sm font-semibold text-slate-700">{t.name}</span>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                            <IndianRupee size={10} className="text-slate-400"/>
                            <input type="number" value={rates[t.name]||""} onChange={e=>setRates(r=>({...r,[t.name]:parseFloat(e.target.value)||0}))}
                              className="w-20 text-sm font-bold outline-none text-right"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: estimate + advance */}
            <div className="col-span-2 space-y-4">
              <div className="rounded-2xl p-4 text-center border border-blue-100" style={{background:BRAND_LT}}>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Estimated Total</p>
                <p className="text-3xl font-extrabold text-slate-900">{inrFmt(est())}</p>
                <p className="text-xs text-blue-700 mt-1">{N} night{N!==1?"s":""}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Advance Payment</p>
                {[["CASH","Cash"],["BANK","Bank Transfer"],["UPI","UPI"],["OTA","OTA/Agent"]].map(([k,l])=>(
                  <div key={k} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 w-24 font-medium">{l}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input type="number" placeholder="0" value={adv[k]}
                        onChange={e=>setAdv(p=>({...p,[k]:e.target.value}))}
                        className="w-full pl-7 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none focus:border-blue-400"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
        {step>1
          ? <Btn ch="← Back" v="gho" sz="sm" onClick={()=>setStep(s=>s===3&&isRes?1:s-1)}/>
          : <div/>}
        {step===1&&<Btn ch="Continue →" onClick={()=>setStep(isRes?3:2)} disabled={!canGo1}/>}
        {step===2&&<Btn ch="Continue →" onClick={()=>setStep(3)}/>}
        {step===3&&(
          <Btn ch={busy?<><RefreshCw size={13} className="animate-spin"/>Saving…</>:isRes?"Confirm Reservation ✓":"Check In Now ✓"}
            onClick={submit} disabled={busy||!canSave}/>
        )}
      </div>
    </SlideOver>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// GUEST PANEL — payments, extras, checkout
// ═══════════════════════════════════════════════════════════════════════════════
const QUICK_EXTRAS = [
  { name:"Water Bottle", amt:40,  icon:<Droplets size={12}/> },
  { name:"Laundry",      amt:150, icon:<WashingMachine size={12}/> },
  { name:"Breakfast",    amt:120, icon:<Coffee size={12}/> },
  { name:"Extra Towel",  amt:50,  icon:<Package size={12}/> },
  { name:"Room Service", amt:200, icon:<Zap size={12}/> },
];

const GuestPanel = ({
  open,
  onClose,
  booking,
  rooms,
  existing,
  onUpdate,
  hotelSettings = DEFAULT_HOTEL_SETTINGS,
  billingSettings = DEFAULT_BILLING_SETTINGS,
}) => {
  const [bk, setBk]     = useState(booking);
  const [pays,  setPays]= useState([]);
  const [exts,  setExts]= useState([]);
  const [payF,  setPayF]= useState({ CASH:"", BANK:"", UPI:"", OTA:"" });
  const [eName, setEN]  = useState("");
  const [eAmt,  setEA]  = useState("");
  const [disc,  setDisc]= useState(0);
  const [gst,   setGst] = useState(false);
  const [ext,   setExt] = useState(false);
  const [newCO, setNCO] = useState("");
  const [tab,   setTab] = useState("pay");
  const [busy,  setBusy]= useState(false);
  const [coOk,  setCOk] = useState(false);
  const [invId, setInv] = useState("");
  const [pdf,   setPdf] = useState(false);
  const [zoom,  setZoom]= useState(null);
  const [relRes,setRR]  = useState([]);
  const [asgn,  setAsgn]= useState({});
  const [customBill, setCustomBill] = useState(buildCustomBillDraft({ booking, extras: [], billingSettings }));
  const [completedBill, setCompletedBill] = useState(null);

  const coll = booking?.status==="Reserved" ? "reservations" : "bookings";

  useEffect(()=>{
    if (!open||!booking) return;
    const nextExtras = parseJ(booking.extras,[]);
    setBk(booking);
    setPays(parseJ(booking.payments,[]));
    setExts(nextExtras);
    setCustomBill(buildCustomBillDraft({ booking, extras: nextExtras, billingSettings }));
    setCompletedBill(null);
    setNCO(booking.checkOut||""); setCOk(false); setPdf(false); setInv("");
    setPayF({CASH:"",BANK:"",UPI:"",OTA:""}); setDisc(0); setGst(Boolean(billingSettings.gstEnabled)); setTab("pay");
    if (booking.status==="Reserved") {
      setRR(existing.filter(b=>b.phone===booking.phone&&b.status==="Reserved"&&b.checkIn===booking.checkIn));
    } else setRR([]);
  },[open,booking,billingSettings]);

  useEffect(()=>{ if(coOk){ setPdf(false); setTimeout(()=>setPdf(true),700); } },[coOk]);

  const N     = nightCount(bk?.checkIn, bk?.actualCheckOut||bk?.checkOut);
  const taxRate = gst ? toAmount(billingSettings.gstRate) : 0;
  const billItems = buildBillItems({ booking: bk, extras: exts, customBill, billingSettings });
  const subtotal = getBillSubtotal(billItems);
  const rent  = customBill.enabled ? subtotal : parseInt(bk?.pricePerNight||0)*N;
  const extT  = customBill.enabled ? 0 : exts.reduce((s,e)=>s+parseInt(e.amount||0),0);
  const gstBase = Math.max(0, subtotal - disc);
  const gstA  = taxRate ? (gstBase * taxRate) / 100 : 0;
  const grand = subtotal + gstA - disc;
  const paid  = pays.reduce((s,p)=>s+toAmount(p.amount),0);
  const bal   = grand-paid;
  const money = value => formatCurrency(value, billingSettings.currencySymbol || "₹");

  const saveP = async np => { await dbs.editDocument(coll,bk.id,{payments:JSON.stringify(np)}); setPays(np); onUpdate(false); };
  const syncCustomBillDraft = nextExtras => {
    setCustomBill(current => current.enabled ? current : buildCustomBillDraft({ booking: bk, extras: nextExtras, billingSettings }));
  };
  const updateCustomBill = (field, value) => {
    setCustomBill(current => ({ ...current, [field]: value }));
  };
  const updateCustomItem = (index, field, value) => {
    setCustomBill(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };
  const addCustomItem = () => {
    setCustomBill(current => ({
      ...current,
      items: [...current.items, { name: "", qty: "1", rate: "0" }],
    }));
  };
  const removeCustomItem = index => {
    setCustomBill(current => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  const resetCustomBill = () => {
    setCustomBill(current => ({
      ...buildCustomBillDraft({ booking: bk, extras: exts, billingSettings }),
      enabled: current.enabled,
    }));
  };

  const addPay = async () => {
    const toAdd = Object.entries(payF).filter(([,v])=>parseFloat(v)>0)
      .map(([k,v])=>({method:k,amount:parseInt(v),date:new Date().toISOString()}));
    if (!toAdd.length) return;
    await saveP([...pays,...toAdd]);
    setPayF({CASH:"",BANK:"",UPI:"",OTA:""});
    for (const p of toAdd) await dbs.addAutoIdDocument("transactions",{date:p.date,amount:p.amount,type:"Income",category:"Payment",description:bk.guestName,method:p.method});
  };

  const addExt = async () => {
    if (!eName||!eAmt) return;
    const ne=[...exts,{name:eName,amount:parseInt(eAmt),date:new Date().toISOString()}];
    await dbs.editDocument(coll,bk.id,{extras:JSON.stringify(ne)});
    setExts(ne); syncCustomBillDraft(ne); setEN(""); setEA(""); onUpdate(false);
  };

  const addQuick = async item => {
    const ne=[...exts,{name:item.name,amount:item.amt,date:new Date().toISOString()}];
    await dbs.editDocument(coll,bk.id,{extras:JSON.stringify(ne)});
    setExts(ne); syncCustomBillDraft(ne); onUpdate(false);
  };

  const delExt = async i => {
    const ne=exts.filter((_,idx)=>idx!==i);
    await dbs.editDocument(coll,bk.id,{extras:JSON.stringify(ne)});
    setExts(ne); syncCustomBillDraft(ne); onUpdate(false);
  };

  const extendCO = async () => {
    await dbs.editDocument(coll,bk.id,{checkOut:newCO});
    setBk(b=>({...b,checkOut:newCO})); setExt(false); onUpdate(false);
  };

  const getAvail = type => {
    const occ=existing.filter(b=>["Occupied","Checked In"].includes(b.status)).map(b=>b.roomNumber);
    return rooms.filter(r=>r.type===type&&r.status==="Available"&&!occ.includes(r.roomNumber));
  };

  const groupCheckin = async () => {
    const batch=`BATCH-${Date.now()}`;
    for (const [resId,roomNum] of Object.entries(asgn)) {
      if (!roomNum) continue;
      const res=relRes.find(r=>r.id===resId);
      await dbs.addAutoIdDocument("bookings",{...res,status:"Occupied",roomNumber:roomNum,batch,bookingDate:new Date().toISOString()});
      await dbs.deleteDocument("reservations",resId);
      await dbs.editDocument("rooms",roomNum,{status:"Occupied"});
    }
    onUpdate(true); onClose();
  };

  const checkout = async () => {
    if (!window.confirm("Confirm checkout?")) return;
    setBusy(true);
    const coTime = new Date().toISOString();
    const seq    = await nextSeq();
    const id     = buildInvoiceId(seq, billingSettings.invoicePrefix);
    setInv(id);
    const finalPays = [...pays,...Object.entries(payF).filter(([,v])=>parseFloat(v)>0).map(([k,v])=>({method:k,amount:parseInt(v),date:coTime}))];
    const finalDoc = {
      ...bk,
      status:"Checked Out",
      actualCheckOut:coTime,
      finalBill:grand.toFixed(2),
      gstEnabled:gst,
      discount:disc,
      invoiceId:id,
      payments:JSON.stringify(finalPays),
      extras:JSON.stringify(exts),
      billItems:JSON.stringify(billItems),
      customBill: customBill.enabled ? JSON.stringify({ ...customBill, items: billItems }) : "",
      businessSnapshot: JSON.stringify(hotelSettings),
      billingSnapshot: JSON.stringify(billingSettings),
    };
    await dbs.addAutoIdDocument("history", finalDoc);
    await dbs.deleteDocument("bookings",bk.id);
    await dbs.editDocument("rooms",bk.roomNumber,{status:"Cleaning"});
    for (const p of finalPays.filter(p=>!pays.some(x=>x.date===p.date)))
      await dbs.addAutoIdDocument("transactions",{date:p.date,amount:p.amount,type:"Income",category:"Checkout",description:bk.guestName,method:p.method});
    setCompletedBill(finalDoc);
    setCOk(true); setBusy(false); onUpdate(false);
  };

  const markReady = async () => { await dbs.editDocument("rooms",bk.roomNumber,{status:"Available"}); onUpdate(true); onClose(); };

  if (!open||!bk) return null;
  const isRes = bk.status==="Reserved";
  const isOut = bk.status==="Checked Out";

  return (
    <SlideOver open={open} onClose={onClose}
      title={coOk?"Checkout Complete":`${bk.guestName}${bk.roomNumber&&bk.roomNumber!=="TBD"?` · Room ${bk.roomNumber}`:""}`}>

      {coOk ? (
        <div className="px-6 py-12 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-600"/>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Checked Out Successfully</h3>
            <p className="text-sm text-slate-500 mt-1">Invoice #{invId} · Total {inrFmt(grand)}</p>
          </div>
          {pdf&&invId&&completedBill&&(
            <div className="flex gap-3">
              <PDFDownloadLink
                document={<InvoicePDF bk={completedBill} invId={invId} gst={gst} hotelSettings={hotelSettings} billingSettings={billingSettings}/>}
                fileName={`${invId}.pdf`}
              >
                <Btn ch={<><FileText size={13}/>GST Invoice</>}/>
              </PDFDownloadLink>
              <PDFDownloadLink
                document={<InvoicePDF bk={completedBill} invId={invId} gst={false} hotelSettings={hotelSettings} billingSettings={billingSettings}/>}
                fileName={`${billingSettings.receiptPrefix || "RCPT"}-${invId}.pdf`}
              >
                <Btn ch={<><Wallet size={13}/>Receipt</>} v="gho"/>
              </PDFDownloadLink>
            </div>
          )}
          {Boolean(window.__STAYINN_LEGACY_PDF__) && pdf&&invId&&(
            <div className="flex gap-3">
              <PDFDownloadLink document={<InvoicePDF bk={{...bk,extras:JSON.stringify(exts)}} invId={invId} gst={gst}/>} fileName={`INV-${invId}.pdf`}>
                <Btn ch={<><FileText size={13}/>GST Invoice</>}/>
              </PDFDownloadLink>
              <PDFDownloadLink document={<InvoicePDF bk={{...bk,extras:JSON.stringify(exts)}} invId={invId} gst={false}/>} fileName={`RCPT-${invId}.pdf`}>
                <Btn ch={<><Wallet size={13}/>Receipt</>} v="gho"/>
              </PDFDownloadLink>
            </div>
          )}
        </div>

      ) : isRes ? (
        <div className="px-6 py-5 space-y-5">
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2"><BedDouble size={14}/>Assign Rooms to Check In</p>
            <div className="space-y-2">
              {relRes.map((res,i)=>{
                const av=getAvail(res.roomType);
                return (
                  <div key={res.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-purple-100">
                    <div><p className="text-sm font-semibold text-slate-700">{res.roomType}</p><p className="text-[10px] text-slate-400">Guest {i+1}</p></div>
                    <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white cursor-pointer"
                      onChange={e=>setAsgn(p=>({...p,[res.id]:e.target.value}))}>
                      <option value="">Pick room</option>
                      {av.map(r=><option key={r.roomNumber} value={r.roomNumber}>{r.roomNumber}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Btn ch={<><LogIn size={14}/>Confirm Check-In</>} onClick={groupCheckin} full/>
            <Btn ch={<><Ban size={14}/>Cancel</>} v="red" onClick={async()=>{ if(!window.confirm("Cancel reservation?")) return; await dbs.deleteDocument("reservations",bk.id); onUpdate(true); onClose(); }}/>
          </div>
        </div>

      ) : (
        <div className="px-6 py-5 space-y-4">

          {/* Info strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Check-In", dFmt(bk.checkIn)+" "+tFmt(bk.checkIn)],
              ["Check-Out", ext
                ? <input type="datetime-local" value={newCO} onChange={e=>setNCO(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 outline-none focus:border-blue-400 w-full"/>
                : dFmt(bk.checkOut)+" "+tFmt(bk.checkOut)],
              ["Rate", `${N}N × ${inrFmt(bk.pricePerNight)}`],
            ].map(([l,v])=>(
              <div key={l} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{l}</p>
                <div className="text-[11px] font-bold text-slate-700">{v}</div>
              </div>
            ))}
          </div>
          {ext
            ? <div className="flex gap-2"><Btn ch={<><Save size={12}/>Save</>} sz="sm" onClick={extendCO}/><Btn ch="Cancel" v="gho" sz="sm" onClick={()=>setExt(false)}/></div>
            : !isOut&&<button onClick={()=>setExt(true)} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"><Edit2 size={11}/>Extend stay</button>}

          {/* ID previews */}
          {(bk.idFront||bk.idBack)&&(
            <div className="flex gap-2">
              {[bk.idFront,bk.idBack].filter(Boolean).map((u,i)=>(
                <div key={i} className="group relative cursor-pointer" onClick={()=>setZoom(u)}>
                  <img src={u} className="h-11 w-[72px] rounded-lg border border-slate-200 object-cover"/>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center"><Eye size={12} className="text-white"/></div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          {!isOut&&(
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {[["pay","Payments",<CreditCard size={12}/>],["ext","Extras",<ShoppingBag size={12}/>],["bill","Custom Bill",<FileText size={12}/>]].map(([id,l,ic])=>(
                <button key={id} onClick={()=>setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer
                    ${tab===id?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {ic}{l}
                </button>
              ))}
            </div>
          )}

          {/* Payment tab */}
          {tab==="pay"&&!isOut&&(
            <div className="space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Record Payment</p>
              <div className="grid grid-cols-2 gap-2">
                {[["CASH","Cash"],["BANK","Bank"],["UPI","UPI"],["OTA","OTA"]].map(([k,l])=>(
                  <div key={k} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-400 w-10 shrink-0">{l}</span>
                    <span className="text-slate-300 text-xs">₹</span>
                    <input type="number" placeholder="0" value={payF[k]} onChange={e=>setPayF(p=>({...p,[k]:e.target.value}))}
                      className="flex-1 text-sm font-bold bg-transparent outline-none text-slate-700"/>
                  </div>
                ))}
              </div>
              <Btn ch={<><Check size={13}/>Record Payment</>} v="grn" sz="sm" onClick={addPay}/>
            </div>
          )}

          {/* Extras tab */}
          {tab==="ext"&&!isOut&&(
            <div className="space-y-3">
              {/* Quick add */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Add</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_EXTRAS.map(e=>(
                    <button key={e.name} onClick={()=>addQuick(e)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 transition cursor-pointer">
                      {e.icon}{e.name} <span className="text-blue-600">₹{e.amt}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Custom */}
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custom Item</p>
              <div className="flex gap-2">
                <input placeholder="Item name…" value={eName} onChange={e=>setEN(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-400"/>
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input type="number" placeholder="0" value={eAmt} onChange={e=>setEA(e.target.value)}
                    className="w-full pl-7 py-2.5 text-sm font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-400"/>
                </div>
                <Btn ch={<Plus size={14}/>} sz="sm" onClick={addExt}/>
              </div>
              {exts.length>0&&(
                <div className="space-y-1.5">
                  {exts.map((e,i)=>(
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2"><ShoppingBag size={11} className="text-slate-400"/><span className="text-sm text-slate-700">{e.name}</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">₹{e.amount}</span>
                        <button onClick={()=>delExt(i)} className="text-slate-300 hover:text-red-500 cursor-pointer"><X size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==="bill"&&!isOut&&(
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Custom Bill</p>
                    <p className="text-[11px] text-slate-400">Override guest name, billing address, and invoice line items when needed.</p>
                  </div>
                  <button
                    onClick={()=>setCustomBill(current => ({ ...current, enabled: !current.enabled }))}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${customBill.enabled?"bg-blue-500":"bg-slate-300"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${customBill.enabled?"left-5":"left-0.5"}`}/>
                  </button>
                </div>

                {!customBill.enabled ? (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    Auto bill uses the booking guest, business details from Settings, room charges, and extras you add here.
                  </div>
                ) : (
                  <div className="px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput
                        label="Bill To Name"
                        value={customBill.guestName}
                        onChange={e=>updateCustomBill("guestName", e.target.value)}
                        placeholder="Guest or company name"
                      />
                      <Field label="Bill To Address" className="col-span-2">
                        <textarea
                          rows={3}
                          value={customBill.guestAddress}
                          onChange={e=>updateCustomBill("guestAddress", e.target.value)}
                          placeholder="Custom billing address"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition placeholder:text-slate-300 resize-none"
                        />
                      </Field>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-700">Bill Items</p>
                        <div className="flex gap-2">
                          <Btn ch="Reset From Stay" v="sec" sz="sm" onClick={resetCustomBill}/>
                          <Btn ch={<><Plus size={12}/>Add Item</>} sz="sm" onClick={addCustomItem}/>
                        </div>
                      </div>
                      <div className="px-4 py-4 space-y-2">
                        {customBill.items.map((item, index)=>(
                          <div key={`${index}-${item.name}`} className="flex gap-2 items-start">
                            <input
                              value={item.name}
                              onChange={e=>updateCustomItem(index, "name", e.target.value)}
                              placeholder="Item name"
                              className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-400"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.qty}
                              onChange={e=>updateCustomItem(index, "qty", e.target.value)}
                              placeholder="Qty"
                              className="w-20 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-400"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={e=>updateCustomItem(index, "rate", e.target.value)}
                              placeholder="Rate"
                              className="w-28 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-400"
                            />
                            <button onClick={()=>removeCustomItem(index)} className="p-2.5 text-slate-300 hover:text-red-500 cursor-pointer">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Field label="Custom Note">
                      <textarea
                        rows={3}
                        value={customBill.notes}
                        onChange={e=>updateCustomBill("notes", e.target.value)}
                        placeholder="Optional note for this bill"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition placeholder:text-slate-300 resize-none"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction history */}
          {pays.length>0&&(
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transaction History</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {pays.map((p,i)=>(
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">{p.method||p.type||"—"}</span>
                      <span className="text-slate-400">{dFmt(p.date)}</span>
                    </div>
                    <span className="font-bold text-emerald-700">₹{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill summary */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            {!isOut&&(
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600">GST {taxRate}%</span>
                <button onClick={()=>setGst(g=>!g)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${gst?"bg-blue-500":"bg-slate-300"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${gst?"left-5":"left-0.5"}`}/>
                </button>
              </div>
            )}
            <div className="px-4 py-3.5 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Room ({N}N × {inrFmt(bk.pricePerNight||0)})</span><span>{inrFmt(rent)}</span></div>
              {extT>0&&<div className="flex justify-between text-slate-600"><span>Extras</span><span>{inrFmt(extT)}</span></div>}
              {disc>0&&<div className="flex justify-between text-slate-600"><span>Discount</span><span>−{inrFmt(disc)}</span></div>}
              {gst&&<div className="flex justify-between text-slate-600"><span>GST ({taxRate}%)</span><span>{money(gstA)}</span></div>}
              <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100"><span>Grand Total</span><span>{money(grand)}</span></div>
              <div className="flex justify-between font-semibold text-sm text-emerald-700"><span>Paid</span><span>{money(paid)}</span></div>
              <div className={`flex justify-between font-extrabold text-lg rounded-xl px-3 py-2.5 mt-1 ${bal>0?"bg-red-50 text-red-600":"bg-emerald-50 text-emerald-700"}`}>
                <span>{bal>0?"Balance Due":"Overpaid"}</span>
                <span>{money(Math.abs(bal))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!coOk&&!isRes&&(
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          {isOut
            ? <Btn ch={<><Sparkles size={14}/>Mark Room Ready</>} v="grn" full onClick={markReady}/>
            : <>
                <Btn ch={<Ban size={14}/>} v="red" sz="sm"
                  onClick={async()=>{ if(!window.confirm("Cancel?")) return; await dbs.addAutoIdDocument("history",{...bk,status:"Cancelled",actualCheckOut:new Date().toISOString()}); await dbs.deleteDocument("bookings",bk.id); await dbs.editDocument("rooms",bk.roomNumber,{status:"Available"}); onUpdate(true); onClose(); }}/>
                <Btn ch={busy?<><RefreshCw size={13} className="animate-spin"/>…</>:"Checkout"} full onClick={checkout} disabled={busy}/>
              </>}
        </div>
      )}

      {zoom&&(
        <div className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-4" onClick={()=>setZoom(null)}>
          <img src={zoom} className="max-w-full max-h-full rounded-2xl shadow-2xl"/>
          <button className="absolute top-4 right-4 text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer"><X size={22}/></button>
        </div>
      )}
    </SlideOver>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE — Gantt-style reservation calendar
// ═══════════════════════════════════════════════════════════════════════════════
const Timeline = ({ bookings, reservations, rooms, onRoomClick }) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [origin, setOrigin] = useState(new Date(today));
  const DAYS = 14;
  const days = Array.from({length:DAYS},(_,i)=>{ const d=new Date(origin); d.setDate(d.getDate()+i); return d; });
  const sortedRooms = [...rooms].sort((a,b)=>String(a.roomNumber).localeCompare(String(b.roomNumber),undefined,{numeric:true}));

  const blocks = roomNum => {
    return [...bookings,...reservations].filter(b=>b.roomNumber===roomNum).map(b=>{
      const s=new Date(b.checkIn); s.setHours(0,0,0,0);
      const e=b.checkOut?new Date(b.checkOut):new Date(s.getTime()+86400000); e.setHours(0,0,0,0);
      const so=Math.max(0,Math.round((s-origin)/86400000));
      const eo=Math.min(DAYS,Math.round((e-origin)/86400000));
      if (eo<=0||so>=DAYS) return null;
      return {...b,so,w:eo-so};
    }).filter(Boolean);
  };

  const BLK_C = {
    Occupied: { bg:"#dbeafe", bd:"#93c5fd", tx:"#1d4ed8" },
    Reserved: { bg:"#f3e8ff", bd:"#d8b4fe", tx:"#6b21a8" },
    default:  { bg:"#f1f5f9", bd:"#cbd5e1", tx:"#475569" },
  };
  const COL_W = 120;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header controls */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <button onClick={()=>setOrigin(d=>{const n=new Date(d);n.setDate(n.getDate()-7);return n;})}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"><ChevronLeft size={15}/></button>
          <span className="text-sm font-bold text-slate-700 min-w-[200px] text-center">
            {days[0].toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — {days[DAYS-1].toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
          </span>
          <button onClick={()=>setOrigin(d=>{const n=new Date(d);n.setDate(n.getDate()+7);return n;})}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"><ChevronRight size={15}/></button>
          <button onClick={()=>setOrigin(new Date(today))}
            className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">Today</button>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          {[["Occupied","#dbeafe"],["Reserved","#f3e8ff"]].map(([l,bg])=>(
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-slate-200" style={{background:bg}}/>
              <span className="text-slate-400 font-semibold uppercase tracking-wide">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto" style={{minWidth:800}}>
        {/* Day headers */}
        <div className="grid border-b border-slate-100" style={{gridTemplateColumns:`${COL_W}px repeat(${DAYS},1fr)`}}>
          <div className="px-3 py-2 border-r border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Room</div>
          {days.map((d,i)=>{
            const isT=d.toLocaleDateString("en-CA")===today.toLocaleDateString("en-CA");
            const isSun=d.getDay()===0||d.getDay()===6;
            return (
              <div key={i} className={`px-1 py-2 text-center border-r border-slate-50 last:border-0 ${isT?"bg-blue-50":isSun?"bg-slate-50/70":""}`}>
                <p className={`text-[9px] font-bold uppercase tracking-wide ${isT?"text-blue-600":isSun?"text-slate-400":"text-slate-300"}`}>
                  {d.toLocaleDateString("en-US",{weekday:"short"})}
                </p>
                <p className={`text-xs font-bold mt-0.5 ${isT?"text-blue-700":"text-slate-600"}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>

        {/* Room rows */}
        {sortedRooms.map(r=>(
          <div key={r.roomNumber} className="grid border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
            style={{gridTemplateColumns:`${COL_W}px repeat(${DAYS},1fr)`,position:"relative",minHeight:50}}>
            <div className="px-3 py-2 border-r border-slate-100 flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-800">{r.roomNumber}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wide">{r.type?.split(" ")[0]}</span>
            </div>
            {days.map((d,i)=>{
              const isT=d.toLocaleDateString("en-CA")===today.toLocaleDateString("en-CA");
              return <div key={i} className={`border-r border-slate-50 last:border-0 ${isT?"bg-blue-50/40":""}`}/>;
            })}
            {/* Booking blocks */}
            {blocks(r.roomNumber).map((b,bi)=>{
              const c = BLK_C[b.status]||BLK_C.default;
              const LEFT = `calc(${COL_W}px + ${b.so}*((100% - ${COL_W}px)/${DAYS}))`;
              const WIDTH= `calc(${b.w}*((100% - ${COL_W}px)/${DAYS}) - 4px)`;
              return (
                <div key={bi}
                  onClick={()=>onRoomClick&&onRoomClick(r,b.status)}
                  title={`${b.guestName} · ${dFmt(b.checkIn)} → ${dFmt(b.checkOut)}`}
                  className="absolute top-1.5 bottom-1.5 rounded-lg border flex items-center px-2 overflow-hidden cursor-pointer hover:brightness-95 transition"
                  style={{left:LEFT,width:WIDTH,background:c.bg,borderColor:c.bd}}>
                  <p className="text-[11px] font-bold truncate" style={{color:c.tx}}>{b.guestName}</p>
                </div>
              );
            })}
          </div>
        ))}
        {sortedRooms.length===0&&<div className="py-16 text-center text-sm text-slate-400">No rooms configured</div>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY VIEW
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryView = ({
  hotelSettings = DEFAULT_HOTEL_SETTINGS,
  billingSettings = DEFAULT_BILLING_SETTINGS,
}) => {
  const [hist,   setHist]  = useState([]);
  const [start,  setStart] = useState(new Date(Date.now()-7*86400000).toISOString().slice(0,10));
  const [end,    setEnd]   = useState(new Date().toISOString().slice(0,10));
  const [page,   setPage]  = useState(1);
  const [loading,setLoad]  = useState(false);
  const PER = 15;

  const load = async () => {
    setLoad(true);
    try {
      const r = await dbs.readCollection("history",1000);
      const d = (r.data||r||[]).filter(h=>{ const co=h.actualCheckOut||h.checkOut; return co>=start&&co<=end+"T23:59:59"; });
      d.sort((a,b)=>new Date(b.actualCheckOut||b.checkOut)-new Date(a.actualCheckOut||a.checkOut));
      setHist(d); setPage(1);
    } catch(e){ console.error(e); }
    setLoad(false);
  };

  const pages  = Math.ceil(hist.length/PER);
  const slice  = hist.slice((page-1)*PER, page*PER);
  const grouped= slice.reduce((acc,h)=>{ const ds=new Date(h.actualCheckOut||h.checkOut).toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); (acc[ds]=acc[ds]||[]).push(h); return acc; },{});
  const money = value => formatCurrency(value, billingSettings.currencySymbol || "₹");

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5">
        <CalendarRange size={15} className="text-slate-400"/>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="text-sm font-bold text-slate-700 border-0 outline-none bg-transparent cursor-pointer"/>
        <ArrowRight size={13} className="text-slate-300"/>
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="text-sm font-bold text-slate-700 border-0 outline-none bg-transparent cursor-pointer"/>
        <Btn ch={<><Filter size={12}/>Load</>} sz="sm" onClick={load}/>
        {hist.length>0&&<span className="text-xs text-slate-400 ml-auto">{hist.length} records</span>}
        {pages>1&&(
          <div className="flex items-center gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer"><ChevronLeft size={13}/></button>
            <span className="text-xs font-bold text-slate-500">{page}/{pages}</span>
            <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer"><ChevronRight size={13}/></button>
          </div>
        )}
      </div>

      {loading&&<div className="flex justify-center py-16"><RefreshCw size={22} className="animate-spin text-slate-300"/></div>}

      {!loading&&hist.length===0&&(
        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
          <Archive size={32} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-sm text-slate-400">No records found. Pick a date range and click Load.</p>
        </div>
      )}

      {Object.entries(grouped).map(([ds,rows])=>(
        <div key={ds} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ds}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {rows.map((h,i)=>(
              <div key={h.id||i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-bold text-xs text-slate-600 shrink-0">
                  {h.roomNumber||"—"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{h.guestName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{h.phone} · {h.roomType} · {h.mode||"AC"} · {nightCount(h.checkIn,h.actualCheckOut||h.checkOut)}N</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-slate-800">{money(parseFloat(h.finalBill||0))}</p>
                  <p className="text-[10px] text-slate-400">{tFmt(h.actualCheckOut||h.checkOut)}</p>
                </div>
                {/* PDF buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {h.invoiceId&&(<>
                    <PDFDownloadLink document={<InvoicePDF bk={h} invId={h.invoiceId} gst={h.gstEnabled} hotelSettings={hotelSettings} billingSettings={billingSettings}/>} fileName={`${h.invoiceId}.pdf`}>
                      <button title="GST Invoice" className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"><FileText size={13}/></button>
                    </PDFDownloadLink>
                    <PDFDownloadLink document={<InvoicePDF bk={h} invId={h.invoiceId} gst={false} hotelSettings={hotelSettings} billingSettings={billingSettings}/>} fileName={`${billingSettings.receiptPrefix || "RCPT"}-${h.invoiceId}.pdf`}>
                      <button title="Receipt" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"><Wallet size={13}/></button>
                    </PDFDownloadLink>
                    <BlobProvider document={<InvoicePDF bk={h} invId={h.invoiceId} gst={h.gstEnabled} hotelSettings={hotelSettings} billingSettings={billingSettings}/>}>
                      {({blob,loading:l})=>(
                        <button disabled={l} onClick={()=>blob&&window.open(URL.createObjectURL(blob),"_blank")}
                          title="Print" className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"><Printer size={13}/></button>
                      )}
                    </BlobProvider>
                  </>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — HotelOperations
// ═══════════════════════════════════════════════════════════════════════════════
export default function HotelOperations() {
  const [rooms,       setRooms] = useState([]);
  const [roomTypes,   setRT]    = useState([]);
  const [pMap,        setPMap]  = useState({});
  const [pDef,        setPDef]  = useState({});
  const [bookings,    setBkgs]  = useState([]);
  const [reservations,setRes]   = useState([]);
  const [byFloor,     setFloor] = useState({});
  const [loading,     setLoad]  = useState(true);
  const [view,        setView]  = useState("rooms");
  const [now,         setNow]   = useState(new Date());
  const [wizard,      setWiz]   = useState({ open:false, mode:"checkin", room:null });
  const [panel,       setPan]   = useState({ open:false, bk:null });
  const [toast,       setToast] = useState(null);
  const [hotelSettings, setHotelSettings] = useState(DEFAULT_HOTEL_SETTINGS);
  const [billingSettings, setBillingSettings] = useState(DEFAULT_BILLING_SETTINGS);

  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(t); },[]);

  const notify = (msg,type="ok") => setToast({msg,type});

  const fetchAll = useCallback(async()=>{
    setLoad(true);
    try {
      const [rR,bR,resR,rtR,pdR,pmR,hotelDoc,billingDoc] = await Promise.all([
        dbs.readCollection("rooms",500),
        dbs.readCollection("bookings",500),
        dbs.readCollection("reservations",500),
        dbs.readCollection("room_types",100),
        dbs.readDocument("pricing_defaults","defaults"),
        dbs.readCollection("pricing",500),
        dbs.readDocument("settings","hotel"),
        dbs.readDocument("settings","billing"),
      ]);
      const rd=(rR.data||rR||[]).sort((a,b)=>String(a.roomNumber).localeCompare(String(b.roomNumber),undefined,{numeric:true}));
      setRooms(rd);
      setFloor(rd.reduce((acc,r)=>{ const f=r.floor||"G"; (acc[f]=acc[f]||[]).push(r); return acc; },{}));
      setBkgs(bR.data||bR||[]);
      setRes(resR.data||resR||[]);
      setRT(rtR.data||rtR||[]);
      setPDef(pdR?.prices||{});
      setHotelSettings(mergeHotelSettings(hotelDoc));
      setBillingSettings(mergeBillingSettings(billingDoc));
      const pmD=pmR.data||pmR||[]; const idx={}; pmD.forEach(d=>{ if(d.date) idx[d.date]=d.prices||{}; }); setPMap(idx);
    } catch(e){ console.error(e); notify("Failed to load data","err"); }
    setLoad(false);
  },[]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const statusOf = r => {
    if (r.status==="Cleaning")    return "Cleaning";
    if (r.status==="Maintenance") return "Maintenance";
    const b = bookings.find(x=>x.roomNumber===r.roomNumber);
    if (b) return (new Date(b.checkOut).getTime()-now.getTime())/60000<=60?"Due Out":"Occupied";
    const rsv = reservations.find(x=>x.roomNumber===r.roomNumber);
    if (rsv) return "Reserved";
    return "Available";
  };

  const handleCard = (r, st) => {
    if (st==="Cleaning") {
      if (window.confirm("Mark room as Available?")) dbs.editDocument("rooms",r.roomNumber,{status:"Available"}).then(()=>fetchAll());
      return;
    }
    if (st==="Occupied"||st==="Due Out") {
      const b=bookings.find(x=>x.roomNumber===r.roomNumber);
      if (b) setPan({open:true,bk:b});
      return;
    }
    if (st==="Reserved") {
      const rsv=reservations.find(x=>x.roomNumber===r.roomNumber);
      if (rsv) setPan({open:true,bk:rsv});
      return;
    }
    setWiz({open:true,mode:"checkin",room:r});
  };

  const occupied  = rooms.filter(r=>statusOf(r)==="Occupied").length;
  const available = rooms.filter(r=>statusOf(r)==="Available").length;
  const cleaning  = rooms.filter(r=>r.status==="Cleaning").length;
  const reserved  = reservations.length;

  const VIEWS = [
    ["rooms",    "Rooms",    <LayoutGrid size={14}/>],
    ["timeline", "Timeline", <CalendarRange size={14}/>],
    ["history",  "History",  <Archive size={14}/>],
  ];
  const STATS = [
    [occupied,  "In House",  BRAND,     "Current stays"],
    [available, "Available", "#22c55e", "Ready now"],
    [reserved,  "Reserved",  "#a855f7", "Upcoming arrivals"],
    [cleaning,  "Cleaning",  "#f59e0b", "Needs attention"],
  ];

  const floorOrder = Object.keys(byFloor).sort((a,b)=>{
    if(a==="G"||a==="Ground") return -1; if(b==="G"||b==="Ground") return 1;
    return parseInt(a)-parseInt(b);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @keyframes rise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .room-card { transition: box-shadow .15s, transform .15s, border-color .15s; }
        .room-card:hover { box-shadow:0 12px 28px -10px rgba(2,96,196,.18); transform:translateY(-2px); }
      `}</style>
      {toast&&<Toast {...toast} onDone={()=>setToast(null)}/>}

      {/* ── Top bar ── */}
      <div className="">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          {/* <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:BRAND}}>
              <CalendarRange size={18} color="#fff"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Bookings</h1>
              <p className="text-xs text-slate-400 mt-0.5">Live room status, check-ins, reservations, and stay history</p>
            </div>
          </div> */}
          <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {VIEWS.map(([id,l,ic])=>(
                <button key={id} onClick={()=>setView(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer
                    ${view===id?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {ic}{l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={fetchAll} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer" title="Refresh">
              <RefreshCw size={14}/>
            </button>
            {/* <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {VIEWS.map(([id,l,ic])=>(
                <button key={id} onClick={()=>setView(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer
                    ${view===id?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {ic}{l}
                </button>
              ))}
            </div> */}
            <Btn ch={<><CalendarRange size={14}/>Reserve</>} v="sec" onClick={()=>setWiz({open:true,mode:"reservation",room:null})}/>
            <Btn ch={<><LogIn size={14}/>Check In</>} onClick={()=>setWiz({open:true,mode:"checkin",room:null})}/>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-8 py-7 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {STATS.map(([value, label, color, helper])=>(
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-2xl font-extrabold" style={{color}}>{value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{label}</p>
              <p className="text-xs text-slate-400 mt-1">{helper}</p>
            </div>
          ))}
        </div>

        {loading&&(
          <div className="flex items-center justify-center py-28">
            <RefreshCw size={22} className="animate-spin text-slate-300"/>
          </div>
        )}

        {/* ROOMS VIEW */}
        {!loading&&view==="rooms"&&(
          <div className="space-y-8">
            {floorOrder.map(fl=>(
              <section key={fl} className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      {fl==="G"||fl==="Ground"?"Ground Floor":`Floor ${fl}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {byFloor[fl].length} room{byFloor[fl].length!==1?"s":""} on this floor
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-slate-200"/>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                  {byFloor[fl].map(r=>{
                    const st  = statusOf(r);
                    const cfg = SC[st]||SC.Available;
                    const bk  = bookings.find(x=>x.roomNumber===r.roomNumber);
                    const isDue = st==="Due Out";
                    return (
                      <button key={r.roomNumber}
                        onClick={()=>handleCard(r,st)}
                        className="room-card text-left p-4 rounded-2xl border bg-white border-slate-100 hover:border-slate-200 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{background:cfg.dot}}/>
                        {isDue&&(
                          <div className="absolute top-2 right-2">
                            <Clock size={11} style={{color:cfg.txt}}/>
                          </div>
                        )}
                        <p className="text-xl font-extrabold text-slate-800 leading-none">{r.roomNumber}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-medium">{r.type?.split(" ")[0]||"—"}</p>
                        <div className="mt-3">
                          <Dot status={st}/>
                        </div>
                        <p className={`text-[11px] mt-3 font-medium truncate ${bk?"text-slate-500":"text-slate-300"}`}>{bk?.guestName || (st==="Available" ? "Ready for next arrival" : "Open room details")}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {rooms.length===0&&(
              <div className="text-center py-28">
                <BedDouble size={40} className="text-slate-200 mx-auto mb-4"/>
                <p className="text-sm text-slate-400">No rooms configured. Add rooms in Room Configuration.</p>
              </div>
            )}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {!loading&&view==="timeline"&&(
          <Timeline
            bookings={bookings} reservations={reservations} rooms={rooms}
            onRoomClick={(r,st)=>handleCard(r,st)}/>
        )}

        {/* HISTORY VIEW */}
        {!loading&&view==="history"&&<HistoryView hotelSettings={hotelSettings} billingSettings={billingSettings}/>}
      </main>

      {/* Wizard */}
      <CheckInWizard
        open={wizard.open} onClose={()=>setWiz(w=>({...w,open:false}))}
        rooms={rooms} roomTypes={roomTypes} pMap={pMap} pDef={pDef}
        existing={[...bookings,...reservations]}
        preRoom={wizard.room} preMode={wizard.mode}
        onDone={()=>{
          setWiz(w=>({...w,open:false}));
          fetchAll();
          notify(wizard.mode==="reservation"?"Reservation saved!":"Guest checked in!");
        }}/>

      {/* Guest panel */}
      <GuestPanel
        open={panel.open} onClose={()=>setPan(p=>({...p,open:false}))}
        booking={panel.bk} rooms={rooms}
        existing={[...bookings,...reservations]}
        hotelSettings={hotelSettings}
        billingSettings={billingSettings}
        onUpdate={reload=>{ if(reload) fetchAll(); }}/>
    </div>
  );
}
