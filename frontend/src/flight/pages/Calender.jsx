import { useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trash2,
} from "lucide-react";
import dbs from "../api/db";
import {
  FARE_CLASS_PRESETS,
  buildClassMix,
  buildRoutePerformance,
  createFlightDraft,
  formatCurrency,
  formatRouteLabel,
  getLoadFactor,
  normalizeBookingRecord,
  normalizeFlightRecord,
} from "../lib/workspace";
import {
  FlightBadge,
  FlightButton,
  FlightEmptyState,
  FlightField,
  FlightHero,
  FlightInput,
  FlightModal,
  FlightPanel,
  FlightSearchField,
  FlightTextarea,
  FlightWorkspacePage,
  ProgressBar,
} from "../components/WorkspaceChrome";

function FareClassModal({ open, existing, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? { name: existing.name || "", description: existing.description || "" }
        : { name: "", description: "" }
    );
    setError("");
  }, [existing, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Fare class name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (existing?.id) {
        await dbs.editDocument("flight_types", existing.id, form);
      } else {
        await dbs.addAutoIdDocument("flight_types", form);
      }
      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "The fare class could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlightModal
      open={open}
      onClose={onClose}
      title={existing ? "Edit fare class" : "Add fare class"}
      description="Keep your cabin tiers documented for pricing, merchandising, and passenger-facing copy."
      icon={Layers3}
      widthClass="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3">
          <FlightButton variant="secondary" onClick={onClose}>
            Cancel
          </FlightButton>
          <FlightButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : existing ? "Save class" : "Create class"}
          </FlightButton>
        </div>
      }
    >
      <div className="grid gap-5">
        <FlightField label="Class name" required>
          <FlightInput
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Economy"
          />
        </FlightField>

        <FlightField label="Description">
          <FlightTextarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Explain the tier, baggage promise, perks, or boarding rules."
          />
        </FlightField>

        {error ? (
          <div className="rounded-2xl border border-[#F3CDD7] bg-[#FFF2F5] px-4 py-3 text-sm text-[#B33863]">
            {error}
          </div>
        ) : null}
      </div>
    </FlightModal>
  );
}

function RoutePricingModal({ open, flight, onClose, onSaved }) {
  const [form, setForm] = useState(createFlightDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !flight) return;
    setForm({
      ...flight,
    });
    setError("");
  }, [flight, open]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!flight?.id) return;

    setSaving(true);
    setError("");
    try {
      await dbs.editDocument("flights", flight.id, {
        economyPrice: Number(form.economyPrice || 0),
        businessPrice: Number(form.businessPrice || 0),
        firstPrice: Number(form.firstPrice || 0),
      });
      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "Route pricing could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlightModal
      open={open}
      onClose={onClose}
      title={flight ? `Adjust ${flight.flightNumber}` : "Adjust route pricing"}
      description="Update fare anchors for the selected route without reopening the full schedule form."
      icon={BadgeIndianRupee}
      widthClass="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <FlightButton variant="secondary" onClick={onClose}>
            Cancel
          </FlightButton>
          <FlightButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save pricing"}
          </FlightButton>
        </div>
      }
    >
      <div className="grid gap-6">
        <div className="rounded-[24px] border border-[#D9E7F5] bg-[#F8FBFF] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <FlightBadge tone="blue">{flight?.flightNumber}</FlightBadge>
            <FlightBadge tone="slate">
              {flight ? formatRouteLabel(flight.from, flight.to) : "Route"}
            </FlightBadge>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#617D97]">
            Adjust the three cabin anchors below. Schedule, manifest, and report screens will all
            read these route prices afterward.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <FlightField label="Economy price">
            <FlightInput
              type="number"
              min="0"
              value={form.economyPrice}
              onChange={(event) => updateField("economyPrice", event.target.value)}
            />
          </FlightField>

          <FlightField label="Business price">
            <FlightInput
              type="number"
              min="0"
              value={form.businessPrice}
              onChange={(event) => updateField("businessPrice", event.target.value)}
            />
          </FlightField>

          <FlightField label="First price">
            <FlightInput
              type="number"
              min="0"
              value={form.firstPrice}
              onChange={(event) => updateField("firstPrice", event.target.value)}
            />
          </FlightField>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#F3CDD7] bg-[#FFF2F5] px-4 py-3 text-sm text-[#B33863]">
            {error}
          </div>
        ) : null}
      </div>
    </FlightModal>
  );
}

export default function FlightPricing() {
  const [fareClasses, setFareClasses] = useState([]);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fareModalOpen, setFareModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const [fareResponse, flightResponse, bookingResponse] = await Promise.all([
        dbs.readCollection("flight_types", 100),
        dbs.readCollection("flights", 300),
        dbs.readCollection("bookings", 500),
      ]);

      const normalizedFlights = (flightResponse || []).map((flight, index) =>
        normalizeFlightRecord(flight, index)
      );
      const normalizedBookings = (bookingResponse || []).map((booking, index) =>
        normalizeBookingRecord(booking, index, normalizedFlights)
      );

      setFareClasses(fareResponse || []);
      setFlights(normalizedFlights);
      setBookings(normalizedBookings);
    } catch {
      setFareClasses([]);
      setFlights([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const loadPresetClasses = async () => {
    await Promise.all(
      FARE_CLASS_PRESETS.map((preset) => dbs.addAutoIdDocument("flight_types", preset))
    );
    fetchPricing();
  };

  const deleteFareClass = async (classId) => {
    if (!window.confirm("Delete this fare class?")) {
      return;
    }

    await dbs.deleteDocument("flight_types", classId);
    fetchPricing();
  };

  const filteredFlights = flights.filter((flight) => {
    const value = search.toLowerCase();
    return (
      flight.flightNumber.toLowerCase().includes(value) ||
      flight.from.toLowerCase().includes(value) ||
      flight.to.toLowerCase().includes(value)
    );
  });

  const classMix = buildClassMix(bookings);
  const routePerformance = buildRoutePerformance(flights, bookings);
  const topYieldRoute = routePerformance[0];
  const averageBaseFare = flights.length
    ? Math.round(flights.reduce((total, flight) => total + flight.economyPrice, 0) / flights.length)
    : 0;
  const premiumPassengers = classMix
    .filter((item) => item.label !== "Economy")
    .reduce((total, item) => total + item.value, 0);
  const totalPassengers = classMix.reduce((total, item) => total + item.value, 0);
  const premiumMix = totalPassengers ? Math.round((premiumPassengers / totalPassengers) * 100) : 0;

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Pricing engine"
        title="Shape cabin tiers, route fares, and yield direction from one pricing board."
        description="The copied flight reference already gave us the cabin language and route structure. This page turns it into a real pricing surface tied directly to your scheduled sectors."
        actions={
          <>
            <FlightButton variant="secondary" onClick={fetchPricing}>
              <RefreshCw size={16} />
              Refresh pricing
            </FlightButton>
            <FlightButton onClick={() => setFareModalOpen(true)}>
              <Plus size={16} />
              Add fare class
            </FlightButton>
          </>
        }
        stats={[
          {
            label: "Fare classes",
            value: fareClasses.length,
            detail: "Cabin tiers documented for the workspace pricing model.",
            icon: Layers3,
            tone: "blue",
          },
          {
            label: "Average base fare",
            value: formatCurrency(averageBaseFare),
            detail: "Current economy starting price across scheduled routes.",
            icon: BadgeIndianRupee,
            tone: "amber",
          },
          {
            label: "Premium mix",
            value: `${premiumMix}%`,
            detail: "Share of Business and First travelers in current bookings.",
            icon: Sparkles,
            tone: "indigo",
          },
          {
            label: "Top yielding route",
            value: topYieldRoute?.routeLabel || "Awaiting sales",
            detail: topYieldRoute
              ? `${formatCurrency(topYieldRoute.revenue)} revenue captured so far.`
              : "Route ranking begins once bookings arrive.",
            icon: TrendingUp,
            tone: "emerald",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
        <div className="space-y-6">
          <FlightPanel
            title="Fare class library"
            description="Keep the official cabin descriptions in one place so pricing, marketing, and ops speak the same language."
            action={
              fareClasses.length === 0 ? (
                <FlightButton variant="secondary" onClick={loadPresetClasses}>
                  Load copied presets
                </FlightButton>
              ) : null
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#7191AF]">
                <RefreshCw className="animate-spin" />
              </div>
            ) : fareClasses.length === 0 ? (
              <FlightEmptyState
                icon={Layers3}
                title="No fare classes yet"
                description="You can add them one by one or load the copied Economy, Business, and First presets from the reference pack."
                action={<FlightButton onClick={loadPresetClasses}>Load copied presets</FlightButton>}
              />
            ) : (
              <div className="space-y-4">
                {fareClasses.map((fareClass) => (
                  <article
                    key={fareClass.id}
                    className="rounded-[22px] border border-[#E3ECF6] bg-[#F8FBFF] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-2xl text-[#173453]">{fareClass.name}</p>
                        <p className="mt-2 text-sm leading-6 text-[#617D97]">
                          {fareClass.description || "No descriptive copy added yet."}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <FlightButton
                          variant="ghost"
                          className="px-3 py-2"
                          onClick={() => {
                            setEditingClass(fareClass);
                            setFareModalOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </FlightButton>
                        <FlightButton
                          variant="danger"
                          className="px-3 py-2"
                          onClick={() => deleteFareClass(fareClass.id)}
                        >
                          <Trash2 size={14} />
                        </FlightButton>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </FlightPanel>

          <FlightPanel
            title="Passenger class mix"
            description="A quick read on how current bookings are distributed across cabin tiers."
          >
            <div className="space-y-4">
              {classMix.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[#38556F]">
                    <span>{item.label}</span>
                    <span className="font-semibold">
                      {item.value} travelers · {item.percentage}%
                    </span>
                  </div>
                  <ProgressBar
                    value={item.percentage}
                    tone={
                      item.label === "Economy"
                        ? "blue"
                        : item.label === "Business"
                          ? "indigo"
                          : "amber"
                    }
                  />
                </div>
              ))}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Copied tier guidance"
            description="The reference pack already suggests the main cabin structure, so the workspace now exposes it directly."
          >
            <div className="space-y-3">
              {FARE_CLASS_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3"
                >
                  <p className="font-semibold text-[#173453]">{preset.name}</p>
                  <p className="mt-1 text-sm text-[#69839D]">{preset.description}</p>
                </div>
              ))}
            </div>
          </FlightPanel>
        </div>

        <FlightPanel
          title="Route pricing board"
          description="Adjust route anchors while seeing demand pressure and yield potential at the same time."
          action={
            <FlightSearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search route or flight number"
            />
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#7191AF]">
              <RefreshCw className="animate-spin" />
            </div>
          ) : filteredFlights.length === 0 ? (
            <FlightEmptyState
              icon={BadgeIndianRupee}
              title="No route pricing available yet"
              description="Add flights on the Schedule page first. Their route fares will then appear here for pricing control."
            />
          ) : (
            <div className="grid gap-4">
              {filteredFlights.map((flight) => {
                const loadFactor = getLoadFactor(flight, bookings);
                const guidance =
                  loadFactor > 75
                    ? "High demand: premium fares can support a stronger yield push."
                    : loadFactor > 45
                      ? "Balanced demand: keep the current spread and watch conversion."
                      : "Soft demand: consider promotional economy positioning.";

                return (
                  <article
                    key={flight.id}
                    className="rounded-[26px] border border-[#E2EBF5] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-serif text-3xl text-[#173453]">{flight.flightNumber}</p>
                          <FlightBadge tone="slate">{formatRouteLabel(flight.from, flight.to)}</FlightBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#617D97]">{guidance}</p>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#68839E]">
                              Economy
                            </p>
                            <p className="mt-2 font-serif text-2xl text-[#173453]">
                              {formatCurrency(flight.economyPrice)}
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#68839E]">
                              Business
                            </p>
                            <p className="mt-2 font-serif text-2xl text-[#173453]">
                              {formatCurrency(flight.businessPrice)}
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#68839E]">
                              First
                            </p>
                            <p className="mt-2 font-serif text-2xl text-[#173453]">
                              {formatCurrency(flight.firstPrice)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-[260px]">
                        <div className="rounded-[22px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                          <div className="flex items-center justify-between text-sm text-[#38556F]">
                            <span>Current demand</span>
                            <span className="font-semibold">{loadFactor}% load</span>
                          </div>
                          <div className="mt-3">
                            <ProgressBar
                              value={loadFactor}
                              tone={loadFactor > 75 ? "emerald" : loadFactor > 45 ? "blue" : "amber"}
                            />
                          </div>
                          <p className="mt-4 text-xs leading-5 text-[#6A839D]">
                            Premium uplift: {formatCurrency(flight.businessPrice - flight.economyPrice)}
                            {" · "}
                            First uplift: {formatCurrency(flight.firstPrice - flight.businessPrice)}
                          </p>
                          <div className="mt-4 flex justify-end">
                            <FlightButton
                              variant="secondary"
                              onClick={() => {
                                setSelectedFlight(flight);
                                setPricingModalOpen(true);
                              }}
                            >
                              Adjust fares
                            </FlightButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </FlightPanel>
      </div>

      <FareClassModal
        open={fareModalOpen}
        existing={editingClass}
        onClose={() => {
          setFareModalOpen(false);
          setEditingClass(null);
        }}
        onSaved={() => {
          setFareModalOpen(false);
          setEditingClass(null);
          fetchPricing();
        }}
      />

      <RoutePricingModal
        open={pricingModalOpen}
        flight={selectedFlight}
        onClose={() => {
          setPricingModalOpen(false);
          setSelectedFlight(null);
        }}
        onSaved={() => {
          setPricingModalOpen(false);
          setSelectedFlight(null);
          fetchPricing();
        }}
      />
    </FlightWorkspacePage>
  );
}
