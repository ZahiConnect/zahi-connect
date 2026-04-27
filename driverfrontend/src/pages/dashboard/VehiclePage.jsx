import { CarFront, FileImage, Save } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";

const UploadField = ({ label, file, url, onChange, isDark }) => (
  <label className="block">
    <span className={`field-label flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
      <FileImage className="h-3.5 w-3.5" />
      {label}
    </span>
    <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} className="field-upload" />
    <p className={`mt-1.5 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{file ? file.name : url ? "✓ Uploaded" : "No file selected"}</p>
  </label>
);

const VehiclePage = () => {
  const {
    driver, vehicleForm, setVehicleForm,
    vehicleAssets, vehicleFiles, setVehicleFiles,
    savingVehicle, saveVehicle, theme
  } = useDashboard();

  const isDark = theme === "dark";

  const setField = (key, val) => setVehicleForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Vehicle</p>
        <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>My Vehicle</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Update your cab details, fares, and vehicle documents.</p>
      </div>

      {/* Vehicle identity strip */}
      {driver?.vehicle && (
        <div className={`flex items-center gap-4 rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? "bg-[#facc15]/10 text-[#facc15]" : "bg-amber-50 text-amber-600"}`}>
            <CarFront size={26} />
          </div>
          <div>
            <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{driver.vehicle.vehicle_name}</p>
            <p className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{driver.vehicle.plate_number} · {driver.vehicle.brand} {driver.vehicle.model}</p>
          </div>
        </div>
      )}

      {/* Vehicle Details */}
      <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`text-xs font-bold uppercase tracking-widest border-b pb-3 ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Vehicle Info</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Vehicle Name</span>
            <input value={vehicleForm.vehicle_name} onChange={(e) => setField("vehicle_name", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Swift Dzire, Innova..." />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Vehicle Type</span>
            <select value={vehicleForm.vehicle_type} onChange={(e) => setField("vehicle_type", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}>
              {["Cab", "Auto", "Bike", "Mini", "Prime", "SUV"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Brand</span>
            <input value={vehicleForm.brand} onChange={(e) => setField("brand", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Maruti, Toyota..." />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Model</span>
            <input value={vehicleForm.model} onChange={(e) => setField("model", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="2024 model" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Plate Number</span>
            <input value={vehicleForm.plate_number} onChange={(e) => setField("plate_number", e.target.value.toUpperCase())} className={`field-input uppercase ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="TN01AB1234" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Color</span>
            <input value={vehicleForm.color} onChange={(e) => setField("color", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="White" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Year</span>
            <input type="number" value={vehicleForm.year} onChange={(e) => setField("year", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="2024" />
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Seat Capacity</span>
            <input type="number" min={1} max={12} value={vehicleForm.seat_capacity} onChange={(e) => setField("seat_capacity", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} />
          </label>
        </div>

        <label className={`field-check w-full cursor-pointer ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
          <input type="checkbox" checked={vehicleForm.air_conditioned} onChange={(e) => setField("air_conditioned", e.target.checked)} className="accent-[#facc15]" />
          <span className="text-sm font-semibold">Air Conditioned</span>
        </label>

        <label className="block">
          <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Availability Notes</span>
          <textarea value={vehicleForm.availability_notes} onChange={(e) => setField("availability_notes", e.target.value)} rows={2} className={`field-input resize-y ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Working hours, areas, etc." />
        </label>
      </div>

      {/* Fare Configuration */}
      <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`text-xs font-bold uppercase tracking-widest border-b pb-3 ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Fare Configuration</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Base Fare (₹)</span>
            <input type="number" min={0} value={vehicleForm.base_fare} onChange={(e) => setField("base_fare", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} />
            <p className={`mt-1.5 text-xs ${isDark ? "text-zinc-600" : "text-slate-400"}`}>Flat starting charge for each ride</p>
          </label>
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Per KM Rate (₹)</span>
            <input type="number" min={0} value={vehicleForm.per_km_rate} onChange={(e) => setField("per_km_rate", e.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} />
            <p className={`mt-1.5 text-xs ${isDark ? "text-zinc-600" : "text-slate-400"}`}>Charged per kilometre driven</p>
          </label>
        </div>
        <div className={`rounded-xl border p-4 ${isDark ? "bg-[#facc15]/5 border-[#facc15]/20" : "bg-amber-50 border-amber-200"}`}>
          <p className={`text-xs font-bold mb-1 ${isDark ? "text-[#facc15]" : "text-amber-600"}`}>Estimated fare preview</p>
          <p className={`text-sm ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
            For a 10 km trip: <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>₹{(Number(vehicleForm.base_fare || 0) + 10 * Number(vehicleForm.per_km_rate || 0)).toFixed(0)}</span>
          </p>
        </div>
      </div>

      {/* Vehicle Documents */}
      <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`text-xs font-bold uppercase tracking-widest border-b pb-3 ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Vehicle Documents</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <UploadField isDark={isDark} label="Vehicle Photo" file={vehicleFiles.photo_url} url={vehicleAssets.photo_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, photo_url: f }))} />
          <UploadField isDark={isDark} label="RC Document" file={vehicleFiles.rc_image_url} url={vehicleAssets.rc_image_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, rc_image_url: f }))} />
          <UploadField isDark={isDark} label="Insurance" file={vehicleFiles.insurance_image_url} url={vehicleAssets.insurance_image_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, insurance_image_url: f }))} />
        </div>
      </div>

      <button
        onClick={saveVehicle}
        disabled={savingVehicle}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3.5 text-sm font-bold text-zinc-900 hover:bg-[#eab308] transition-colors disabled:opacity-60"
      >
        <Save size={16} />
        {savingVehicle ? "Saving..." : "Save Vehicle"}
      </button>
    </div>
  );
};

export default VehiclePage;
