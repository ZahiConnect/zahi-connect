import { useEffect, useState } from "react";
import {
  Building2,
  ImagePlus,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import dbs from "../api/db";
import { SETTINGS_DEFAULTS } from "../lib/workspace";
import {
  FlightButton,
  FlightField,
  FlightHero,
  FlightInput,
  FlightPanel,
  FlightTextarea,
  FlightWorkspacePage,
} from "../components/WorkspaceChrome";

function MediaUploader({ label, helper, value, onChange }) {
  const [busy, setBusy] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const result = await dbs.uploadImage(file);
      onChange(result.url);
    } catch {
      window.alert("Image upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#637D97]">
        {label}
      </p>
      {value ? (
        <div className="relative overflow-hidden rounded-[24px] border border-[#D9E7F5] bg-[#F8FBFF]">
          <img src={value} alt={label} className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-3 inline-flex rounded-full bg-white/90 p-2 text-[#445E79] shadow-sm"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#C9DCEE] bg-[#F8FBFF] text-center text-[#5E7893] transition hover:border-[#7DB4F5] hover:bg-white">
          {busy ? <RefreshCw className="animate-spin" /> : <ImagePlus size={24} />}
          <span className="mt-3 text-sm font-semibold">Upload image</span>
          <span className="mt-1 text-xs">{helper}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      )}
      {value ? <p className="text-xs text-[#7A90A6]">{helper}</p> : null}
    </div>
  );
}

export default function FlightSettings() {
  const [form, setForm] = useState(SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const savedSettings = await dbs.readDocument("settings", "flight");
        setForm({
          ...SETTINGS_DEFAULTS,
          ...(savedSettings || {}),
        });
      } catch {
        setForm(SETTINGS_DEFAULTS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dbs.addDocument("settings", "flight", {
        ...form,
        boardingBufferMinutes: Number(form.boardingBufferMinutes || 0),
        checkInOpenHours: Number(form.checkInOpenHours || 0),
      });
      window.alert("Flight settings saved.");
    } catch {
      window.alert("Flight settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#7191AF]">
        <RefreshCw className="animate-spin" />
      </div>
    );
  }

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Airline settings"
        title="Shape the airline identity, support channels, and ops defaults behind the workspace."
        description="This settings page now matches the rest of the aviation dashboard and stores the flight workspace profile through an upsert flow, so a fresh airline setup saves cleanly."
        actions={
          <FlightButton onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save settings"}
          </FlightButton>
        }
        stats={[
          {
            label: "Airline name",
            value: form.name || "Not set",
            detail: "Public brand name used across the flight workspace.",
            icon: Building2,
            tone: "blue",
          },
          {
            label: "Support phone",
            value: form.phone || "Not set",
            detail: "Primary desk line for itinerary and booking help.",
            icon: Phone,
            tone: "indigo",
          },
          {
            label: "Support email",
            value: form.email || "Not set",
            detail: "Owner-facing escalation and passenger support inbox.",
            icon: Mail,
            tone: "emerald",
          },
          {
            label: "Hub airport",
            value: form.hubAirport || "Not set",
            detail: "Main operations anchor for schedule and branding copy.",
            icon: SettingsIcon,
            tone: "amber",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="space-y-6">
          <FlightPanel
            title="Airline identity"
            description="This information powers the visible brand layer of the flight workspace."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FlightField label="Display name">
                <FlightInput
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Zahi Airways"
                />
              </FlightField>

              <FlightField label="IATA code">
                <FlightInput
                  value={form.iataCode}
                  onChange={(event) => updateField("iataCode", event.target.value)}
                  placeholder="ZH"
                />
              </FlightField>

              <FlightField label="Hub airport">
                <FlightInput
                  value={form.hubAirport}
                  onChange={(event) => updateField("hubAirport", event.target.value)}
                  placeholder="DEL - New Delhi"
                />
              </FlightField>

              <FlightField label="Tagline">
                <FlightInput
                  value={form.tagline}
                  onChange={(event) => updateField("tagline", event.target.value)}
                  placeholder="Fly beyond expectations."
                />
              </FlightField>

              <div className="md:col-span-2">
                <FlightField label="About the airline">
                  <FlightTextarea
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Describe the airline voice, service promise, and differentiators."
                  />
                </FlightField>
              </div>
            </div>
          </FlightPanel>

          <FlightPanel
            title="Support and operations defaults"
            description="These values keep service expectations and internal defaults clear for the team."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FlightField label="Support phone">
                <FlightInput
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="+91..."
                />
              </FlightField>

              <FlightField label="Support email">
                <FlightInput
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="support@airline.com"
                />
              </FlightField>

              <FlightField label="Website">
                <FlightInput
                  value={form.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  placeholder="https://"
                />
              </FlightField>

              <FlightField label="Support hours">
                <FlightInput
                  value={form.supportHours}
                  onChange={(event) => updateField("supportHours", event.target.value)}
                  placeholder="24/7 owner desk"
                />
              </FlightField>

              <FlightField label="Check-in opens before departure (hours)">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.checkInOpenHours}
                  onChange={(event) => updateField("checkInOpenHours", event.target.value)}
                />
              </FlightField>

              <FlightField label="Boarding buffer (minutes)">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.boardingBufferMinutes}
                  onChange={(event) =>
                    updateField("boardingBufferMinutes", event.target.value)
                  }
                />
              </FlightField>

              <div className="md:col-span-2">
                <FlightField label="Headquarters address">
                  <FlightTextarea
                    value={form.addr}
                    onChange={(event) => updateField("addr", event.target.value)}
                    placeholder="Terminal office, city, state, postal code"
                  />
                </FlightField>
              </div>

              <div className="md:col-span-2">
                <FlightField label="Baggage policy">
                  <FlightTextarea
                    value={form.baggagePolicy}
                    onChange={(event) => updateField("baggagePolicy", event.target.value)}
                    placeholder="Cabin and checked baggage policy summary"
                  />
                </FlightField>
              </div>

              <div className="md:col-span-2">
                <FlightField label="Refund policy">
                  <FlightTextarea
                    value={form.refundPolicy}
                    onChange={(event) => updateField("refundPolicy", event.target.value)}
                    placeholder="Cancellations, modifications, and refund policy summary"
                  />
                </FlightField>
              </div>
            </div>
          </FlightPanel>
        </div>

        <div className="space-y-6">
          <FlightPanel
            title="Brand media"
            description="Upload the visuals that make the flight workspace feel like your own airline."
          >
            <div className="space-y-6">
              <MediaUploader
                label="Airline logo"
                helper="Square mark recommended for profile menu and internal workspace identity."
                value={form.logo}
                onChange={(value) => updateField("logo", value)}
              />

              <MediaUploader
                label="Cover image"
                helper="Wide visual used for hero or support-facing airline context."
                value={form.coverImage}
                onChange={(value) => updateField("coverImage", value)}
              />
            </div>
          </FlightPanel>

          <FlightPanel
            title="Workspace preview"
            description="A quick summary of how the airline identity will read inside the dashboard."
          >
            <div className="overflow-hidden rounded-[26px] border border-[#D9E7F5] bg-[linear-gradient(135deg,#EEF7FF_0%,#D7E9FB_56%,#B8D6F7_100%)]">
              <div className="relative h-40 w-full">
                {form.coverImage ? (
                  <img src={form.coverImage} alt="Airline cover" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,53,92,0.18),rgba(15,53,92,0.55))]" />
              </div>
              <div className="relative -mt-10 px-6 pb-6">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/70 bg-white shadow-lg">
                  {form.logo ? (
                    <img src={form.logo} alt="Airline logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-serif text-2xl text-[#163353]">
                      {(form.iataCode || "FL").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <h3 className="mt-5 font-serif text-3xl text-[#173453]">
                  {form.name || "Your airline name"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#426685]">
                  {form.tagline || "Add a tagline to describe the flight workspace promise."}
                </p>

                <div className="mt-5 grid gap-3 text-sm text-[#47657F]">
                  <div className="rounded-[18px] border border-[#E4EDF7] bg-white px-4 py-3">
                    Hub: {form.hubAirport || "Set a main airport"}
                  </div>
                  <div className="rounded-[18px] border border-[#E4EDF7] bg-white px-4 py-3">
                    Contact: {form.phone || "Phone"} · {form.email || "Email"}
                  </div>
                </div>
              </div>
            </div>
          </FlightPanel>
        </div>
      </div>
    </FlightWorkspacePage>
  );
}
