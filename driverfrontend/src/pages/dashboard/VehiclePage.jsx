import { useEffect, useState } from "react";
import { CarFront, CloudUpload, ExternalLink, FileImage, Save, Trash2 } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";

const useFilePreviews = (files = []) => {
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (!files.length) {
      setPreviewUrls([]);
      return undefined;
    }

    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return previewUrls;
};

const imageKey = (url, index) => `${url}-${index}`;

const MultiUploadField = ({
  label,
  files = [],
  urls = [],
  onAddFiles,
  onRemoveFile,
  onRemoveUrl,
  isDark,
}) => {
  const filePreviewUrls = useFilePreviews(files);
  const hasImages = urls.length > 0 || filePreviewUrls.length > 0;

  return (
    <div className="block">
      <span className={`field-label flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
        <FileImage className="h-3.5 w-3.5" />
        {label}
      </span>

      <div className={`mb-3 rounded-2xl border p-3 ${isDark ? "border-zinc-800 bg-zinc-950" : "border-slate-200 bg-slate-50"}`}>
        {hasImages ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {urls.map((url, index) => {
              const uploadedToCloudinary = typeof url === "string" && url.includes("cloudinary");
              return (
                <div key={imageKey(url, index)} className="group relative overflow-hidden rounded-xl">
                  <img src={url} alt={`${label} saved ${index + 1}`} className="h-28 w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-zinc-950/70 px-2 py-1.5 text-[10px] font-bold text-white">
                    <span className="truncate">{uploadedToCloudinary ? "Cloudinary" : "Saved"}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-1 hover:bg-white/15" aria-label={`Open ${label} ${index + 1}`}>
                        <ExternalLink size={12} />
                      </a>
                      <button type="button" onClick={() => onRemoveUrl(index)} className="rounded-lg p-1 hover:bg-white/15" aria-label={`Remove saved ${label} ${index + 1}`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filePreviewUrls.map((url, index) => (
              <div key={imageKey(url, index)} className="group relative overflow-hidden rounded-xl">
                <img src={url} alt={`${label} selected ${index + 1}`} className="h-28 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-zinc-950/70 px-2 py-1.5 text-[10px] font-bold text-white">
                  <span className="truncate">New</span>
                  <button type="button" onClick={() => onRemoveFile(index)} className="rounded-lg p-1 hover:bg-white/15" aria-label={`Remove selected ${label} ${index + 1}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex h-36 items-center justify-center rounded-xl ${isDark ? "text-zinc-600" : "text-slate-300"}`}>
            <CloudUpload size={28} />
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          onAddFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
        className="field-upload"
      />
      <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
        <span>{files.length ? `${files.length} new image${files.length === 1 ? "" : "s"} upload to Cloudinary on save` : urls.length ? `${urls.length} saved image${urls.length === 1 ? "" : "s"}` : "No files selected"}</span>
      </div>
    </div>
  );
};

const VehiclePage = () => {
  const {
    driver,
    vehicleForm,
    setVehicleForm,
    vehicleAssets,
    setVehicleAssets,
    vehicleFiles,
    setVehicleFiles,
    savingVehicle,
    saveVehicle,
    theme,
  } = useDashboard();

  const isDark = theme === "dark";

  const setField = (key, value) => {
    setVehicleForm((current) => ({ ...current, [key]: value }));
  };

  const addVehicleFiles = (key, files) => {
    if (!files.length) return;
    setVehicleFiles((current) => ({
      ...current,
      [key]: [...(current[key] || []), ...files].slice(0, 12),
    }));
  };

  const removeVehicleFile = (key, indexToRemove) => {
    setVehicleFiles((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const removeVehicleAsset = (key, indexToRemove) => {
    setVehicleAssets((current) => {
      const nextUrls = (current[key] || []).filter((_, index) => index !== indexToRemove);
      const next = { ...current, [key]: nextUrls };

      if (key === "photo_urls") next.photo_url = nextUrls[0] || null;
      if (key === "rc_image_urls") next.rc_image_url = nextUrls[0] || null;
      if (key === "insurance_image_urls") next.insurance_image_url = nextUrls[0] || null;

      return next;
    });
  };

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Vehicle</p>
        <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>My Vehicle</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Update your cab details and vehicle documents.</p>
      </div>

      {driver?.vehicle ? (
        <div className={`flex items-center gap-4 rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-[#facc15]/10 text-[#facc15]" : "bg-amber-50 text-amber-600"}`}>
            <CarFront size={26} />
          </div>
          <div>
            <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{driver.vehicle.vehicle_name}</p>
            <p className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              {driver.vehicle.plate_number} - {driver.vehicle.brand} {driver.vehicle.model}
            </p>
          </div>
        </div>
      ) : null}

      <div className={`space-y-5 rounded-2xl border p-6 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`border-b pb-3 text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Vehicle Info</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Vehicle Name</span>
            <input value={vehicleForm.vehicle_name} onChange={(event) => setField("vehicle_name", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Swift Dzire, Innova..." />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Vehicle Type</span>
            <select value={vehicleForm.vehicle_type} onChange={(event) => setField("vehicle_type", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}>
              {["Cab", "Auto", "Bike", "Mini", "Prime", "SUV"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Brand</span>
            <input value={vehicleForm.brand} onChange={(event) => setField("brand", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Maruti, Toyota..." />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Model</span>
            <input value={vehicleForm.model} onChange={(event) => setField("model", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="2024 model" />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Plate Number</span>
            <input value={vehicleForm.plate_number} onChange={(event) => setField("plate_number", event.target.value.toUpperCase())} className={`field-input uppercase ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="TN01AB1234" />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Color</span>
            <input value={vehicleForm.color} onChange={(event) => setField("color", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="White" />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Year</span>
            <input type="number" value={vehicleForm.year} onChange={(event) => setField("year", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="2024" />
          </label>

          <label className="block">
            <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Seat Capacity</span>
            <input type="number" min={1} max={12} value={vehicleForm.seat_capacity} onChange={(event) => setField("seat_capacity", event.target.value)} className={`field-input ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} />
          </label>
        </div>

        <label className={`field-check w-full cursor-pointer ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
          <input type="checkbox" checked={vehicleForm.air_conditioned} onChange={(event) => setField("air_conditioned", event.target.checked)} className="accent-[#facc15]" />
          <span className="text-sm font-semibold">Air Conditioned</span>
        </label>

        <label className="block">
          <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Availability Notes</span>
          <textarea value={vehicleForm.availability_notes} onChange={(event) => setField("availability_notes", event.target.value)} rows={2} className={`field-input resize-y ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`} placeholder="Working hours, areas, etc." />
        </label>
      </div>

      <div className={`space-y-5 rounded-2xl border p-6 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <div className={`border-b pb-3 ${isDark ? "border-zinc-800" : "border-slate-100"}`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Vehicle Documents</p>
          <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Vehicle photos and documents upload to Cloudinary when you save.</p>
        </div>
        <div className="grid gap-5">
          <MultiUploadField
            isDark={isDark}
            label="Vehicle Photos"
            files={vehicleFiles.photo_urls}
            urls={vehicleAssets.photo_urls}
            onAddFiles={(files) => addVehicleFiles("photo_urls", files)}
            onRemoveFile={(index) => removeVehicleFile("photo_urls", index)}
            onRemoveUrl={(index) => removeVehicleAsset("photo_urls", index)}
          />
          <MultiUploadField
            isDark={isDark}
            label="RC Documents"
            files={vehicleFiles.rc_image_urls}
            urls={vehicleAssets.rc_image_urls}
            onAddFiles={(files) => addVehicleFiles("rc_image_urls", files)}
            onRemoveFile={(index) => removeVehicleFile("rc_image_urls", index)}
            onRemoveUrl={(index) => removeVehicleAsset("rc_image_urls", index)}
          />
          <MultiUploadField
            isDark={isDark}
            label="Insurance Images"
            files={vehicleFiles.insurance_image_urls}
            urls={vehicleAssets.insurance_image_urls}
            onAddFiles={(files) => addVehicleFiles("insurance_image_urls", files)}
            onRemoveFile={(index) => removeVehicleFile("insurance_image_urls", index)}
            onRemoveUrl={(index) => removeVehicleAsset("insurance_image_urls", index)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={saveVehicle}
        disabled={savingVehicle}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3.5 text-sm font-bold text-zinc-900 transition-colors hover:bg-[#eab308] disabled:opacity-60"
      >
        <Save size={16} />
        {savingVehicle ? "Saving..." : "Save Vehicle"}
      </button>
    </div>
  );
};

export default VehiclePage;
