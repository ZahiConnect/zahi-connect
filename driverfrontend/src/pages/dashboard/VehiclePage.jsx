import { CarFront, FileImage, Save } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";

const UploadField = ({ label, file, url, onChange }) => (
  <label className="block">
    <span className="field-label flex items-center gap-1.5" style={{color:"#71717a"}}>
      <FileImage className="h-3.5 w-3.5" />
      {label}
    </span>
    <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} className="field-upload" />
    <p className="mt-1.5 text-xs text-zinc-500">{file ? file.name : url ? "✓ Uploaded" : "No file selected"}</p>
  </label>
);

const VehiclePage = () => {
  const {
    driver, vehicleForm, setVehicleForm,
    vehicleAssets, vehicleFiles, setVehicleFiles,
    savingVehicle, saveVehicle,
  } = useDashboard();

  const setField = (key, val) => setVehicleForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vehicle</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">My Vehicle</h1>
        <p className="mt-1 text-sm text-zinc-500">Update your cab details, fares, and vehicle documents.</p>
      </div>

      {/* Vehicle identity strip */}
      {driver?.vehicle && (
        <div className="flex items-center gap-4 rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5">
          <div className="h-14 w-14 rounded-2xl bg-[#facc15]/10 flex items-center justify-center text-[#facc15] flex-shrink-0">
            <CarFront size={26} />
          </div>
          <div>
            <p className="text-base font-bold text-white">{driver.vehicle.vehicle_name}</p>
            <p className="text-xs text-zinc-500">{driver.vehicle.plate_number} · {driver.vehicle.brand} {driver.vehicle.model}</p>
          </div>
        </div>
      )}

      {/* Vehicle Details */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3">Vehicle Info</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Vehicle Name</span>
            <input value={vehicleForm.vehicle_name} onChange={(e) => setField("vehicle_name", e.target.value)} className="field-input" placeholder="Swift Dzire, Innova..." style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Vehicle Type</span>
            <select value={vehicleForm.vehicle_type} onChange={(e) => setField("vehicle_type", e.target.value)} className="field-input" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}}>
              {["Cab", "Auto", "Bike", "Mini", "Prime", "SUV"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Brand</span>
            <input value={vehicleForm.brand} onChange={(e) => setField("brand", e.target.value)} className="field-input" placeholder="Maruti, Toyota..." style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Model</span>
            <input value={vehicleForm.model} onChange={(e) => setField("model", e.target.value)} className="field-input" placeholder="2024 model" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Plate Number</span>
            <input value={vehicleForm.plate_number} onChange={(e) => setField("plate_number", e.target.value.toUpperCase())} className="field-input uppercase" placeholder="TN01AB1234" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Color</span>
            <input value={vehicleForm.color} onChange={(e) => setField("color", e.target.value)} className="field-input" placeholder="White" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Year</span>
            <input type="number" value={vehicleForm.year} onChange={(e) => setField("year", e.target.value)} className="field-input" placeholder="2024" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Seat Capacity</span>
            <input type="number" min={1} max={12} value={vehicleForm.seat_capacity} onChange={(e) => setField("seat_capacity", e.target.value)} className="field-input" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
          </label>
        </div>

        <label className="field-check w-full cursor-pointer" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}}>
          <input type="checkbox" checked={vehicleForm.air_conditioned} onChange={(e) => setField("air_conditioned", e.target.checked)} style={{accentColor:"#facc15"}} />
          <span className="text-sm font-semibold">Air Conditioned</span>
        </label>

        <label className="block">
          <span className="field-label" style={{color:"#71717a"}}>Availability Notes</span>
          <textarea value={vehicleForm.availability_notes} onChange={(e) => setField("availability_notes", e.target.value)} rows={2} className="field-input" placeholder="Working hours, areas, etc." style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa",resize:"vertical"}} />
        </label>
      </div>

      {/* Fare Configuration */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3">Fare Configuration</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Base Fare (₹)</span>
            <input type="number" min={0} value={vehicleForm.base_fare} onChange={(e) => setField("base_fare", e.target.value)} className="field-input" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
            <p className="mt-1.5 text-xs text-zinc-600">Flat starting charge for each ride</p>
          </label>
          <label className="block">
            <span className="field-label" style={{color:"#71717a"}}>Per KM Rate (₹)</span>
            <input type="number" min={0} value={vehicleForm.per_km_rate} onChange={(e) => setField("per_km_rate", e.target.value)} className="field-input" style={{background:"#18181b",borderColor:"#3f3f46",color:"#fafafa"}} />
            <p className="mt-1.5 text-xs text-zinc-600">Charged per kilometre driven</p>
          </label>
        </div>
        <div className="rounded-xl bg-[#facc15]/5 border border-[#facc15]/20 p-4">
          <p className="text-xs font-bold text-[#facc15] mb-1">Estimated fare preview</p>
          <p className="text-sm text-zinc-300">
            For a 10 km trip: <span className="font-bold text-white">₹{(Number(vehicleForm.base_fare || 0) + 10 * Number(vehicleForm.per_km_rate || 0)).toFixed(0)}</span>
          </p>
        </div>
      </div>

      {/* Vehicle Documents */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3">Vehicle Documents</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <UploadField label="Vehicle Photo" file={vehicleFiles.photo_url} url={vehicleAssets.photo_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, photo_url: f }))} />
          <UploadField label="RC Document" file={vehicleFiles.rc_image_url} url={vehicleAssets.rc_image_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, rc_image_url: f }))} />
          <UploadField label="Insurance" file={vehicleFiles.insurance_image_url} url={vehicleAssets.insurance_image_url}
            onChange={(f) => setVehicleFiles((p) => ({ ...p, insurance_image_url: f }))} />
        </div>
      </div>

      <button
        onClick={saveVehicle}
        disabled={savingVehicle}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3.5 text-sm font-bold text-[#09090b] hover:bg-[#eab308] transition-colors disabled:opacity-60"
      >
        <Save size={16} />
        {savingVehicle ? "Saving..." : "Save Vehicle"}
      </button>
    </div>
  );
};

export default VehiclePage;
