import { useState, useEffect } from "react";
import {
  Plus, Trash2, Edit3, Save, X, BedDouble,
  Wind, Snowflake, Layers, CheckCircle, Wrench,
  RefreshCw, Search, MoreVertical, Building2,
  Sparkles, AlertTriangle, Hash, ChevronDown,
  ChevronUp, ArrowUp, ArrowDown,
  ImageIcon, Upload, IndianRupee,
} from "lucide-react";
import dbs from "../api/db";

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND = "#037ffc";

// ─── Static room statuses ─────────────────────────────────────────────────────
const STATUSES = [
  { value: "Available",   label: "Available",   dot: "#22c55e" },
  { value: "Occupied",    label: "Occupied",    dot: BRAND },
  { value: "Cleaning",    label: "Cleaning",    dot: "#f59e0b" },
  { value: "Maintenance", label: "Maintenance", dot: "#ef4444" },
];

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm " +
  "text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 " +
  "transition-all duration-200 placeholder:text-slate-300";

const Btn = ({ children, onClick, disabled, variant = "primary", size = "md", className = "" }) => {
  const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2.5 text-sm gap-2" };
  const base = `inline-flex items-center justify-center rounded-xl font-medium transition-all
    duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizes[size]} ${className}`;
  if (variant === "primary")
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} text-white`}
        style={{ background: disabled ? "#a0c8fe" : BRAND }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#0269d4"; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = BRAND; }}>
        {children}
      </button>
    );
  if (variant === "ghost")
    return (
      <button onClick={onClick} disabled={disabled}
        className={`${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
        {children}
      </button>
    );
  if (variant === "danger")
    return (
      <button onClick={onClick} disabled={disabled}
        className={`${base} border border-red-200 bg-red-50 text-red-500 hover:bg-red-100`}>
        {children}
      </button>
    );
};

const Label = ({ children, required }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <Label required={required}>{label}</Label>
    {children}
  </div>
);

const Toast = ({ msg, type }) => (
  <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3
    rounded-xl shadow-lg text-sm font-medium text-white transition-all
    ${type === "error" ? "bg-red-500" : "bg-slate-900"}`}>
    {type === "error" ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
    {msg}
  </div>
);

const normalizeImageUrls = (value, fallback = null) => {
  const listValue = Array.isArray(value) ? value : [];
  const normalized = listValue
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);

  const fallbackValue = String(fallback || "").trim();
  if (fallbackValue && !normalized.includes(fallbackValue)) {
    normalized.unshift(fallbackValue);
  }

  return normalized;
};

const normalizeRoomDraft = (room = {}) => {
  const imageUrls = normalizeImageUrls(
    room.imageUrls || room.image_urls,
    room.imageUrl || room.image_url
  );

  const rawPrice = room.basePrice ?? room.base_price ?? "";
  const basePrice = rawPrice === "" || rawPrice === null || rawPrice === undefined
    ? ""
    : Number(rawPrice);

  return {
    ...room,
    imageUrls,
    imageUrl: imageUrls[0] || "",
    basePrice,
  };
};

// Status pill
const StatusPill = ({ status }) => {
  const s = STATUSES.find(x => x.value === status) || STATUSES[0];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Room Card ─────────────────────────────────────────────────────────────────
const RoomCard = ({ room, onEdit, onDelete, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const roomImages = normalizeImageUrls(room.imageUrls || room.image_urls, room.imageUrl || room.image_url);
  const statusColor = {
    Available:   "border-t-emerald-400",
    Occupied:    "border-t-blue-500",
    Cleaning:    "border-t-amber-400",
    Maintenance: "border-t-red-400",
  }[room.status] || "border-t-slate-300";

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 border-t-[3px] ${statusColor}
      overflow-visible group hover:shadow-md hover:border-slate-200 transition-all duration-200 relative`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="p-4">
        {roomImages[0] && (
          <div className="mb-3 overflow-hidden rounded-xl bg-slate-100">
            <img src={roomImages[0]} alt={`Room ${room.roomNumber}`} className="h-28 w-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{room.roomNumber}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {room.floor === "G" || room.floor === "Ground" ? "Ground Floor" : `Floor ${room.floor}`}
            </p>
          </div>
          {/* Context menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-100
                shadow-xl z-30 overflow-hidden py-1" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { onEdit(room); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600
                    hover:bg-slate-50 transition cursor-pointer">
                  <Edit3 size={12} /> Edit Room
                </button>
                <div className="border-t border-slate-50 my-1" />
                <p className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Change Status</p>
                {STATUSES.filter(s => s.value !== room.status).map(s => (
                  <button key={s.value}
                    onClick={() => { onStatusChange(room, s.value); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600
                      hover:bg-slate-50 transition cursor-pointer">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                    {s.label}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { onDelete(room); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500
                      hover:bg-red-50 transition cursor-pointer">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Type + Mode */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-700">{room.type || "—"}</span>
          {room.mode && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                {room.mode === "AC"
                  ? <Snowflake size={10} className="text-blue-400" />
                  : <Wind size={10} className="text-slate-400" />}
                {room.mode}
              </span>
            </>
          )}
        </div>

        {/* Price + Status */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {(room.basePrice || room.base_price) ? (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
              <IndianRupee size={10} />
              {Number(room.basePrice || room.base_price).toLocaleString("en-IN")}
              <span className="text-[9px] font-medium text-emerald-500 ml-0.5">/night</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-300 italic">No price set</span>
          )}
          <StatusPill status={room.status} />
        </div>

        {/* Notes */}
        {room.notes && (
          <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 italic">{room.notes}</p>
        )}
      </div>
    </div>
  );
};

// ── Room Form Modal ───────────────────────────────────────────────────────────
const RoomModal = ({ isOpen, onClose, onSave, room, roomTypes, floors }) => {
  const blank = {
    roomNumber: "",
    floor: floors[0]?.name || "1",
    type: roomTypes[0]?.name || "",
    mode: "AC",
    status: "Available",
    notes: "",
    basePrice: "",
    imageUrls: [],
    imageUrl: "",
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => { setForm(room ? { ...blank, ...normalizeRoomDraft(room) } : blank); }, [room, isOpen]);

  const uploadRoomImages = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const uploaded = await Promise.all(files.map((file) => dbs.uploadImage(file)));
      setForm((current) => ({
        ...current,
        imageUrls: normalizeImageUrls(
          [
            ...(current.imageUrls || []),
            ...uploaded.map((item) => item?.url),
          ],
          current.imageUrl
        ),
        imageUrl: normalizeImageUrls(
          [
            ...(current.imageUrls || []),
            ...uploaded.map((item) => item?.url),
          ],
          current.imageUrl
        )[0] || "",
      }));
    } catch (error) {
      console.error(error);
      alert("Room image upload failed.");
    }
    setUploadingImages(false);
  };

  const removeRoomImage = (targetUrl) => {
    const nextImageUrls = (form.imageUrls || []).filter((url) => url !== targetUrl);
    setForm((current) => ({
      ...current,
      imageUrls: nextImageUrls,
      imageUrl: nextImageUrls[0] || "",
    }));
  };

  const makePrimaryImage = (targetUrl) => {
    const nextImageUrls = normalizeImageUrls(form.imageUrls, targetUrl);
    setForm((current) => ({
      ...current,
      imageUrls: nextImageUrls,
      imageUrl: nextImageUrls[0] || "",
    }));
  };

  const submit = async () => {
    if (!form.roomNumber.trim()) return alert("Room number required.");
    setSaving(true);
    const imageUrls = normalizeImageUrls(form.imageUrls, form.imageUrl);
    await onSave({
      ...form,
      imageUrls,
      imageUrl: imageUrls[0] || "",
    });
    setSaving(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#e8f2ff", color: BRAND }}>
              <BedDouble size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{room?.id ? "Edit Room" : "Add Room"}</h2>
              <p className="text-[11px] text-slate-400">{room?.id ? `Room ${room.roomNumber}` : "Fill in room details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room Number" required>
              <input className={inputCls} placeholder="e.g. 101" value={form.roomNumber}
                onChange={e => setForm({ ...form, roomNumber: e.target.value })} autoFocus />
            </Field>
            <Field label="Floor">
              <select className={inputCls} value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })}>
                {floors.map(f => <option key={f.id || f.name} value={f.name}>{f.label || f.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Base Price (₹ per night)">
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} type="number" min="0" step="1" placeholder="e.g. 2500"
                value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />
            </div>
          </Field>

          <Field label="Room Type">
            <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="">— Select Type —</option>
              {roomTypes.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
            </select>
          </Field>

          <Field label="Climate Control">
            <div className="flex gap-2">
              {["AC", "Non-AC"].map(m => (
                <button key={m} onClick={() => setForm({ ...form, mode: m })}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold
                    flex items-center justify-center gap-2 transition-all cursor-pointer
                    ${form.mode === m
                      ? "border-blue-300 text-blue-700 bg-blue-50"
                      : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"}`}>
                  {m === "AC" ? <Snowflake size={14} /> : <Wind size={14} />} {m}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Status">
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => setForm({ ...form, status: s.value })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold
                    flex items-center gap-2 transition-all cursor-pointer
                    ${form.status === s.value
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea className={`${inputCls} resize-none`} rows={2}
              placeholder="Any special notes about this room…"
              value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Field label="Room Images">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/60">
                {uploadingImages ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingImages ? "Uploading images..." : "Add room images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => uploadRoomImages(e.target.files)}
                />
              </label>

              {form.imageUrls?.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {form.imageUrls.map((imageUrl, index) => {
                    const isPrimary = index === 0;
                    return (
                      <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="relative h-28 bg-slate-100">
                          <img src={imageUrl} alt={`Room image ${index + 1}`} className="h-full w-full object-cover" />
                          {isPrimary && (
                            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(imageUrl)}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                              isPrimary
                                ? "bg-blue-50 text-blue-600"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {isPrimary ? "Primary image" : "Set primary"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRoomImage(imageUrl)}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-400">
                  <ImageIcon size={13} />
                  Room photos have not been added yet.
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/60">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> {room?.id ? "Update" : "Add Room"}</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Add Modal ────────────────────────────────────────────────────────────
const BulkModal = ({ isOpen, onClose, onSave, roomTypes, floors }) => {
  const [floor, setFloor] = useState(floors[0]?.name || "1");
  const [start, setStart] = useState("");
  const [end,   setEnd]   = useState("");
  const [type,  setType]  = useState(roomTypes[0]?.name || "");
  const [mode,  setMode]  = useState("AC");
  const [basePrice, setBasePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const nums = (() => {
    const s = parseInt(start), e = parseInt(end);
    if (!s || !e || s > e || e - s > 99) return [];
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  })();

  const uploadBulkImages = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const uploaded = await Promise.all(files.map((file) => dbs.uploadImage(file)));
      setImageUrls((current) =>
        normalizeImageUrls([
          ...current,
          ...uploaded.map((item) => item?.url),
        ])
      );
    } catch (error) {
      console.error(error);
      alert("Image upload failed.");
    }
    setUploadingImages(false);
  };

  const removeBulkImage = (targetUrl) => {
    setImageUrls((current) => current.filter((url) => url !== targetUrl));
  };

  const submit = async () => {
    setSaving(true);
    const normalizedUrls = normalizeImageUrls(imageUrls);
    await onSave(
      nums.map(n => ({
        roomNumber: String(n),
        floor,
        type,
        mode,
        basePrice: basePrice === "" ? "" : Number(basePrice),
        status: "Available",
        notes: "",
        imageUrls: normalizedUrls,
        imageUrl: normalizedUrls[0] || "",
      }))
    );
    setSaving(false);
    setImageUrls([]);
    setBasePrice("");
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#e8f2ff", color: BRAND }}><Layers size={16} /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Bulk Add Rooms</h2>
              <p className="text-[11px] text-slate-400">Add a number range at once</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input className={inputCls} type="number" placeholder="101" value={start} onChange={e => setStart(e.target.value)} />
            </Field>
            <Field label="To">
              <input className={inputCls} type="number" placeholder="110" value={end} onChange={e => setEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="Floor">
            <select className={inputCls} value={floor} onChange={e => setFloor(e.target.value)}>
              {floors.map(f => <option key={f.id || f.name} value={f.name}>{f.label || f.name}</option>)}
            </select>
          </Field>
          <Field label="Room Type">
            <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
              {roomTypes.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Climate">
            <div className="flex gap-2">
              {["AC", "Non-AC"].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold
                    flex items-center justify-center gap-1.5 transition-all cursor-pointer
                    ${mode === m ? "border-blue-300 text-blue-700 bg-blue-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {m === "AC" ? <Snowflake size={12} /> : <Wind size={12} />} {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Base Price (₹ per night)">
            <div className="relative">
              <IndianRupee size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} type="number" min="0" step="1" placeholder="e.g. 2500"
                value={basePrice} onChange={e => setBasePrice(e.target.value)} />
            </div>
          </Field>
          <Field label="Room Images (applied to all)">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/60">
                {uploadingImages ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingImages ? "Uploading images..." : "Add room images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => uploadBulkImages(e.target.files)}
                />
              </label>

              {imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {imageUrls.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="relative h-24 bg-slate-100">
                        <img src={imageUrl} alt={`Bulk image ${index + 1}`} className="h-full w-full object-cover" />
                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => removeBulkImage(imageUrl)}
                          className="flex-1 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-400">
                  <ImageIcon size={13} />
                  Images will apply to all rooms in this batch.
                </div>
              )}
            </div>
          </Field>
          {nums.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-blue-600 mb-2">{nums.length} rooms will be created</p>
              <div className="flex flex-wrap gap-1.5">
                {nums.slice(0, 24).map(n => (
                  <span key={n} className="text-[11px] font-bold bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">{n}</span>
                ))}
                {nums.length > 24 && <span className="text-[11px] text-blue-400">+{nums.length - 24} more</span>}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/60">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving || nums.length === 0}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Adding…</> : <><Plus size={13} /> Add {nums.length} Rooms</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Stats strip ───────────────────────────────────────────────────────────────
const StatsStrip = ({ rooms }) => {
  const counts = STATUSES.reduce((a, s) => ({ ...a, [s.value]: rooms.filter(r => r.status === s.value).length }), {});
  return (
    <div className="flex gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 border border-slate-100">
        <Building2 size={14} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-800">{rooms.length}</span>
        <span className="text-xs text-slate-400">Total</span>
      </div>
      {STATUSES.map(s => (
        <div key={s.value} className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-100">
          <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
          <span className="text-sm font-bold text-slate-800">{counts[s.value] || 0}</span>
          <span className="text-xs text-slate-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Rooms Tab ─────────────────────────────────────────────────────────────────
const RoomsTab = ({ roomTypes, floors }) => {
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState({ open: false, room: null });
  const [bulk, setBulk]           = useState(false);
  const [search, setSearch]       = useState("");
  const [fFloor, setFFloor]       = useState("All");
  const [fStatus, setFStatus]     = useState("All");
  const [fType, setFType]         = useState("All");
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await dbs.readCollection("rooms", 500);
      const data = (res.data || res || [])
        .map((room) => normalizeRoomDraft(room))
        .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
      setRooms(data);
    } catch { showToast("Failed to load rooms", "error"); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const saveRoom = async (form) => {
    try {
      const normalizedForm = normalizeRoomDraft(form);
      if (form.id) {
        await dbs.editDocument("rooms", form.roomNumber, normalizedForm);
        showToast(`Room ${form.roomNumber} updated`);
      } else {
        await dbs.addDocument("rooms", form.roomNumber, normalizedForm);
        showToast(`Room ${form.roomNumber} added`);
      }
      setModal({ open: false, room: null });
      fetch();
    } catch { showToast("Error saving room", "error"); }
  };

  const bulkSave = async (list) => {
    try {
      await Promise.all(list.map(r => {
        const normalizedRoom = normalizeRoomDraft(r);
        return dbs.addDocument("rooms", normalizedRoom.roomNumber, normalizedRoom);
      }));
      showToast(`${list.length} rooms added`);
      fetch();
    } catch { showToast("Bulk add failed", "error"); }
  };

  const deleteRoom = async (room) => {
    if (!window.confirm(`Delete Room ${room.roomNumber}?`)) return;
    await dbs.deleteDocument("rooms", room.roomNumber);
    showToast(`Room ${room.roomNumber} deleted`, "error");
    fetch();
  };

  const changeStatus = async (room, status) => {
    await dbs.editDocument("rooms", room.roomNumber, { ...room, status });
    showToast(`Room ${room.roomNumber} → ${status}`);
    fetch();
  };

  const filtered = rooms.filter(r => {
    if (fFloor  !== "All" && r.floor  !== fFloor)  return false;
    if (fStatus !== "All" && r.status !== fStatus) return false;
    if (fType   !== "All" && r.type   !== fType)   return false;
    if (search && !String(r.roomNumber).includes(search) &&
        !(r.type || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byFloor = filtered.reduce((acc, r) => {
    const fl = r.floor || "G";
    if (!acc[fl]) acc[fl] = [];
    acc[fl].push(r);
    return acc;
  }, {});

  const floorOrder = Object.keys(byFloor).sort((a, b) => {
    if (a === "G" || a === "Ground") return -1;
    if (b === "G" || b === "Ground") return 1;
    return parseInt(a) - parseInt(b);
  });

  return (
    <div className="space-y-5">
      {toast && <Toast {...toast} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-44 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white
            text-sm text-slate-700 placeholder:text-slate-300 outline-none
            focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
            placeholder="Search room…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-sm
          text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50
          transition-all cursor-pointer" value={fFloor} onChange={e => setFFloor(e.target.value)}>
          <option value="All">All Floors</option>
          {floors.map(f => <option key={f.id || f.name} value={f.name}>{f.label || f.name}</option>)}
        </select>

        <select className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-sm
          text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50
          transition-all cursor-pointer" value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-sm
          text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50
          transition-all cursor-pointer" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="All">All Types</option>
          {roomTypes.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
        </select>

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} room{filtered.length !== 1 ? "s" : ""}</span>

        <Btn variant="ghost" size="sm" onClick={fetch}><RefreshCw size={13} /> Refresh</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setBulk(true)}><Layers size={13} /> Bulk Add</Btn>
        <Btn size="sm" onClick={() => setModal({ open: true, room: null })}><Plus size={13} /> Add Room</Btn>
      </div>

      {/* Stats */}
      {!loading && <StatsStrip rooms={rooms} />}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={22} className="animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col
          items-center justify-center py-20 gap-3">
          <BedDouble size={32} className="text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">No rooms found</p>
          <Btn size="sm" onClick={() => setModal({ open: true, room: null })}>
            <Plus size={13} /> Add First Room
          </Btn>
        </div>
      ) : (
        floorOrder.map(floor => (
          <div key={floor}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={12} className="text-slate-400" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {floor === "G" || floor === "Ground" ? "Ground Floor" : `Floor ${floor}`}
                </h3>
              </div>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400">{byFloor[floor].length} rooms</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {byFloor[floor].map(room => (
                <RoomCard key={room.roomNumber} room={room}
                  onEdit={r => setModal({ open: true, room: r })}
                  onDelete={deleteRoom}
                  onStatusChange={changeStatus} />
              ))}
            </div>
          </div>
        ))
      )}

      <RoomModal isOpen={modal.open} onClose={() => setModal({ open: false, room: null })}
        onSave={saveRoom} room={modal.room} roomTypes={roomTypes} floors={floors} />
      <BulkModal isOpen={bulk} onClose={() => setBulk(false)}
        onSave={bulkSave} roomTypes={roomTypes} floors={floors} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — ROOM TYPES
// ═══════════════════════════════════════════════════════════════════════════════
const RoomTypesTab = ({ types, onRefresh }) => {
  const [toast, setToast]   = useState(null);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft]   = useState({});
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const startEdit = (t) => { setEditId(t.id); setDraft({ name: t.name, description: t.description || "" }); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await dbs.editDocument("room_types", editId, draft);
      showToast("Room type updated");
      setEditId(null);
      onRefresh();
    } catch { showToast("Update failed", "error"); }
    setSaving(false);
  };

  const addType = async () => {
    if (!newType.name.trim()) return;
    setSaving(true);
    try {
      await dbs.addAutoIdDocument("room_types", { ...newType, createdAt: new Date().toISOString() });
      showToast(`"${newType.name}" added`);
      setNewType({ name: "", description: "" });
      setAdding(false);
      onRefresh();
    } catch { showToast("Add failed", "error"); }
    setSaving(false);
  };

  const deleteType = async (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await dbs.deleteDocument("room_types", t.id);
      showToast(`"${t.name}" deleted`, "error");
      onRefresh();
    } catch { showToast("Delete failed", "error"); }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast {...toast} />}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Room Types</h2>
          <p className="text-xs text-slate-400 mt-0.5">{types.length} type{types.length !== 1 ? "s" : ""} configured</p>
        </div>
        {!adding && (
          <Btn size="sm" onClick={() => setAdding(true)}><Plus size={13} /> New Type</Btn>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Column headers */}
        <div className="grid grid-cols-[40px_1fr_2fr_100px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type Name</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-50">
          {types.length === 0 && !adding && (
            <div className="py-12 text-center text-sm text-slate-400">
              No room types yet — click "New Type" to add one.
            </div>
          )}

          {types.map((t, i) => (
            <div key={t.id}
              className="grid grid-cols-[40px_1fr_2fr_100px] gap-4 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors">
              <span className="text-xs font-bold text-slate-300">{i + 1}</span>

              {editId === t.id ? (
                <>
                  <input className={inputCls} value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })} autoFocus />
                  <input className={inputCls} placeholder="Description (optional)"
                    value={draft.description}
                    onChange={e => setDraft({ ...draft, description: e.target.value })} />
                  <div className="flex gap-1.5">
                    <button onClick={saveEdit} disabled={saving}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition cursor-pointer">
                      {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                      <X size={13} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BRAND, opacity: 0.5 }} />
                    <span className="text-sm font-semibold text-slate-700">{t.name}</span>
                  </div>
                  <span className="text-sm text-slate-400">{t.description || <span className="italic text-slate-300">—</span>}</span>
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => startEdit(t)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteType(t)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Inline add row */}
          {adding && (
            <div className="grid grid-cols-[40px_1fr_2fr_100px] gap-4 px-5 py-4 items-center bg-blue-50/40 border-t border-blue-100">
              <span className="text-xs font-bold text-blue-300">{types.length + 1}</span>
              <input className={inputCls} placeholder="Type name *" value={newType.name}
                onChange={e => setNewType({ ...newType, name: e.target.value })} autoFocus />
              <input className={inputCls} placeholder="Description (optional)"
                value={newType.description}
                onChange={e => setNewType({ ...newType, description: e.target.value })} />
              <div className="flex gap-1.5">
                <button onClick={addType} disabled={saving || !newType.name.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                </button>
                <button onClick={() => setAdding(false)}
                  className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <AlertTriangle size={11} className="text-amber-400" />
        Room types are used when creating rooms. Pricing is configured separately.
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — FLOORS
// ═══════════════════════════════════════════════════════════════════════════════
const FloorsTab = ({ floors, rooms, onRefresh }) => {
  const [toast, setToast]   = useState(null);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft]   = useState({});
  const [adding, setAdding] = useState(false);
  const [newFloor, setNewFloor] = useState({ name: "", label: "" });
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const roomCount = (floorName) => rooms.filter(r => r.floor === floorName).length;

  const saveEdit = async () => {
    setSaving(true);
    try {
      await dbs.editDocument("floors", editId, draft);
      showToast("Floor updated"); setEditId(null); onRefresh();
    } catch { showToast("Update failed", "error"); }
    setSaving(false);
  };

  const addFloor = async () => {
    if (!newFloor.name.trim()) return;
    setSaving(true);
    try {
      await dbs.addAutoIdDocument("floors", { ...newFloor, createdAt: new Date().toISOString() });
      showToast(`Floor "${newFloor.name}" added`);
      setNewFloor({ name: "", label: "" }); setAdding(false); onRefresh();
    } catch { showToast("Add failed", "error"); }
    setSaving(false);
  };

  const deleteFloor = async (f) => {
    const cnt = roomCount(f.name);
    if (cnt > 0) return alert(`Floor "${f.name}" has ${cnt} room(s). Reassign them before deleting.`);
    if (!window.confirm(`Delete floor "${f.name}"?`)) return;
    try {
      await dbs.deleteDocument("floors", f.id);
      showToast(`Floor "${f.name}" deleted`, "error"); onRefresh();
    } catch { showToast("Delete failed", "error"); }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Floors</h2>
          <p className="text-xs text-slate-400 mt-0.5">{floors.length} floor{floors.length !== 1 ? "s" : ""} configured</p>
        </div>
        {!adding && (
          <Btn size="sm" onClick={() => setAdding(true)}><Plus size={13} /> New Floor</Btn>
        )}
      </div>

      {/* Floor cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {floors.map((f, i) => {
          const cnt = roomCount(f.name);
          const isEditing = editId === f.id;
          return (
            <div key={f.id} className={`bg-white rounded-2xl border overflow-hidden transition-all
              ${isEditing ? "border-blue-200 ring-4 ring-blue-50" : "border-slate-100 hover:border-slate-200 hover:shadow-md"}`}
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              {/* Accent */}
              <div className="h-1.5 w-full" style={{ background: `hsl(${(i * 47) % 360}, 65%, 60%)` }} />
              <div className="p-4">
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <Field label="Floor ID (e.g. G, 1, 2)">
                      <input className={inputCls} value={draft.name}
                        onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    </Field>
                    <Field label="Display Label">
                      <input className={inputCls} placeholder="e.g. Ground Floor"
                        value={draft.label || ""}
                        onChange={e => setDraft({ ...draft, label: e.target.value })} />
                    </Field>
                    <div className="flex gap-2">
                      <Btn size="sm" onClick={saveEdit} disabled={saving} className="flex-1">
                        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />} Save
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-extrabold text-slate-800 leading-none">{f.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{f.label || "—"}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditId(f.id); setDraft({ name: f.name, label: f.label || "" }); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => deleteFloor(f)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BedDouble size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-500">{cnt} room{cnt !== 1 ? "s" : ""}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add new floor card */}
        {adding && (
          <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-4 flex flex-col gap-3">
            <Field label="Floor ID *">
              <input className={inputCls} placeholder="e.g. G, 1, 2, B1"
                value={newFloor.name} onChange={e => setNewFloor({ ...newFloor, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Display Label">
              <input className={inputCls} placeholder="e.g. Ground Floor"
                value={newFloor.label} onChange={e => setNewFloor({ ...newFloor, label: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Btn size="sm" onClick={addFloor} disabled={saving || !newFloor.name.trim()} className="flex-1">
                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />} Add Floor
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
            </div>
          </div>
        )}

        {/* Empty state */}
        {floors.length === 0 && !adding && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-100
            flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={28} className="text-slate-200" />
            <p className="text-sm text-slate-400">No floors configured</p>
            <Btn size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Add First Floor</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — RoomConfig
// ═══════════════════════════════════════════════════════════════════════════════
export default function RoomConfig() {
  const [activeTab, setActiveTab] = useState("rooms");
  const [roomTypes, setRoomTypes] = useState([]);
  const [floors, setFloors]       = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  // We also need rooms list for floor room-count check
  const [allRooms, setAllRooms] = useState([]);

  const fetchMeta = async () => {
    setLoadingMeta(true);
    try {
      const [tRes, fRes, rRes] = await Promise.all([
        dbs.readCollection("room_types", 100),
        dbs.readCollection("floors", 50),
        dbs.readCollection("rooms", 500),
      ]);
      setRoomTypes(tRes.data || tRes || []);
      setFloors(fRes.data || fRes || []);
      setAllRooms(rRes.data || rRes || []);
    } catch (e) { console.error(e); }
    setLoadingMeta(false);
  };

  useEffect(() => { fetchMeta(); }, []);

  const TABS = [
    { id: "rooms",      label: "Rooms",      icon: <BedDouble size={15} /> },
    { id: "roomtypes",  label: "Room Types", icon: <Layers size={15} /> },
    { id: "floors",     label: "Floors",     icon: <Building2 size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ── */}
      <div className="px-3 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: BRAND }}>
              <BedDouble size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Room Configuration</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage your hotel's rooms, types & floors</p>
            </div>
          </div> */}
          {/* Tab switcher inline in header */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                  transition-all duration-200 cursor-pointer
                  ${activeTab === t.id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-8 py-7">
        {loadingMeta ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw size={22} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {activeTab === "rooms" && (
              <RoomsTab roomTypes={roomTypes} floors={floors} />
            )}
            {activeTab === "roomtypes" && (
              <RoomTypesTab types={roomTypes} onRefresh={fetchMeta} />
            )}
            {activeTab === "floors" && (
              <FloorsTab floors={floors} rooms={allRooms} onRefresh={fetchMeta} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
