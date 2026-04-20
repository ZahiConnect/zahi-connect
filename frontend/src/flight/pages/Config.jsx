import { useEffect, useState } from "react";
import {
  Activity,
  CalendarRange,
  Pencil,
  PlaneTakeoff,
  Plus,
  RefreshCw,
  Trash2,
  Waves,
} from "lucide-react";
import dbs from "../api/db";
import {
  DAYS,
  FLIGHT_STATUSES,
  REFERENCE_AIRPORTS,
  REFERENCE_ROUTE_TEMPLATES,
  buildDayDistribution,
  buildRoutePerformance,
  createFlightDraft,
  formatCurrency,
  formatOperatingDays,
  formatRouteLabel,
  getLoadFactor,
  getStatusMeta,
  getTodayFlights,
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
  FlightSelect,
  FlightWorkspacePage,
  ProgressBar,
} from "../components/WorkspaceChrome";

const statusFilters = ["All", ...FLIGHT_STATUSES.map((status) => status.value)];

function FlightScheduleModal({ open, existing, preset, onClose, onSaved }) {
  const [form, setForm] = useState(createFlightDraft(preset));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (existing) {
      setForm({ ...existing });
    } else {
      setForm(createFlightDraft(preset));
    }

    setError("");
  }, [existing, open, preset]);

  const toggleDay = (dayValue) => {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(dayValue)
        ? current.daysOfWeek.filter((day) => day !== dayValue)
        : [...current.daysOfWeek, dayValue].sort((left, right) => left - right),
    }));
  };

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.flightNumber.trim()) {
      setError("Flight number is required.");
      return;
    }

    if (!form.from.trim() || !form.to.trim()) {
      setError("Choose both origin and destination airports.");
      return;
    }

    if (!form.daysOfWeek.length) {
      setError("Select at least one operating day.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        totalSeats: Number(form.economySeats || 0) + Number(form.businessSeats || 0) + Number(form.firstSeats || 0),
        durationMin: Number(form.durationMin || 0),
        economySeats: Number(form.economySeats || 0),
        businessSeats: Number(form.businessSeats || 0),
        firstSeats: Number(form.firstSeats || 0),
        economyPrice: Number(form.economyPrice || 0),
        businessPrice: Number(form.businessPrice || 0),
        firstPrice: Number(form.firstPrice || 0),
      };

      if (existing?.id) {
        await dbs.editDocument("flights", existing.id, payload);
      } else {
        await dbs.addAutoIdDocument("flights", payload);
      }

      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "This schedule could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlightModal
      open={open}
      onClose={onClose}
      title={existing ? "Edit scheduled flight" : "Add scheduled flight"}
      description="Set route, timing, capacity, and fare inventory without leaving the flight workspace."
      icon={PlaneTakeoff}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6C8299]">
            Seat total auto-syncs from Economy, Business, and First allocations.
          </p>
          <div className="flex gap-3">
            <FlightButton variant="secondary" onClick={onClose}>
              Cancel
            </FlightButton>
            <FlightButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : existing ? "Save flight" : "Create flight"}
            </FlightButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <FlightField label="Flight number" required>
            <FlightInput
              value={form.flightNumber}
              onChange={(event) => updateField("flightNumber", event.target.value)}
              placeholder="AI-101"
            />
          </FlightField>

          <FlightField label="Airline name">
            <FlightInput
              value={form.airlineName}
              onChange={(event) => updateField("airlineName", event.target.value)}
              placeholder="Air India"
            />
          </FlightField>

          <FlightField label="Origin" required>
            <FlightInput
              list="flight-airports"
              value={form.from}
              onChange={(event) => updateField("from", event.target.value)}
              placeholder="DEL - New Delhi"
            />
          </FlightField>

          <FlightField label="Destination" required>
            <FlightInput
              list="flight-airports"
              value={form.to}
              onChange={(event) => updateField("to", event.target.value)}
              placeholder="BOM - Mumbai"
            />
          </FlightField>
        </div>

        <datalist id="flight-airports">
          {REFERENCE_AIRPORTS.map((airport) => (
            <option key={airport.code} value={`${airport.code} - ${airport.city}`} />
          ))}
        </datalist>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
          <FlightField label="Departure">
            <FlightInput
              type="time"
              value={form.departTime}
              onChange={(event) => updateField("departTime", event.target.value)}
            />
          </FlightField>

          <FlightField label="Arrival">
            <FlightInput
              type="time"
              value={form.arriveTime}
              onChange={(event) => updateField("arriveTime", event.target.value)}
            />
          </FlightField>

          <FlightField label="Duration (min)">
            <FlightInput
              type="number"
              min="0"
              value={form.durationMin}
              onChange={(event) => updateField("durationMin", event.target.value)}
            />
          </FlightField>

          <FlightField label="Aircraft">
            <FlightInput
              value={form.aircraftType}
              onChange={(event) => updateField("aircraftType", event.target.value)}
              placeholder="Airbus A320neo"
            />
          </FlightField>

          <FlightField label="Status">
            <FlightSelect
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {FLIGHT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </FlightSelect>
          </FlightField>
        </div>

        <div className="rounded-[24px] border border-[#D9E7F5] bg-[#F8FBFF] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#637D97]">
            Operating days
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = form.daysOfWeek.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`inline-flex min-w-16 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-[#6EAEFD] bg-[#037FFC] text-white"
                      : "border-[#D4E2F0] bg-white text-[#496783]"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[24px] border border-[#D9E7F5] bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#637D97]">
              Economy
            </p>
            <div className="mt-4 grid gap-4">
              <FlightField label="Seats">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.economySeats}
                  onChange={(event) => updateField("economySeats", event.target.value)}
                />
              </FlightField>
              <FlightField label="Price">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.economyPrice}
                  onChange={(event) => updateField("economyPrice", event.target.value)}
                />
              </FlightField>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#D9E7F5] bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#637D97]">
              Business
            </p>
            <div className="mt-4 grid gap-4">
              <FlightField label="Seats">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.businessSeats}
                  onChange={(event) => updateField("businessSeats", event.target.value)}
                />
              </FlightField>
              <FlightField label="Price">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.businessPrice}
                  onChange={(event) => updateField("businessPrice", event.target.value)}
                />
              </FlightField>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#D9E7F5] bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#637D97]">
              First
            </p>
            <div className="mt-4 grid gap-4">
              <FlightField label="Seats">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.firstSeats}
                  onChange={(event) => updateField("firstSeats", event.target.value)}
                />
              </FlightField>
              <FlightField label="Price">
                <FlightInput
                  type="number"
                  min="0"
                  value={form.firstPrice}
                  onChange={(event) => updateField("firstPrice", event.target.value)}
                />
              </FlightField>
            </div>
          </div>
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

export default function FlightConfig() {
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalPreset, setModalPreset] = useState(null);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const [flightResponse, bookingResponse] = await Promise.all([
        dbs.readCollection("flights", 300),
        dbs.readCollection("bookings", 500),
      ]);

      const normalizedFlights = (flightResponse || []).map((flight, index) =>
        normalizeFlightRecord(flight, index)
      );
      const normalizedBookings = (bookingResponse || []).map((booking, index) =>
        normalizeBookingRecord(booking, index, normalizedFlights)
      );

      setFlights(normalizedFlights);
      setBookings(normalizedBookings);
    } catch {
      setFlights([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const filteredFlights = flights.filter((flight) => {
    const searchValue = search.toLowerCase();
    const matchesSearch =
      flight.flightNumber.toLowerCase().includes(searchValue) ||
      flight.from.toLowerCase().includes(searchValue) ||
      flight.to.toLowerCase().includes(searchValue) ||
      flight.aircraftType.toLowerCase().includes(searchValue);
    const matchesStatus = statusFilter === "All" || flight.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayFlights = getTodayFlights(flights);
  const averageLoad = flights.length
    ? Math.round(
        flights.reduce((total, flight) => total + getLoadFactor(flight, bookings), 0) / flights.length
      )
    : 0;
  const routePerformance = buildRoutePerformance(flights, bookings).slice(0, 4);
  const dayDistribution = buildDayDistribution(flights);
  const delayedFlights = flights.filter((flight) => flight.status !== "Active").length;

  const openCreate = () => {
    setEditing(null);
    setModalPreset(null);
    setModalOpen(true);
  };

  const openFromTemplate = (template) => {
    setEditing(null);
    setModalPreset(template);
    setModalOpen(true);
  };

  const openEdit = (flight) => {
    setEditing(flight);
    setModalPreset(null);
    setModalOpen(true);
  };

  const deleteFlight = async (flightId) => {
    if (!window.confirm("Delete this scheduled flight?")) {
      return;
    }

    await dbs.deleteDocument("flights", flightId);
    fetchSchedule();
  };

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Airline schedule"
        title="Build the flight network, assign capacity, and keep every sector visible."
        description="This schedule view takes the copied reference routes and turns them into a live operations board for your workspace, complete with templates, fare allocations, and route performance context."
        actions={
          <>
            <FlightButton variant="secondary" onClick={fetchSchedule}>
              <RefreshCw size={16} />
              Refresh schedule
            </FlightButton>
            <FlightButton onClick={openCreate}>
              <Plus size={16} />
              Add flight
            </FlightButton>
          </>
        }
        stats={[
          {
            label: "Scheduled sectors",
            value: flights.length,
            detail: "Every route in the flight workspace, regardless of current status.",
            icon: PlaneTakeoff,
            tone: "blue",
          },
          {
            label: "Departing today",
            value: todayFlights.length,
            detail: "Flights operating on today’s weekly schedule.",
            icon: CalendarRange,
            tone: "indigo",
          },
          {
            label: "Average load",
            value: `${averageLoad}%`,
            detail: "Booked-seat pressure estimated from current reservations.",
            icon: Activity,
            tone: "emerald",
          },
          {
            label: "Disrupted sectors",
            value: delayedFlights,
            detail: "Delayed or cancelled routes needing operator attention.",
            icon: Waves,
            tone: "amber",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <FlightPanel
            title="Reference route templates"
            description="These are pulled from the copied flight service reference so you can move faster when building the network."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {REFERENCE_ROUTE_TEMPLATES.map((template) => (
                <article
                  key={template.flightNumber}
                  className="rounded-[24px] border border-[#DCE8F4] bg-[#F8FBFF] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-serif text-2xl text-[#173453]">{template.flightNumber}</p>
                      <p className="mt-1 text-sm text-[#68839E]">{template.airlineName}</p>
                    </div>
                    <FlightBadge tone="blue">
                      {formatOperatingDays(template.daysOfWeek)}
                    </FlightBadge>
                  </div>
                  <p className="mt-4 text-base font-semibold text-[#173453]">
                    {formatRouteLabel(template.from, template.to)}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-[#5C7893] sm:grid-cols-2">
                    <span>{template.departTime} departure</span>
                    <span>{template.aircraftType}</span>
                    <span>{template.durationMin} min sector</span>
                    <span>{formatCurrency(template.economyPrice)} economy</span>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <FlightButton variant="secondary" onClick={() => openFromTemplate(template)}>
                      Use template
                    </FlightButton>
                  </div>
                </article>
              ))}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Scheduled flights"
            description="Search by flight number, airport, or aircraft, then jump into edits from each route card."
            action={
              <>
                <FlightSearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search flight, route, or aircraft"
                />
                <FlightSelect
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="min-w-[180px]"
                >
                  {statusFilters.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === "All" ? "All statuses" : filter}
                    </option>
                  ))}
                </FlightSelect>
              </>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#7191AF]">
                <RefreshCw className="animate-spin" />
              </div>
            ) : filteredFlights.length === 0 ? (
              <FlightEmptyState
                icon={PlaneTakeoff}
                title="No flights have been scheduled yet"
                description="Start with one of the copied route templates above or add your own sector manually. Pricing and manifest pages will wake up once routes exist here."
                action={<FlightButton onClick={openCreate}>Add first flight</FlightButton>}
              />
            ) : (
              <div className="grid gap-4">
                {filteredFlights.map((flight) => {
                  const statusMeta = getStatusMeta(FLIGHT_STATUSES, flight.status);
                  const loadFactor = getLoadFactor(flight, bookings);

                  return (
                    <article
                      key={flight.id}
                      className="rounded-[26px] border border-[#E2EBF5] bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-serif text-3xl text-[#173453]">{flight.flightNumber}</p>
                            <FlightBadge tone={statusMeta.tone}>{statusMeta.label}</FlightBadge>
                            <FlightBadge tone="slate">{flight.aircraftType}</FlightBadge>
                          </div>
                          <p className="mt-3 text-lg font-semibold text-[#173453]">
                            {formatRouteLabel(flight.from, flight.to)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#67819A]">
                            <span>{flight.departTime} departure</span>
                            <span>•</span>
                            <span>{flight.arriveTime} arrival</span>
                            <span>•</span>
                            <span>{flight.durationMin} min</span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {DAYS.map((day) => (
                              <FlightBadge
                                key={day.value}
                                tone={flight.daysOfWeek.includes(day.value) ? "blue" : "slate"}
                                className="px-3"
                              >
                                {day.label}
                              </FlightBadge>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:w-[420px]">
                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#69839D]">
                              Capacity
                            </p>
                            <p className="mt-2 font-serif text-2xl text-[#173453]">{flight.totalSeats}</p>
                            <p className="mt-1 text-xs text-[#68839E]">
                              E {flight.economySeats} · B {flight.businessSeats} · F {flight.firstSeats}
                            </p>
                          </div>

                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#69839D]">
                              Starting fares
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[#173453]">
                              Eco {formatCurrency(flight.economyPrice)}
                            </p>
                            <p className="mt-1 text-xs text-[#68839E]">
                              Biz {formatCurrency(flight.businessPrice)} · First {formatCurrency(flight.firstPrice)}
                            </p>
                          </div>

                          <div className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#69839D]">
                              Demand pulse
                            </p>
                            <p className="mt-2 font-serif text-2xl text-[#173453]">{loadFactor}%</p>
                            <div className="mt-3">
                              <ProgressBar
                                value={loadFactor}
                                tone={loadFactor > 70 ? "emerald" : loadFactor > 40 ? "blue" : "amber"}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end gap-3">
                        <FlightButton variant="ghost" onClick={() => openEdit(flight)}>
                          <Pencil size={14} />
                          Edit
                        </FlightButton>
                        <FlightButton variant="danger" onClick={() => deleteFlight(flight.id)}>
                          <Trash2 size={14} />
                          Delete
                        </FlightButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </FlightPanel>
        </div>

        <div className="space-y-6">
          <FlightPanel
            title="Route strength"
            description="Performance across your strongest corridors based on schedule and booking activity."
          >
            <div className="space-y-4">
              {routePerformance.length ? (
                routePerformance.map((route) => (
                  <article
                    key={route.id}
                    className="rounded-[22px] border border-[#E4EDF7] bg-[#F8FBFF] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#173453]">{route.routeLabel}</p>
                        <p className="mt-1 text-sm text-[#69839D]">
                          {route.sectors} scheduled sector{route.sectors === 1 ? "" : "s"}
                        </p>
                      </div>
                      <FlightBadge tone={route.averageLoad > 70 ? "emerald" : "blue"}>
                        {route.averageLoad}% load
                      </FlightBadge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[#4D6881] sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#69839D]">
                          Revenue
                        </p>
                        <p className="mt-1 font-semibold">{formatCurrency(route.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#69839D]">
                          Seats sold
                        </p>
                        <p className="mt-1 font-semibold">{route.soldSeats}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <FlightEmptyState
                  icon={Activity}
                  title="Route analytics will fill in here"
                  description="Once reservations start flowing, this panel will reveal which sectors are carrying the network."
                />
              )}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Weekly operating spread"
            description="A quick read on where your frequency is concentrated through the week."
          >
            <div className="space-y-4">
              {dayDistribution.map((day) => (
                <div key={day.value}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[#3D5B76]">
                    <span>{day.label}</span>
                    <span className="font-semibold">{day.count} routes</span>
                  </div>
                  <ProgressBar
                    value={
                      flights.length ? Math.round((day.count / Math.max(...dayDistribution.map((item) => item.count), 1)) * 100) : 0
                    }
                    tone="indigo"
                  />
                </div>
              ))}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Reference airports"
            description="Copied from the flight-service seed so your routing stays grounded in the repo data."
          >
            <div className="space-y-3">
              {REFERENCE_AIRPORTS.map((airport) => (
                <div
                  key={airport.code}
                  className="rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3"
                >
                  <p className="font-semibold text-[#173453]">
                    {airport.code} · {airport.city}
                  </p>
                  <p className="mt-1 text-sm text-[#69839D]">{airport.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#85A0BB]">
                    {airport.country}
                  </p>
                </div>
              ))}
            </div>
          </FlightPanel>
        </div>
      </div>

      <FlightScheduleModal
        open={modalOpen}
        existing={editing}
        preset={modalPreset}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          fetchSchedule();
        }}
      />
    </FlightWorkspacePage>
  );
}
