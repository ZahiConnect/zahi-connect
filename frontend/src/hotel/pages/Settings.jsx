/**
 * Settings.jsx — StayyInn Settings
 *
 * Tabs:
 *   1. Business Details  — name, address, phone, GSTIN, email, website,
 *                       logo upload, signature upload, check-in/out times
 *   2. Staff & Users  — CRUD for staff with role, PIN, permissions
 *   3. Billing        — GST toggle, invoice prefix, tax labels
 *   4. Appearance     — invoice styling and branding tools (future)
 *
 * DB collections:
 *   settings  — single doc id="hotel"  (business info)
 *   staff     — auto-id docs            (staff users)
 *
 * Images → dbs.uploadImage(file) → { url }
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2, Users, ReceiptText, Palette,
  Camera, Upload, Eye, EyeOff, X, Check, Plus,
  Trash2, Edit3, Save, RefreshCw, AlertTriangle,
  CheckCircle2, Shield, User, Phone, Mail, Globe,
  MapPin, FileText, Clock, Key, Lock, ChevronDown,
  Hash, Pen, ImageIcon, Star, BadgeCheck, Loader2,
  IndianRupee,
} from "lucide-react";
import dbs from "../api/db";
import {
  BILL_COLOR_PRESETS,
  DEFAULT_BILLING_SETTINGS,
  DEFAULT_HOTEL_SETTINGS,
  mergeBillingSettings,
  mergeHotelSettings,
  normalizeBillColor,
} from "../utils/billing";

// ─── Brand ────────────────────────────────────────────────────────────────────
const B  = "#037ffc";
const BD = "#0260c4";
const BL = "#e8f3ff";

// ─── Roles config ─────────────────────────────────────────────────────────────
const ROLES = [
  { id:"owner",     label:"Owner",       color:"#f59e0b", icon:<Star size={12}/> },
  { id:"manager",   label:"Manager",     color:B,         icon:<BadgeCheck size={12}/> },
  { id:"receptionist",label:"Receptionist",color:"#22c55e",icon:<User size={12}/> },
  { id:"housekeeping",label:"Housekeeping",color:"#a855f7",icon:<Shield size={12}/> },
  { id:"accountant", label:"Accountant",  color:"#f97316", icon:<ReceiptText size={12}/> },
];

const PERMS = [
  { id:"bookings",    label:"Bookings & Check-in" },
  { id:"rooms",       label:"Room Management" },
  { id:"pricing",     label:"Pricing & Calendar" },
  { id:"history",     label:"History & Reports" },
  { id:"settings",    label:"Settings Access" },
  { id:"transactions",label:"Transactions" },
];

const ROLE_DEFAULTS = {
  owner:         ["bookings","rooms","pricing","history","settings","transactions"],
  manager:       ["bookings","rooms","pricing","history","transactions"],
  receptionist:  ["bookings","rooms","history"],
  housekeeping:  ["rooms"],
  accountant:    ["history","transactions"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Shared primitives ────────────────────────────────────────────────────────
const Label = ({ ch }) => (
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{ch}</p>
);

const Input = ({ label, icon, ...props }) => (
  <div>
    {label && <Label ch={label}/>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
      <input {...props}
        className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800
          outline-none transition focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff]
          placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400
          ${icon ? "pl-9" : ""} ${props.className||""}`}
      />
    </div>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div>
    {label && <Label ch={label}/>}
    <textarea {...props}
      className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800
        outline-none transition focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff]
        placeholder:text-gray-300 resize-none ${props.className||""}`}
    />
  </div>
);

const Btn = ({ ch, onClick, disabled, v="pri", sz="md", full, type="button" }) => {
  const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all
    active:scale-[.97] cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${full?"w-full":""}`;
  const sz_  = { xs:"px-2.5 py-1.5 text-xs", sm:"px-3 py-2 text-sm", md:"px-4 py-2.5 text-sm", lg:"px-6 py-3 text-sm" };
  const v_   = {
    pri: "text-white shadow-sm hover:opacity-90",
    sec: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm",
    gho: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
    red: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
    grn: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={v==="pri"?{background:B}:{}}
      className={`${base} ${sz_[sz]} ${v_[v]}`}>{ch}
    </button>
  );
};

const Toggle = ({ on, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    {label && <span className="text-sm text-gray-700 font-medium">{label}</span>}
    <button type="button" onClick={()=>onChange(!on)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{background: on ? B : "#d1d5db"}}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${on?"left-5":"left-0.5"}`}/>
    </button>
  </label>
);

const Card = ({ title, subtitle, icon, children, className="" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
    {(title||subtitle) && (
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        {icon && <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{background:B}}>{icon}</div>}
        <div>
          {title && <h3 className="text-sm font-bold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Toast = ({ msg, type, onDone }) => {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return()=>clearTimeout(t); },[]);
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white"
      style={{background: type==="err"?"#dc2626":B, animation:"rise .25s ease"}}>
      {type==="err"?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}{msg}
    </div>
  );
};

// ─── Image Upload Box ─────────────────────────────────────────────────────────
const ImgUpload = ({ label, hint, url, onUpload, onClear, aspect="square" }) => {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const upload = async file => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await dbs.uploadImage(file);
      onUpload(result.url);
    } catch(e) {
      console.error(e);
      alert("Upload failed. Please try again.");
    }
    setBusy(false);
  };

  const wrapCls = aspect==="wide"
    ? "w-full h-32"
    : "w-28 h-28";

  if (url) return (
    <div className="flex flex-col gap-2">
      {label && <Label ch={label}/>}
      <div className={`${wrapCls} relative rounded-2xl overflow-hidden border-2 border-gray-200 group`}>
        <img src={url} className="w-full h-full object-contain bg-gray-50"/>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
          <button onClick={()=>window.open(url,"_blank")} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"><Eye size={14}/></button>
          <button onClick={onClear} className="p-1.5 bg-red-500/80 hover:bg-red-600/80 rounded-lg text-white transition"><X size={14}/></button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 py-1 text-center" style={{background:`${B}cc`}}>
          <span className="text-[9px] font-bold text-white uppercase tracking-widest">Uploaded ✓</span>
        </div>
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {label && <Label ch={label}/>}
      <div
        className={`${wrapCls} rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all`}
        style={{borderColor: drag?B:"#e5e7eb", background: drag?BL:"#fafafa"}}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0]);}}
        onClick={()=>ref.current?.click()}>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e=>upload(e.target.files[0])}/>
        {busy
          ? <Loader2 size={20} className="animate-spin" style={{color:B}}/>
          : <>
              <Upload size={18} className="mb-1.5" style={{color:drag?B:"#9ca3af"}}/>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Upload</span>
              <span className="text-[9px] text-gray-300 mt-0.5">or drag & drop</span>
            </>}
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const r = ROLES.find(x=>x.id===role)||ROLES[2];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
      style={{background:`${r.color}15`, color:r.color, border:`1px solid ${r.color}30`}}>
      {r.icon}{r.label}
    </span>
  );
};

// ─── Staff Modal ──────────────────────────────────────────────────────────────
const StaffModal = ({ open, onClose, existing, onSave }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name:"", role:"receptionist", phone:"", email:"",
    pin:"", confirmPin:"", active:true,
    permissions: ROLE_DEFAULTS.receptionist,
  });
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy]      = useState(false);
  const [err,  setErr]       = useState("");

  useEffect(()=>{
    if (!open) return;
    setErr("");
    setShowPin(false);
    if (isEdit) {
      setForm({
        name: existing.name||"",
        role: existing.role||"receptionist",
        phone: existing.phone||"",
        email: existing.email||"",
        pin:"", confirmPin:"",
        active: existing.active!==false,
        permissions: existing.permissions||ROLE_DEFAULTS[existing.role||"receptionist"]||[],
      });
    } else {
      setForm({ name:"", role:"receptionist", phone:"", email:"", pin:"", confirmPin:"", active:true, permissions:ROLE_DEFAULTS.receptionist });
    }
  },[open, existing]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const togglePerm = id => set("permissions", form.permissions.includes(id) ? form.permissions.filter(x=>x!==id) : [...form.permissions,id]);
  const setRole = r => set("permissions", ROLE_DEFAULTS[r]||[]);

  const save = async () => {
    setErr("");
    if (!form.name.trim()) { setErr("Name is required."); return; }
    if (!isEdit && !form.pin) { setErr("PIN is required for new staff."); return; }
    if (form.pin && form.pin !== form.confirmPin) { setErr("PINs do not match."); return; }
    if (form.pin && (form.pin.length < 4)) { setErr("PIN must be at least 4 digits."); return; }
    setBusy(true);
    const doc = {
      name: form.name.trim(), role: form.role, phone: form.phone.trim(),
      email: form.email.trim(), active: form.active, permissions: form.permissions,
      updatedAt: new Date().toISOString(),
    };
    if (form.pin) doc.pin = form.pin; // Only update pin if provided
    try {
      if (isEdit) await dbs.editDocument("staff", existing.id, doc);
      else        await dbs.addAutoIdDocument("staff", {...doc, createdAt: new Date().toISOString()});
      onSave();
    } catch(e) { console.error(e); setErr("Save failed. Try again."); }
    setBusy(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:"rgba(2,14,30,.72)", backdropFilter:"blur(6px)"}}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{maxHeight:"90vh", boxShadow:`0 32px 80px -10px rgba(3,127,252,.18),0 8px 32px rgba(0,0,0,.16)`}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{background:BL}}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{background:B}}>
              <User size={15}/>
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{color:BD}}>{isEdit?"Edit Staff Member":"Add Staff Member"}</h2>
              {isEdit && <p className="text-[10px] text-gray-400">Leave PIN blank to keep existing</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/80 transition cursor-pointer"><X size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" placeholder="e.g. Ravi Kumar" value={form.name} onChange={e=>set("name",e.target.value)} icon={<User size={13}/>}/>
            <div>
              <Label ch="Role *"/>
              <div className="relative">
                <select value={form.role}
                  onChange={e=>{ set("role",e.target.value); setRole(e.target.value); }}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-[#037ffc]">
                  {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" placeholder="+91 00000 00000" value={form.phone} onChange={e=>set("phone",e.target.value)} icon={<Phone size={13}/>}/>
            <Input label="Email" placeholder="staff@hotel.com" value={form.email} onChange={e=>set("email",e.target.value)} icon={<Mail size={13}/>}/>
          </div>

          {/* PIN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label ch={isEdit?"New PIN (optional)":"PIN *"}/>
              <div className="relative">
                <input type={showPin?"text":"password"} placeholder="Min 4 digits" value={form.pin}
                  onChange={e=>set("pin",e.target.value.replace(/\D/g,""))}
                  maxLength={8}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pl-9 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] transition"/>
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <button type="button" onClick={()=>setShowPin(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPin?<EyeOff size={13}/>:<Eye size={13}/>}
                </button>
              </div>
            </div>
            <div>
              <Label ch="Confirm PIN"/>
              <div className="relative">
                <input type={showPin?"text":"password"} placeholder="Re-enter PIN" value={form.confirmPin}
                  onChange={e=>set("confirmPin",e.target.value.replace(/\D/g,""))}
                  maxLength={8}
                  className={`w-full rounded-xl border bg-white px-3 py-2.5 pl-9 text-sm text-gray-800 outline-none focus:ring-2 transition
                    ${form.confirmPin&&form.pin!==form.confirmPin?"border-red-300 focus:border-red-400 focus:ring-red-100":"border-gray-200 focus:border-[#037ffc] focus:ring-[#e8f3ff]"}`}/>
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <Label ch="Permissions"/>
            <div className="grid grid-cols-2 gap-2">
              {PERMS.map(p=>(
                <label key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all"
                  style={{borderColor: form.permissions.includes(p.id)?`${B}40`:"#e5e7eb", background: form.permissions.includes(p.id)?BL:"#fafafa"}}>
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{background: form.permissions.includes(p.id)?B:"#e5e7eb"}}>
                    {form.permissions.includes(p.id)&&<Check size={10} className="text-white"/>}
                  </div>
                  <input type="checkbox" className="hidden" checked={form.permissions.includes(p.id)} onChange={()=>togglePerm(p.id)}/>
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Toggle on={form.active} onChange={v=>set("active",v)} label="Account Active"/>
            <p className="text-[11px] text-gray-400 mt-1">Inactive accounts cannot log in to the system.</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              <AlertTriangle size={13}/>{err}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <Btn ch="Cancel" v="sec" onClick={onClose}/>
          <Btn ch={busy?<><Loader2 size={13} className="animate-spin"/>Saving…</>:<><Save size={13}/>{isEdit?"Save Changes":"Add Staff"}</>} disabled={busy} onClick={save}/>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Business Details
// ═══════════════════════════════════════════════════════════════════════════════
const HotelTab = ({ toast }) => {
  const [info, setInfo] = useState(DEFAULT_HOTEL_SETTINGS);
  const [orig, setOrig]   = useState(DEFAULT_HOTEL_SETTINGS);
  const [saving, setSave] = useState(false);
  const [loaded, setLoad] = useState(false);

  const fetch = useCallback(async()=>{
    try {
      const doc = await dbs.readDocument("settings","hotel");
      const next = mergeHotelSettings(doc);
      setInfo(next);
      setOrig(next);
    } catch (error) {
      console.error(error);
    }
    setLoad(true);
  },[]);

  useEffect(()=>{ fetch(); },[fetch]);

  const set = (k,v) => setInfo(i=>({...i,[k]:v}));
  const save = async () => {
    setSave(true);
    try {
      const payload = { ...mergeHotelSettings(info) };
      const existing = await dbs.readDocument("settings","hotel").catch(()=>null);
      if (existing) await dbs.editDocument("settings","hotel",{...payload, updatedAt:new Date().toISOString()});
      else          await dbs.addDocument ("settings","hotel",{...payload, createdAt:new Date().toISOString()});
      setInfo(payload);
      setOrig(payload);
      toast("Business details saved!","ok");
    } catch(e) { console.error(e); toast("Save failed.","err"); }
    setSave(false);
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin" style={{color:B}}/>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Identity */}
      <Card title="Business Identity" subtitle="Core details shown on invoices and receipts" icon={<Building2 size={15}/>}>
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <Input label="Business / Property Name *" placeholder="e.g. Hotel GS Suites"
              value={info.name} onChange={e=>set("name",e.target.value)}/>
          </div>
          <Textarea label="Full Address" placeholder="Street, Area, City, State — Pincode"
            value={info.addr} onChange={e=>set("addr",e.target.value)} rows={3}/>
          <div className="space-y-4">
            <Input label="Phone" placeholder="+91 90350 99375" value={info.phone}
              onChange={e=>set("phone",e.target.value)} icon={<Phone size={13}/>}/>
            <Input label="Email" placeholder="hotel@example.com" value={info.email}
              onChange={e=>set("email",e.target.value)} icon={<Mail size={13}/>}/>
            <Input label="Website" placeholder="www.hotelgssuites.com" value={info.website}
              onChange={e=>set("website",e.target.value)} icon={<Globe size={13}/>}/>
          </div>
          <div>
            <Input label="GSTIN" placeholder="29ABCDE1234F1Z5" value={info.gstin}
              onChange={e=>set("gstin",e.target.value.toUpperCase())} icon={<Hash size={13}/>}/>
            <p className="text-[11px] text-gray-400 mt-1.5">GST number printed on tax invoices. Leave blank if not registered.</p>
          </div>
          <div>
            <Textarea label="Invoice Footer Note" placeholder="Thank you for your stay. We hope to see you again!"
              value={info.invoiceFooter} onChange={e=>set("invoiceFooter",e.target.value)} rows={3}/>
          </div>
        </div>
      </Card>

      {/* Check-in / out times */}
      <Card title="Standard Timings" subtitle="Default check-in and check-out times" icon={<Clock size={15}/>}>
        <div className="grid grid-cols-2 gap-5 max-w-sm">
          <div>
            <Label ch="Check-In Time"/>
            <input type="time" value={info.checkInTime} onChange={e=>set("checkInTime",e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] transition"/>
          </div>
          <div>
            <Label ch="Check-Out Time"/>
            <input type="time" value={info.checkOutTime} onChange={e=>set("checkOutTime",e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] transition"/>
          </div>
        </div>
      </Card>

      {/* Branding */}
      <Card title="Branding & Signature" subtitle="Images used on invoices and receipts" icon={<ImageIcon size={15}/>}>
        <div className="grid grid-cols-2 gap-8">
          <ImgUpload
            label="Business Logo"
            hint="Shown on invoices. Recommended: PNG transparent, 400×200px."
            aspect="wide"
            url={info.logo}
            onUpload={url=>set("logo",url)}
            onClear={()=>set("logo","")}
          />
          <ImgUpload
            label="Authorised Signature"
            hint="Printed at the bottom of invoices. Recommended: PNG transparent, 300×120px."
            aspect="wide"
            url={info.signature}
            onUpload={url=>set("signature",url)}
            onClear={()=>set("signature","")}
          />
        </div>

        {/* Live invoice preview strip */}
        {(info.name||info.logo) && (
          <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Invoice Preview</p>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start border-b-2 pb-3 mb-3" style={{borderColor:B}}>
                <div className="flex items-center gap-3">
                  {info.logo
                    ? <img src={info.logo} className="h-10 object-contain"/>
                    : <div className="h-10 w-20 rounded bg-gray-100 flex items-center justify-center"><ImageIcon size={14} className="text-gray-300"/></div>}
                  <div>
                    <p className="font-bold text-sm" style={{color:B}}>{info.name||"HOTEL NAME"}</p>
                    <p className="text-[10px] text-gray-400">{info.addr||"Address"}</p>
                    {info.gstin&&<p className="text-[10px] text-gray-400">GSTIN: {info.gstin}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-700">TAX INVOICE</p>
                  <p className="text-xs" style={{color:B}}>#INV-0001</p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                {info.signature
                  ? <div className="text-center"><img src={info.signature} className="h-10 object-contain mx-auto mb-1"/><p className="text-[10px] text-gray-500 border-t border-gray-300 pt-1 min-w-[100px]">Authorised Signatory</p></div>
                  : <div className="text-center"><div className="h-10 w-24 rounded bg-gray-100 mb-1"/><p className="text-[10px] text-gray-400 border-t pt-1">Authorised Signatory</p></div>}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-6">
        <Btn ch="Discard Changes" v="sec" onClick={()=>{ setInfo({...orig}); }} disabled={saving}/>
        <Btn ch={saving?<><Loader2 size={14} className="animate-spin"/>Saving…</>:<><Save size={14}/>Save Business Details</>} disabled={saving} onClick={save}/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Staff & Users
// ═══════════════════════════════════════════════════════════════════════════════
const StaffTab = ({ toast }) => {
  const [staff,   setStaff]  = useState([]);
  const [loading, setLoad]   = useState(true);
  const [modal,   setModal]  = useState({ open:false, staff:null });
  const [delConf, setDel]    = useState(null);
  const [search,  setSearch] = useState("");
  const [roleF,   setRoleF]  = useState("all");

  const load = useCallback(async()=>{
    setLoad(true);
    try {
      const r = await dbs.readCollection("staff",200);
      setStaff(r.data||r||[]);
    } catch(e){ console.error(e); }
    setLoad(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const deleteStaff = async id => {
    try {
      await dbs.deleteDocument("staff",id);
      toast("Staff member removed","ok");
      load();
    } catch { toast("Delete failed","err"); }
    setDel(null);
  };

  const toggleActive = async s => {
    await dbs.editDocument("staff",s.id,{active:!s.active});
    toast(s.active?"Account deactivated":"Account activated","ok");
    load();
  };

  const filtered = staff.filter(s=>{
    const matchS = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchR = roleF==="all" || s.role===roleF;
    return matchS && matchR;
  });

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <input placeholder="Search by name, phone, email…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#037ffc] focus:ring-2 focus:ring-[#e8f3ff] transition"/>
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        </div>
        <div className="relative">
          <select value={roleF} onChange={e=>setRoleF(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm text-gray-700 outline-none focus:border-[#037ffc] cursor-pointer">
            <option value="all">All Roles</option>
            {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
        <Btn ch={<><Plus size={14}/>Add Staff</>} onClick={()=>setModal({open:true,staff:null})}/>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          [staff.length, "Total Staff", "#037ffc"],
          [staff.filter(s=>s.active!==false).length, "Active", "#22c55e"],
          [staff.filter(s=>s.active===false).length, "Inactive", "#f97316"],
          [new Set(staff.map(s=>s.role)).size, "Roles", "#a855f7"],
        ].map(([v,l,c])=>(
          <div key={l} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-extrabold" style={{color:c}}>{v}</p>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{color:B}}/></div>
      ) : filtered.length===0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
          <Users size={36} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm text-gray-400">{search||roleF!=="all"?"No staff match your filters.":"No staff added yet. Click 'Add Staff' to begin."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["Staff Member","Role","Contact","Permissions","Status",""].map(h=>(
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>(
                <tr key={s.id||i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{background: ROLES.find(r=>r.id===s.role)?.color||B}}>
                        {s.name?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.email||"—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={s.role}/></td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-gray-600 font-medium">{s.phone||"—"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(s.permissions||[]).slice(0,3).map(p=>(
                        <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{p}</span>
                      ))}
                      {(s.permissions||[]).length>3&&<span className="text-[9px] text-gray-400">+{s.permissions.length-3}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={()=>toggleActive(s)}
                      className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                      style={{background: s.active!==false?B:"#d1d5db"}}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${s.active!==false?"left-5":"left-0.5"}`}/>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setModal({open:true,staff:s})}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#037ffc] transition cursor-pointer">
                        <Edit3 size={14}/>
                      </button>
                      <button onClick={()=>setDel(s)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition cursor-pointer">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff modal */}
      <StaffModal
        open={modal.open}
        existing={modal.staff}
        onClose={()=>setModal(m=>({...m,open:false}))}
        onSave={()=>{ setModal(m=>({...m,open:false})); load(); toast(modal.staff?"Staff updated!":"Staff added!","ok"); }}
      />

      {/* Delete confirm */}
      {delConf&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(2,14,30,.72)"}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500"/>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center">Remove {delConf.name}?</h3>
            <p className="text-sm text-gray-500 text-center mt-1">This cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <Btn ch="Cancel" v="sec" full onClick={()=>setDel(null)}/>
              <Btn ch="Remove" v="red" full onClick={()=>deleteStaff(delConf.id)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Billing & Invoice
// ═══════════════════════════════════════════════════════════════════════════════
const BillingTab = ({ toast }) => {
  const [cfg, setCfg] = useState(DEFAULT_BILLING_SETTINGS);
  const [hotelInfo, setHotelInfo] = useState(DEFAULT_HOTEL_SETTINGS);
  const [saving, setSave] = useState(false);
  const [loaded, setLoad] = useState(false);

  useEffect(()=>{
    Promise.all([
      dbs.readDocument("settings","billing"),
      dbs.readDocument("settings","hotel"),
    ])
      .then(([billingDoc, hotelDoc])=>{
        setCfg(mergeBillingSettings(billingDoc));
        setHotelInfo(mergeHotelSettings(hotelDoc));
        setLoad(true);
      })
      .catch(()=>setLoad(true));
  },[]);

  const set = (k,v) => setCfg(c=>({...c,[k]:v}));
  const setCustom = (k,v) => setCfg(c=>({
    ...c,
    customBillDefaults: {
      ...c.customBillDefaults,
      [k]: v,
    },
  }));
  const save = async () => {
    setSave(true);
    try {
      const payload = {
        ...mergeBillingSettings(cfg),
        billColor: normalizeBillColor(cfg.billColor),
      };
      const ex = await dbs.readDocument("settings","billing").catch(()=>null);
      if(ex) await dbs.editDocument("settings","billing",payload);
      else   await dbs.addDocument ("settings","billing",payload);
      setCfg(payload);
      toast("Billing settings saved!","ok");
    } catch (error) {
      console.error(error);
      toast("Save failed.","err");
    }
    setSave(false);
  };

  if (!loaded) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin" style={{color:B}}/></div>;

  return (
    <div className="space-y-6">
      <Card title="GST & Tax" subtitle="Tax settings for invoices" icon={<ReceiptText size={15}/>}>
        <div className="space-y-4">
          <Toggle on={cfg.gstEnabled} onChange={v=>set("gstEnabled",v)} label="Enable GST on invoices"/>
          {cfg.gstEnabled&&(
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Input label="GST Rate (%)" type="number" value={cfg.gstRate} onChange={e=>set("gstRate",e.target.value)} placeholder="5"/>
              <Input label="CGST Label" value={cfg.cgstLabel} onChange={e=>set("cgstLabel",e.target.value)} placeholder="CGST"/>
              <Input label="SGST Label" value={cfg.sgstLabel} onChange={e=>set("sgstLabel",e.target.value)} placeholder="SGST"/>
            </div>
          )}
        </div>
      </Card>

      <Card title="Invoice Numbering" subtitle="Prefix and format for invoice IDs" icon={<Hash size={15}/>}>
        <div className="grid grid-cols-2 gap-5">
          <Input label="Invoice Prefix" value={cfg.invoicePrefix} onChange={e=>set("invoicePrefix",e.target.value.toUpperCase())} placeholder="INV"/>
          <Input label="Receipt Prefix" value={cfg.receiptPrefix} onChange={e=>set("receiptPrefix",e.target.value.toUpperCase())} placeholder="RCPT"/>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[11px] text-gray-500">Generated format: <span className="font-bold text-gray-700">{cfg.invoicePrefix}-DDMMYYYY-0001</span></p>
        </div>
      </Card>

      <Card title="Bill Styling" subtitle="Choose the accent colour used in invoices and receipts" icon={<Palette size={15}/>}>
        <div className="space-y-5">
          <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <Label ch="Bill Accent Colour"/>
              <div className="flex flex-wrap gap-2">
                {BILL_COLOR_PRESETS.map(color=>(
                  <button
                    key={color}
                    type="button"
                    onClick={()=>set("billColor",color)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all cursor-pointer ${cfg.billColor===color?"scale-105 shadow-sm":"border-transparent"}`}
                    style={{ background: color, borderColor: cfg.billColor===color ? "#0f172a" : "transparent" }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label ch="Custom Colour"/>
              <input
                type="color"
                value={normalizeBillColor(cfg.billColor)}
                onChange={e=>set("billColor",e.target.value.toUpperCase())}
                className="w-14 h-11 rounded-xl border border-gray-200 bg-white p-1 cursor-pointer"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            <div className="px-5 py-3 text-white" style={{background: normalizeBillColor(cfg.billColor)}}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Invoice Preview</p>
              <p className="text-sm font-semibold mt-1">Business details, logo, and signature are pulled from Business Details</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  {hotelInfo.logo
                    ? <img src={hotelInfo.logo} className="h-12 w-24 object-contain rounded-lg bg-gray-50 border border-gray-100 p-2"/>
                    : <div className="h-12 w-24 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center"><ImageIcon size={15} className="text-gray-300"/></div>}
                  <div>
                    <p className="font-bold text-sm text-gray-800">{hotelInfo.name || "Your business name"}</p>
                    <p className="text-[11px] text-gray-400">{hotelInfo.addr || "Saved business address will show here"}</p>
                    <p className="text-[11px] text-gray-400">{hotelInfo.phone || "+91"} {hotelInfo.gstin ? `· GSTIN: ${hotelInfo.gstin}` : ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Sample</p>
                  <p className="font-bold text-base" style={{color: normalizeBillColor(cfg.billColor)}}>{cfg.invoicePrefix}-DDMMYYYY-0001</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{cfg.gstEnabled ? `${cfg.cgstLabel} / ${cfg.sgstLabel}` : "Non-GST receipt"}</span>
                <span className="font-bold" style={{color: normalizeBillColor(cfg.billColor)}}>{cfg.currencySymbol}12,400</span>
              </div>

              <div className="flex justify-end">
                {hotelInfo.signature
                  ? <div className="text-center"><img src={hotelInfo.signature} className="h-10 object-contain mx-auto mb-1"/><p className="text-[10px] text-gray-500 border-t border-gray-200 pt-1 min-w-[120px]">Authorised Signatory</p></div>
                  : <div className="text-center"><div className="h-10 w-28 rounded bg-gray-50 border border-dashed border-gray-200 mb-1"/><p className="text-[10px] text-gray-400 border-t pt-1">Signature preview</p></div>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Currency" subtitle="Currency symbol shown on invoices and UI" icon={<IndianRupee size={15}/>}>
        <div className="grid grid-cols-2 gap-5 max-w-sm">
          <Input label="Currency Code" value={cfg.currency} onChange={e=>set("currency",e.target.value.toUpperCase())} placeholder="INR"/>
          <Input label="Currency Symbol" value={cfg.currencySymbol} onChange={e=>set("currencySymbol",e.target.value)} placeholder="₹"/>
        </div>
      </Card>

      <Card title="Custom Bill Defaults" subtitle="Prefill manual invoice edits from the checkout bill editor" icon={<FileText size={15}/>}>
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Default Bill To Name"
            value={cfg.customBillDefaults.guestName}
            onChange={e=>setCustom("guestName",e.target.value)}
            placeholder="Optional default bill-to name"
          />
          <Input
            label="Default Room Line Label"
            value={cfg.customBillDefaults.roomLabel}
            onChange={e=>setCustom("roomLabel",e.target.value)}
            placeholder="Accommodation Charges"
          />
          <div className="col-span-2">
            <Textarea
              label="Default Bill To Address"
              value={cfg.customBillDefaults.guestAddress}
              onChange={e=>setCustom("guestAddress",e.target.value)}
              placeholder="Optional billing address for custom invoices"
              rows={3}
            />
          </div>
          <div className="col-span-2">
            <Textarea
              label="Default Custom Bill Notes"
              value={cfg.customBillDefaults.notes}
              onChange={e=>setCustom("notes",e.target.value)}
              placeholder="Optional note shown when a custom bill is used"
              rows={3}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end pb-6">
        <Btn ch={saving?<><Loader2 size={14} className="animate-spin"/>Saving…</>:<><Save size={14}/>Save Billing Settings</>} disabled={saving} onClick={save}/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Settings
// ═══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  const [tab,   setTab]   = useState("hotel");
  const [toast, setToast] = useState(null);

  const notify = (msg, type="ok") => setToast({ msg, type });

  const TABS = [
    { id:"hotel",   label:"Business Details",  icon:<Building2 size={16}/> },
    { id:"staff",   label:"Staff & Users",  icon:<Users size={16}/> },
    { id:"billing", label:"Billing",        icon:<ReceiptText size={16}/> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {toast && <Toast {...toast} onDone={()=>setToast(null)}/>}

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100  z-30" style={{boxShadow:"0 1px 3px rgba(3,127,252,.06)"}}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{background:B}}>
              <Palette size={16}/>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Settings</h1>
              <p className="text-xs text-gray-400 mt-0.5">Manage business details, bill styling, staff access, and custom invoice defaults</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer"
                style={{
                  borderColor: tab===t.id ? B : "transparent",
                  color: tab===t.id ? B : "#9ca3af",
                }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {tab==="hotel"   && <HotelTab   toast={notify}/>}
        {tab==="staff"   && <StaffTab   toast={notify}/>}
        {tab==="billing" && <BillingTab toast={notify}/>}
      </div>
    </div>
  );
}
