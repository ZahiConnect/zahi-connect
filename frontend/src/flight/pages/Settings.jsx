import { useState, useEffect } from "react";
import { FiSave, FiRefreshCw, FiImage, FiTrash2, FiLink, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import dbs from "../api/db";

const Input = ({ label, icon: Icon, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
      <input 
        className={`w-full rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] bg-white py-3 pr-4 text-sm text-slate-800 outline-none focus:border-slate-800 transition-all placeholder:text-slate-300 ${Icon ? 'pl-11' : 'pl-4'}`}
        {...props} 
      />
    </div>
  </div>
);

const TextArea = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block">{label}</label>
    <textarea 
      className="w-full rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] bg-white p-4 text-sm text-slate-800 outline-none focus:border-slate-800 transition-all placeholder:text-slate-300 resize-none h-28"
      {...props} 
    />
  </div>
);

const ImgUpload = ({ url, onUpload, onClear, label, aspect = "square" }) => {
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
    <div className={`relative w-full rounded-[24px] border border-slate-200 overflow-hidden group ${aspect === 'wide' ? 'h-48' : 'h-32'}`}>
      <img src={url} className="w-full h-full object-cover" alt="Asset" />
      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
        <button onClick={onClear} className="w-10 h-10 bg-white/20 hover:bg-red-500 flex items-center justify-center rounded-xl text-white transition-colors"><FiTrash2 size={18} /></button>
      </div>
    </div>
  ) : (
    <label className={`flex flex-col items-center justify-center w-full rounded-[24px] border-2 border-dashed border-slate-200 hover:border-[#037ffc]/50 bg-slate-50 hover:bg-[#037ffc]/5 cursor-pointer transition-all ${aspect === 'wide' ? 'h-48' : 'h-32'}`}>
      <input type="file" accept="image/*" className="hidden" onChange={upload} />
      {busy ? <FiRefreshCw size={24} className="text-[#037ffc] animate-spin" /> : (
        <div className="text-center text-slate-400">
          <FiImage size={24} className="mx-auto mb-2" />
          <p className="text-xs font-semibold">{label}</p>
        </div>
      )}
    </label>
  );
};

export default function AirlineSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({
    name: "", iataCode: "", hubAirport: "", tagline: "", description: "",
    addr: "", phone: "", email: "", website: "",
    logo: "", coverImage: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await dbs.readDocument("settings", "flight");
        if (res) setS(prev => ({ ...prev, ...res }));
      } catch {}
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await dbs.editDocument("settings", "flight", { ...s, updatedAt: new Date().toISOString() });
      alert("Profile updated.");
    } catch { alert("Failed to save."); }
    setSaving(false);
  };

  const setF = (k, v) => setS(p => ({ ...p, [k]: v }));

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><FiRefreshCw size={28} className="animate-spin text-slate-300" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-0">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Organization Profile</h1>
          <p className="text-slate-500">Global metadata, public directory information, and brand assets.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]">
          {saving ? <FiRefreshCw size={18} className="animate-spin" /> : <FiSave size={18} />}
          Save Changes
        </button>
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        
        {/* Core Identity */}
        <section className="bg-white rounded-[32px] border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <HiOutlineBuildingOffice2 size={20} className="text-slate-600"/>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Core Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input label="Carrier Display Name" value={s.name} onChange={e => setF("name", e.target.value)} placeholder="Zahi Airways" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="IATA Carrier Code" value={s.iataCode} onChange={e => setF("iataCode", e.target.value)} placeholder="e.g. ZH" />
                  <Input label="Primary Hub (IATA)" value={s.hubAirport} onChange={e => setF("hubAirport", e.target.value)} placeholder="e.g. BLR" />
                </div>
                <Input label="Marketing Tagline" value={s.tagline} onChange={e => setF("tagline", e.target.value)} placeholder="Fly beyond boundaries..." />
              </div>
              
              <div className="flex flex-col">
                <TextArea label="Brand Description & History" value={s.description} onChange={e => setF("description", e.target.value)} placeholder="Describe your operational history..." />
              </div>
            </div>
          </div>
        </section>

        {/* Contact Directories */}
        <section className="bg-white rounded-[32px] border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">Digital Contacts & HQ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input label="Official Website" icon={FiLink} value={s.website} onChange={e => setF("website", e.target.value)} placeholder="https://..." />
              <Input label="Support Hotlines" icon={FiPhone} value={s.phone} onChange={e => setF("phone", e.target.value)} placeholder="+91..." />
              <Input label="Inquiries Email" icon={FiMail} value={s.email} onChange={e => setF("email", e.target.value)} placeholder="hello@..." />
              <div className="md:col-span-2 lg:col-span-3">
                <Input label="Registered HQ Address" icon={FiMapPin} value={s.addr} onChange={e => setF("addr", e.target.value)} placeholder="Office location..." />
              </div>
            </div>
          </div>
        </section>

        {/* Brand Media */}
        <section className="bg-white rounded-[32px] border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden mb-10">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <FiImage size={20} className="text-slate-600"/>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Media Vault</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Airline Tail Logo</label>
                <ImgUpload url={s.logo} onUpload={v => setF("logo", v)} onClear={() => setF("logo", "")} label="Upload Tail Art" aspect="square" />
                <p className="text-xs text-slate-400 font-medium">Recommended 512x512px. Transparent PNG preferred.</p>
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Marketplace Cover Banner</label>
                <ImgUpload url={s.coverImage} onUpload={v => setF("coverImage", v)} onClear={() => setF("coverImage", "")} label="Upload Landscape Cover" aspect="wide" />
                <p className="text-xs text-slate-400 font-medium">Rendered as 16:9 banner on booking portal. Minimum width 1200px.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
