import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineCheckCircle } from "react-icons/hi";

import restaurantService from "../../../services/restaurantService";
import {
  buildOperationsForm,
  Field,
  inputClassName,
  priceBands,
  RestaurantSettingsShell,
  serviceModes,
} from "./shared";
import { splitCommaValues, useRestaurantSettingsPage } from "./useRestaurantSettingsPage";

export default function RestaurantOperationsSettings() {
  const { settings, loading, hydrate } = useRestaurantSettingsPage();
  const [form, setForm] = useState(buildOperationsForm(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildOperationsForm(settings));
  }, [settings]);

  const updateField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleServiceMode = (mode) => {
    setForm((current) => {
      const exists = current.service_modes.includes(mode);
      const nextModes = exists
        ? current.service_modes.filter((item) => item !== mode)
        : [...current.service_modes, mode];

      return {
        ...current,
        service_modes: nextModes.length ? nextModes : [mode],
      };
    });
  };

  const saveOperations = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      hydrate(
        await restaurantService.updateSettingsOperations({
          ...form,
          cuisine_tags: splitCommaValues(form.cuisine_tags),
          average_prep_minutes: Number(form.average_prep_minutes) || 20,
          seating_capacity: form.seating_capacity ? Number(form.seating_capacity) : null,
        })
      );
      toast.success("Operations settings saved.");
    } catch (error) {
      console.error("Failed to save restaurant operations", error);
      toast.error(error.response?.data?.detail || "Could not save operations settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[30px] bg-[#F4ECE2]" />
        <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
        </div>
      </div>
    );
  }

  return (
    <RestaurantSettingsShell
      sectionLabel="Settings - Operations"
      title="Dining service defaults and operating controls."
      description="Set how the restaurant serves customers, how long it usually takes, and the type of experience the outlet offers."
      settings={settings}
    >
      <form onSubmit={saveOperations} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-[#201711]">Operations</h2>
          <p className="mt-2 text-sm leading-7 text-[#6D5A4B]">
            These preferences help shape restaurant availability, service behavior, and customer expectation.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-[#4E4034]">Service modes</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {serviceModes.map((mode) => {
              const active = form.service_modes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => toggleServiceMode(mode.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#1F1A17] text-white"
                      : "border border-[#E3D6CA] bg-white text-[#5D4B3D]"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Opening time">
            <input className={inputClassName} type="time" value={form.opening_time} onChange={updateField("opening_time")} />
          </Field>
          <Field label="Closing time">
            <input className={inputClassName} type="time" value={form.closing_time} onChange={updateField("closing_time")} />
          </Field>
          <Field label="Average prep time">
            <input className={inputClassName} type="number" value={form.average_prep_minutes} onChange={updateField("average_prep_minutes")} />
          </Field>
          <Field label="Seating capacity">
            <input className={inputClassName} type="number" value={form.seating_capacity} onChange={updateField("seating_capacity")} />
          </Field>
        </div>

        <Field label="Price positioning">
          <select className={inputClassName} value={form.price_band} onChange={updateField("price_band")}>
            {priceBands.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cuisine tags">
          <input
            className={inputClassName}
            value={form.cuisine_tags}
            onChange={updateField("cuisine_tags")}
            placeholder="Kerala, Chinese, Juice, Grill"
          />
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-[#E7DCCE] bg-[#FCF7F1] px-4 py-4">
          <input
            type="checkbox"
            checked={form.accepts_reservations}
            onChange={updateField("accepts_reservations")}
            className="h-4 w-4 rounded border-[#DCC9B6] text-[#1F1A17] focus:ring-[#C17B54]"
          />
          <div>
            <p className="text-sm font-semibold text-[#21170F]">Accept reservations</p>
            <p className="text-xs text-[#786657]">Enable this if your team actively handles advance tables.</p>
          </div>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#382920] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiOutlineCheckCircle className="text-base" />
            {saving ? "Saving..." : "Save operations"}
          </button>
        </div>
      </form>
    </RestaurantSettingsShell>
  );
}
