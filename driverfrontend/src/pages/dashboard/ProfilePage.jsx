import { FileImage, Save, User } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";

const UploadField = ({ label, file, url, onChange }) => (
  <label className="block">
    <span className="field-label flex items-center gap-1.5">
      <FileImage className="h-3.5 w-3.5" />
      {label}
    </span>
    <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} className="field-upload" />
    <p className="mt-1.5 text-xs text-zinc-500">{file ? file.name : url ? "✓ Uploaded" : "No file selected"}</p>
  </label>
);

const ProfilePage = () => {
  const {
    driver, profileForm, setProfileForm,
    profileAssets, profileFiles, setProfileFiles,
    savingProfile, saveProfile, theme
  } = useDashboard();

  const isDark = theme === "dark";

  const setField = (key, val) => setProfileForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Account</p>
        <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>My Profile</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Update your personal details and compliance documents.</p>
      </div>

      {/* Avatar + identity strip */}
      <div className={`flex items-center gap-4 rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        {driver?.profile_photo_url ? (
          <img src={driver.profile_photo_url} alt="avatar" className="h-16 w-16 rounded-2xl object-cover flex-shrink-0" />
        ) : (
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? "bg-zinc-800" : "bg-slate-100"}`}>
            <User size={24} className={isDark ? "text-zinc-500" : "text-slate-400"} />
          </div>
        )}
        <div>
          <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{driver?.full_name}</p>
          <p className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{driver?.email}</p>
          <div className="flex gap-2 mt-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
              {driver?.status || "active"}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`text-xs font-bold uppercase tracking-widest border-b pb-3 ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Personal Details</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Full Name</span>
            <input value={profileForm.full_name} onChange={(e) => setField("full_name", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Your full name" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Phone</span>
            <input value={profileForm.phone} onChange={(e) => setField("phone", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="+91 98765 43210" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Aadhaar Number</span>
            <input value={profileForm.aadhaar_number} onChange={(e) => setField("aadhaar_number", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="XXXX XXXX XXXX" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Licence Number</span>
            <input value={profileForm.license_number} onChange={(e) => setField("license_number", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="DL number" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Emergency Contact</span>
            <input value={profileForm.emergency_contact_name} onChange={(e) => setField("emergency_contact_name", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Contact name" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Emergency Phone</span>
            <input value={profileForm.emergency_contact_phone} onChange={(e) => setField("emergency_contact_phone", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="+91 98765 43210" />
          </label>
        </div>
      </div>

      {/* Document Uploads */}
      <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`text-xs font-bold uppercase tracking-widest border-b pb-3 ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Documents</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <UploadField label="Profile Photo" file={profileFiles.profile_photo_url} url={profileAssets.profile_photo_url}
            onChange={(f) => setProfileFiles((p) => ({ ...p, profile_photo_url: f }))} />
          <UploadField label="Aadhaar Image" file={profileFiles.aadhaar_image_url} url={profileAssets.aadhaar_image_url}
            onChange={(f) => setProfileFiles((p) => ({ ...p, aadhaar_image_url: f }))} />
          <UploadField label="Licence Image" file={profileFiles.license_image_url} url={profileAssets.license_image_url}
            onChange={(f) => setProfileFiles((p) => ({ ...p, license_image_url: f }))} />
        </div>
      </div>

      <button
        onClick={saveProfile}
        disabled={savingProfile}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3.5 text-sm font-bold text-zinc-900 hover:bg-[#eab308] transition-colors disabled:opacity-60"
      >
        <Save size={16} />
        {savingProfile ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
};

export default ProfilePage;
