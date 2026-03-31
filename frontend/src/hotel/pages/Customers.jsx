/**
 * Customers.jsx — StayyInn Guest Directory
 *
 * Features:
 *  · Searchable / filterable guest list with live stay status
 *  · Guest profile drawer — ID photos, stay history, balance summary, members
 *  · Total spent, visits, last visit, outstanding balance per guest
 *  · Edit guest profile (name, phone, email, notes)
 *  · Delete guest (with confirmation)
 *  · Balance = sum of all (finalBill) MINUS sum of all payments across history
 *
 * DB collections read:
 *  customers    — guest profiles
 *  history      — checked-out stays
 *  bookings     — currently occupied
 *  reservations — upcoming
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Search, X, Eye, EyeOff, ChevronRight,
  Phone, Mail, MapPin, Calendar, BedDouble, IndianRupee,
  Clock, Check, AlertTriangle, CheckCircle2, Edit3,
  Trash2, Save, Loader2, RefreshCw, ArrowRight,
  User, BadgeCheck, Star, TrendingUp, Wallet,
  FileText, History, ChevronDown, ChevronUp,
  Shield, SlidersHorizontal, Download,
} from "lucide-react";
import {
  Page, Text, View, Document, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import dbs from "../api/db";

// ─── Brand ────────────────────────────────────────────────────────────────────
const B  = "#037ffc";
const BD = "#0260c4";
const BL = "#e8f3ff";

// ─── Utils ────────────────────────────────────────────────────────────────────
const zp      = n => String(n).padStart(2,"0");
const dFmt    = d => { const x=new Date(d); return `${zp(x.getDate())}/${zp(x.getMonth()+1)}/${x.getFullYear()}`; };
const tFmt    = d => new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
const parseJ  = (s,fb=[]) => { try{return JSON.parse(s)||fb;}catch{return fb;} };
const inr     = n => "₹"+Number(n||0).toLocaleString("en-IN");
const nighCnt = (ci,co) => { const a=new Date(ci); a.setHours(0,0,0,0); const b=new Date(co||new Date()); b.setHours(0,0,0,0); return Math.max(1,Math.round((b-a)/86400000)); };
const relTime = d => {
  const diff=(Date.now()-new Date(d).getTime())/1000;
  if(diff<60) return "Just now";
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  if(diff<604800) return `${Math.floor(diff/86400)}d ago`;
  return dFmt(d);
};

// ─── Shared primitives ────────────────────────────────────────────────────────
const Btn = ({ ch, onClick, disabled, v="pri", sz="md", full }) => {
  const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-[.97] cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${full?"w-full":""}`;
  const sz_  = { xs:"px-2.5 py-1.5 text-xs", sm:"px-3 py-2 text-sm", md:"px-4 py-2.5 text-sm" };
  const v_   = {
    pri: "text-white shadow-sm hover:opacity-90",
    sec: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    gho: "text-gray-500 hover:bg-gray-100",
    red: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={v==="pri"?{background:B}:{}}
      className={`${base} ${sz_[sz]} ${v_[v]}`}>{ch}
    </button>
  );
};

const Label = ({ ch }) => <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{ch}</p>;

const Input = ({ label, icon, ...props }) => (
  <div>
    {label && <Label ch={label}/>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
      <input {...props}
        className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800
          outline-none transition focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff]
          placeholder:text-gray-300 ${icon?"pl-9":""} ${props.className||""}`}/>
    </div>
  </div>
);

const Toast = ({ msg, type, onDone }) => {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return()=>clearTimeout(t); },[]);
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white"
      style={{background:type==="err"?"#dc2626":B, animation:"rise .25s ease"}}>
      {type==="err"?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}{msg}
    </div>
  );
};

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const cfg = {
    "In House":    { bg:"#eff6ff", c:B,        bd:`${B}30`,        label:"In House" },
    "Reserved":    { bg:"#faf5ff", c:"#7c3aed", bd:"#c4b5fd50",    label:"Reserved" },
    "Checked Out": { bg:"#f0fdf4", c:"#16a34a", bd:"#86efac50",    label:"Checked Out" },
    "New":         { bg:"#f9fafb", c:"#6b7280", bd:"#e5e7eb",      label:"New Guest" },
  };
  const s = cfg[status]||cfg["New"];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
      style={{background:s.bg, color:s.c, border:`1px solid ${s.bd}`}}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:s.c}}/>
      {s.label}
    </span>
  );
};

// ─── ID photo viewer ──────────────────────────────────────────────────────────
const IdPhoto = ({ url, label }) => {
  const [zoom, setZoom] = useState(false);
  if (!url) return (
    <div className="flex-1 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
      <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wide">{label} — Not uploaded</p>
    </div>
  );
  return (
    <>
      <div onClick={()=>setZoom(true)}
        className="flex-1 h-20 rounded-xl border border-gray-200 overflow-hidden cursor-pointer group relative">
        <img src={url} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Eye size={16} className="text-white"/>
        </div>
        <div className="absolute bottom-0 left-0 right-0 py-0.5 text-center" style={{background:`${B}cc`}}>
          <span className="text-[8px] font-bold text-white uppercase tracking-widest">{label}</span>
        </div>
      </div>
      {zoom&&(
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={()=>setZoom(false)}>
          <img src={url} className="max-w-full max-h-full rounded-2xl shadow-2xl"/>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-xl cursor-pointer"><X size={22}/></button>
        </div>
      )}
    </>
  );
};

// ─── Stay row in profile ──────────────────────────────────────────────────────
const StayRow = ({ stay, type }) => {
  const pays   = parseJ(stay.payments,[]);
  const extras = parseJ(stay.extras,[]);
  const nights = nighCnt(stay.checkIn, stay.actualCheckOut||stay.checkOut||new Date());
  const rent   = parseInt(stay.pricePerNight||0)*nights;
  const extTot = extras.reduce((s,e)=>s+parseInt(e.amount||0),0);
  const grand  = parseFloat(stay.finalBill||0) || rent+extTot;
  const paid   = pays.reduce((s,p)=>s+parseInt(p.amount||0),0);
  const bal    = Math.round(grand-paid);

  const statusColor = {
    "Checked Out": "#22c55e", "Cancelled":"#ef4444",
    "Occupied":"#037ffc", "Reserved":"#a855f7",
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-100 hover:shadow-md transition-all">
      {/* Left: room badge */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
        style={{background: type==="active"?B:type==="reserved"?"#a855f7":"#6b7280"}}>
        {stay.roomNumber&&stay.roomNumber!=="TBD" ? stay.roomNumber : <BedDouble size={16}/>}
      </div>

      {/* Middle: details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-800">{stay.roomType||"—"}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-white" style={{background: statusColor[stay.status]||"#6b7280"}}>{stay.status}</span>
          {stay.mode&&<span className="text-[10px] text-gray-400 font-semibold">{stay.mode}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><Calendar size={10}/>{dFmt(stay.checkIn)} {tFmt(stay.checkIn)}</span>
          {(stay.checkOut||stay.actualCheckOut)&&<>
            <ArrowRight size={10}/>
            <span>{dFmt(stay.actualCheckOut||stay.checkOut)}</span>
          </>}
          <span className="font-semibold text-gray-500">{nights}N</span>
        </div>
        {stay.invoiceId&&<p className="text-[10px] text-gray-300 mt-0.5">#{stay.invoiceId}</p>}
      </div>

      {/* Right: bill */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-gray-800 text-sm">{inr(grand)}</p>
        <p className="text-[11px] text-emerald-600 font-semibold">Paid {inr(paid)}</p>
        {bal>0&&<p className="text-[11px] text-red-500 font-bold">Due {inr(bal)}</p>}
        {bal<=0&&paid>0&&<p className="text-[11px] text-emerald-500 font-bold">Cleared ✓</p>}
      </div>
    </div>
  );
};

// ─── Guest Profile Drawer ─────────────────────────────────────────────────────
const GuestDrawer = ({ guest, allHistory, activeBookings, reservations, open, onClose, onUpdate, notify }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSave]     = useState(false);
  const [delConf, setDel]     = useState(false);
  const [histOpen, setHist]   = useState(true);

  useEffect(()=>{
    if (!guest||!open) return;
    setEditing(false);
    setForm({ guestName:guest.guestName||"", phone:guest.phone||"", email:guest.email||"", notes:guest.notes||"" });
  },[guest,open]);

  if (!open||!guest) return null;

  // Gather stays
  const ids   = parseJ(guest.idPhotos,[]);
  const mems  = parseJ(guest.lastMembers,[]);
  const hist  = allHistory.filter(h=>h.phone===guest.phone).sort((a,b)=>new Date(b.actualCheckOut||b.checkOut)-new Date(a.actualCheckOut||a.checkOut));
  const active= activeBookings.filter(b=>b.phone===guest.phone);
  const resv  = reservations.filter(r=>r.phone===guest.phone);
  const allStays=[...active,...resv,...hist];

  // Stats
  const totalSpent = hist.reduce((s,h)=>s+parseFloat(h.finalBill||0),0);
  const totalPaid  = hist.reduce((s,h)=>s+parseJ(h.payments,[]).reduce((p2,p)=>p2+parseInt(p.amount||0),0),0);
  const outstanding= Math.round(totalSpent-totalPaid);
  const visits     = hist.length + active.length;

  const save = async () => {
    setSave(true);
    try {
      await dbs.editDocument("customers", guest.id, {
        guestName: form.guestName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
        updatedAt: new Date().toISOString(),
      });
      notify("Guest profile updated","ok");
      setEditing(false);
      onUpdate();
    } catch(e) { notify("Update failed","err"); }
    setSave(false);
  };

  const deleteGuest = async () => {
    try {
      await dbs.deleteDocument("customers", guest.id);
      notify("Guest removed","ok");
      onUpdate(); onClose();
    } catch { notify("Delete failed","err"); }
  };

  const statusNow = active.length>0?"In House":resv.length>0?"Reserved":hist.length>0?"Checked Out":"New";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      {/* Panel */}
      <div className="w-full max-w-[480px] bg-white flex flex-col h-full shadow-2xl"
        style={{boxShadow:"-8px 0 40px rgba(3,127,252,.12), -2px 0 8px rgba(0,0,0,.08)"}}>

        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-100" style={{background:`linear-gradient(135deg, ${BD} 0%, ${B} 100%)`}}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
                {guest.guestName?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                {editing
                  ? <input value={form.guestName} onChange={e=>setForm(f=>({...f,guestName:e.target.value}))}
                      className="bg-white/20 text-white placeholder-white/60 font-bold text-lg rounded-lg px-2 py-0.5 outline-none border border-white/30 w-48"/>
                  : <h2 className="text-lg font-bold text-white leading-tight">{guest.guestName}</h2>}
                <div className="flex items-center gap-2 mt-1">
                  <StatusPill status={statusNow}/>
                  {visits>0&&<span className="text-[10px] text-white/70 font-semibold">{visits} visit{visits!==1?"s":""}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-white/70 hover:bg-white/10 transition cursor-pointer"><X size={18}/></button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              [inr(totalSpent), "Total Spent", Wallet],
              [visits, "Stays", BedDouble],
              [outstanding>0?inr(outstanding):"Clear", "Balance", IndianRupee],
            ].map(([v,l,Icon])=>(
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className={`font-extrabold text-base text-white ${l==="Balance"&&outstanding>0?"text-red-200":""}`}>{v}</p>
                <p className="text-[10px] text-white/60 font-semibold mt-0.5 flex items-center justify-center gap-1"><Icon size={9}/>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Contact & edit */}
          <div className="p-5 space-y-4 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Info</p>
              {!editing
                ? <button onClick={()=>setEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-80 transition"
                    style={{color:B}}>
                    <Edit3 size={12}/>Edit
                  </button>
                : <div className="flex gap-2">
                    <button onClick={()=>setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer font-semibold">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="text-xs font-bold px-3 py-1 rounded-lg text-white cursor-pointer hover:opacity-90 flex items-center gap-1"
                      style={{background:B}}>
                      {saving?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>}Save
                    </button>
                  </div>}
            </div>

            <div className="space-y-3">
              {editing ? (
                <>
                  <Input label="Phone" icon={<Phone size={13}/>} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+91 00000 00000"/>
                  <Input label="Email" icon={<Mail size={13}/>} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="guest@email.com"/>
                  <div>
                    <Label ch="Notes"/>
                    <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                      rows={2} placeholder="Any special notes about this guest…"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] resize-none transition"/>
                  </div>
                </>
              ) : (
                <>
                  {[
                    [<Phone size={13}/>, guest.phone||"—"],
                    [<Mail size={13}/>, guest.email||"—"],
                    [<Calendar size={13}/>, guest.lastVisit?`Last visit: ${dFmt(guest.lastVisit)}`:"First time guest"],
                    ...(guest.createdAt?[[<Clock size={13}/>, `Added: ${dFmt(guest.createdAt)}`]]:[]),
                  ].map(([ic,txt],i)=>(
                    <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="text-gray-400 flex-shrink-0">{ic}</span>
                      <span className="font-medium">{txt}</span>
                    </div>
                  ))}
                  {guest.notes&&(
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800 font-medium">
                      💬 {guest.notes}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ID Photos */}
          <div className="p-5 border-b border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">ID Documents</p>
            <div className="flex gap-3">
              <IdPhoto url={ids[0]} label="Front"/>
              <IdPhoto url={ids[1]} label="Back"/>
            </div>
          </div>

          {/* Co-travellers */}
          {mems.length>0&&(
            <div className="p-5 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Known Co-Travellers</p>
              <div className="flex flex-wrap gap-2">
                {mems.map((m,i)=>(
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{background:B}}>{m.name?.[0]?.toUpperCase()||"?"}</div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{m.name}</p>
                      {m.age&&<p className="text-[10px] text-gray-400">Age {m.age}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance breakdown */}
          {(totalSpent>0||active.length>0)&&(
            <div className="p-5 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Balance Summary</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100">
                  <span>Total Billed</span><span className="font-bold text-gray-800">{inr(totalSpent)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100">
                  <span>Total Paid</span><span className="font-bold text-emerald-600">{inr(totalPaid)}</span>
                </div>
                <div className={`flex justify-between text-sm py-2 px-3 rounded-xl font-bold ${outstanding>0?"bg-red-50 text-red-600":"bg-emerald-50 text-emerald-700"}`}>
                  <span>{outstanding>0?"Outstanding Balance":"All Settled"}</span>
                  <span>{outstanding>0?inr(outstanding):"✓ Clear"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stay history */}
          <div className="p-5">
            <button onClick={()=>setHist(h=>!h)}
              className="flex items-center justify-between w-full cursor-pointer group mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Stay History ({allStays.length})
              </p>
              {histOpen?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
            </button>

            {histOpen&&(
              allStays.length===0
                ? <div className="text-center py-8 text-sm text-gray-300">No stays recorded yet.</div>
                : <div className="space-y-3">
                    {active.length>0&&(
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{color:B}}>Currently In House</p>
                        {active.map(s=><StayRow key={s.id} stay={s} type="active"/>)}
                      </>
                    )}
                    {resv.length>0&&(
                      <>
                        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-4">Upcoming Reservations</p>
                        {resv.map(s=><StayRow key={s.id} stay={s} type="reserved"/>)}
                      </>
                    )}
                    {hist.length>0&&(
                      <>
                        {(active.length>0||resv.length>0)&&<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">Past Stays</p>}
                        {hist.map(s=><StayRow key={s.id} stay={s} type="history"/>)}
                      </>
                    )}
                  </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
          <button onClick={()=>setDel(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-red-100 transition cursor-pointer">
            <Trash2 size={14}/>Remove
          </button>
          <div className="flex-1"/>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer">
            Close
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {delConf&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{background:"rgba(2,14,30,.72)"}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500"/></div>
            <h3 className="text-base font-bold text-gray-900 text-center">Remove {guest.guestName}?</h3>
            <p className="text-sm text-gray-400 text-center mt-1">This removes the guest profile only. Past stays remain in history.</p>
            <div className="flex gap-3 mt-5">
              <Btn ch="Cancel" v="sec" full onClick={()=>setDel(false)}/>
              <Btn ch={<><Trash2 size={13}/>Remove</>} v="red" full onClick={deleteGuest}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Guest Card (list view) ───────────────────────────────────────────────────
const GuestCard = ({ guest, history, bookings, reservations, onClick }) => {
  const hist   = history.filter(h=>h.phone===guest.phone);
  const active = bookings.filter(b=>b.phone===guest.phone);
  const resv   = reservations.filter(r=>r.phone===guest.phone);
  const visits = hist.length + active.length;

  const totalSpent = hist.reduce((s,h)=>s+parseFloat(h.finalBill||0),0);
  const totalPaid  = hist.reduce((s,h)=>s+parseJ(h.payments,[]).reduce((p2,p)=>p2+parseInt(p.amount||0),0),0);
  const outstanding= Math.round(totalSpent - totalPaid);

  const statusNow = active.length>0?"In House":resv.length>0?"Reserved":hist.length>0?"Checked Out":"New";

  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group p-5 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
        style={{background: active.length>0?B:resv.length>0?"#a855f7":"#94a3b8"}}>
        {guest.guestName?.[0]?.toUpperCase()||"?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-800 text-sm truncate">{guest.guestName}</p>
          <StatusPill status={statusNow}/>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
          <Phone size={9}/>{guest.phone||"—"}
          {guest.email&&<><span className="text-gray-200">·</span><Mail size={9}/><span className="truncate max-w-[100px]">{guest.email}</span></>}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 font-semibold">
          <span className="flex items-center gap-1"><BedDouble size={9}/>{visits} stay{visits!==1?"s":""}</span>
          {totalSpent>0&&<span className="flex items-center gap-1"><TrendingUp size={9}/>Spent {inr(Math.round(totalSpent))}</span>}
          {guest.lastVisit&&<span className="flex items-center gap-1"><Clock size={9}/>{relTime(guest.lastVisit)}</span>}
        </div>
      </div>

      {/* Balance + arrow */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {outstanding>0&&(
          <div className="text-right">
            <p className="text-[10px] text-red-400 font-semibold">Balance</p>
            <p className="text-sm font-bold text-red-500">{inr(outstanding)}</p>
          </div>
        )}
        {outstanding<=0&&totalSpent>0&&(
          <div className="text-right">
            <p className="text-[10px] text-emerald-400 font-semibold">Cleared</p>
            <p className="text-sm font-bold text-emerald-500">{inr(Math.round(totalSpent))}</p>
          </div>
        )}
        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#037ffc] transition-colors"/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Customers
// ═══════════════════════════════════════════════════════════════════════════════
export default function Customers() {
  const [customers,     setCust]   = useState([]);
  const [history,       setHist]   = useState([]);
  const [bookings,      setBkgs]   = useState([]);
  const [reservations,  setResv]   = useState([]);
  const [loading,       setLoad]   = useState(true);
  const [search,        setSearch] = useState("");
  const [statusFilter,  setSF]     = useState("all");
  const [sortBy,        setSort]   = useState("recent");
  const [selected,      setSel]    = useState(null);
  const [drawerOpen,    setDrawer] = useState(false);
  const [toast,         setToast]  = useState(null);

  const notify = (msg,type="ok") => setToast({msg,type});

  const load = useCallback(async()=>{
    setLoad(true);
    try {
      const [cR,hR,bR,rR] = await Promise.all([
        dbs.readCollection("customers",1000),
        dbs.readCollection("history",1000),
        dbs.readCollection("bookings",500),
        dbs.readCollection("reservations",500),
      ]);
      setCust(cR.data||cR||[]);
      setHist(hR.data||hR||[]);
      setBkgs(bR.data||bR||[]);
      setResv(rR.data||rR||[]);
    } catch(e){ console.error(e); }
    setLoad(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Enrich customers with computed fields for sorting/filtering
  const enriched = customers.map(c=>{
    const hist   = history.filter(h=>h.phone===c.phone);
    const active = bookings.filter(b=>b.phone===c.phone);
    const resv   = reservations.filter(r=>r.phone===c.phone);
    const totalSpent = hist.reduce((s,h)=>s+parseFloat(h.finalBill||0),0);
    const totalPaid  = hist.reduce((s,h)=>s+parseJ(h.payments,[]).reduce((p,pay)=>p+parseInt(pay.amount||0),0),0);
    const bal = Math.round(totalSpent-totalPaid);
    return { ...c, _hist:hist, _active:active, _resv:resv, _visits:hist.length+active.length, _spent:totalSpent, _bal:bal,
      _status: active.length>0?"inhouse":resv.length>0?"reserved":hist.length>0?"visited":"new" };
  });

  // Filter
  const SF_MAP = { all:null, inhouse:"inhouse", reserved:"reserved", balance: c=>c._bal>0, new:"new" };
  const filtered = enriched.filter(c=>{
    const matchSearch = !search||[c.guestName,c.phone,c.email].some(f=>f?.toLowerCase().includes(search.toLowerCase()));
    const sf = SF_MAP[statusFilter];
    const matchStatus = !sf || (typeof sf==="function"?sf(c):c._status===sf);
    return matchSearch && matchStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a,b)=>{
    if(sortBy==="recent") return new Date(b.lastVisit||b.createdAt||0)-new Date(a.lastVisit||a.createdAt||0);
    if(sortBy==="name")   return a.guestName?.localeCompare(b.guestName||"");
    if(sortBy==="spent")  return b._spent-a._spent;
    if(sortBy==="visits") return b._visits-a._visits;
    if(sortBy==="balance")return b._bal-a._bal;
    return 0;
  });

  // Aggregate stats
  const stats = {
    total:    customers.length,
    inhouse:  bookings.reduce((s,b)=>{ const p=b.phone; return s.includes(p)?s:[...s,p]; },[]).length,
    reserved: reservations.reduce((s,r)=>{ const p=r.phone; return s.includes(p)?s:[...s,p]; },[]).length,
    withBal:  enriched.filter(c=>c._bal>0).length,
    totalDue: enriched.reduce((s,c)=>s+(c._bal>0?c._bal:0),0),
  };

  const openDrawer = c => { setSel(c); setDrawer(true); };

  const SORT_OPTIONS = [
    ["recent","Last Visit"],["name","Name A–Z"],["spent","Top Spender"],
    ["visits","Most Stays"],["balance","Balance Due"],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>

      {toast&&<Toast {...toast} onDone={()=>setToast(null)}/>}

      {/* ── Header ── */}
      {/*<div className="bg-white border-b border-gray-100 sticky top-0 z-30"
        style={{boxShadow:"0 1px 3px rgba(3,127,252,.06)"}}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{background:B}}>
              <Users size={16}/>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Guests</h1>
              <p className="text-xs text-gray-400 mt-0.5">{customers.length} guest{customers.length!==1?"s":""} in directory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition cursor-pointer" title="Refresh">
              <RefreshCw size={15} className={loading?"animate-spin":""}/>
            </button>
          </div>
        </div>
      </div>*/}

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            [stats.total,    "Total Guests",   B,        null],
            [stats.inhouse,  "In House",       "#f97316","inhouse"],
            [stats.reserved, "Upcoming",       "#a855f7","reserved"],
            [stats.withBal,  "Have Balance",   "#ef4444","balance"],
            [inr(stats.totalDue),"Total Due",  "#dc2626",null],
          ].map(([v,l,c,sf])=>(
            <div key={l} onClick={sf?()=>setSF(f=>f===sf?"all":sf):undefined}
              className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${sf?"cursor-pointer hover:shadow-md":""} ${statusFilter===sf?"ring-2 ring-[#037ffc] border-[#037ffc]/20":""}`}
              style={{borderColor: statusFilter===sf?`${B}40`:"#f3f4f6"}}>
              <p className="text-2xl font-extrabold" style={{color:c}}>{v}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* ── Search & filters ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder="Search by name, phone, email…" value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] transition"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"><X size={14}/></button>}
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {[["all","All"],["inhouse","In House"],["reserved","Reserved"],["balance","Has Balance"],["new","New"]].map(([id,l])=>(
              <button key={id} onClick={()=>setSF(f=>f===id?"all":id)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
                style={statusFilter===id?{background:BL,borderColor:`${B}40`,color:BD}:{borderColor:"#e5e7eb",color:"#6b7280",background:"#fff"}}>
                {l}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <SlidersHorizontal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <select value={sortBy} onChange={e=>setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer focus:border-[#037ffc]">
              {SORT_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={26} className="animate-spin" style={{color:B}}/>
          </div>
        ) : sorted.length===0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
            <Users size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400 text-sm font-semibold">
              {search||statusFilter!=="all" ? "No guests match your filters." : "No guests yet. They'll appear here after first check-in."}
            </p>
            {(search||statusFilter!=="all")&&(
              <button onClick={()=>{setSearch("");setSF("all");}}
                className="mt-3 text-xs font-bold cursor-pointer hover:opacity-80 transition" style={{color:B}}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              {sorted.length} {sorted.length!==filtered.length?`of ${filtered.length} `:""} guest{sorted.length!==1?"s":""}
            </p>
            {sorted.map(c=>(
              <GuestCard key={c.id||c.phone}
                guest={c}
                history={history}
                bookings={bookings}
                reservations={reservations}
                onClick={()=>openDrawer(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawerOpen&&(
        <GuestDrawer
          guest={selected}
          allHistory={history}
          activeBookings={bookings}
          reservations={reservations}
          open={drawerOpen}
          onClose={()=>setDrawer(false)}
          onUpdate={()=>{ load(); if(selected){ const updated=customers.find(c=>c.id===selected.id); if(updated) setSel(updated); } }}
          notify={notify}
        />
      )}
    </div>
  );
}