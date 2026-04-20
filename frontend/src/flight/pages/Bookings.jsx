import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Mail,
  Pencil,
  Phone,
  PlaneTakeoff,
  Plus,
  RefreshCw,
  Ticket,
  Trash2,
  WalletCards,
} from "lucide-react";
import dbs from "../api/db";
import {
  BOOKING_STATUSES,
  REFERENCE_ROUTE_TEMPLATES,
  buildRoutePerformance,
  buildStatusBreakdown,
  createBookingDraft,
  formatCurrency,
  formatDateLabel,
  formatRouteLabel,
  formatAirportLabel,
  getStatusMeta,
  normalizeBookingRecord,
  normalizeFlightRecord,
  toDateInputValue,
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

const BOOKING_FILTERS = ["All", ...BOOKING_STATUSES.map((status) => status.value)];

const bookingClassOptions = ["Economy", "Business", "First"];

const REFERENCE_FLIGHT_OPTIONS = REFERENCE_ROUTE_TEMPLATES.map((flight, index) =>
  normalizeFlightRecord(flight, index)
);

const getFlightOptions = (flights) =>
  flights.length ? flights : REFERENCE_FLIGHT_OPTIONS;

const findFlightByNumber = (flights, flightNumber) =>
  flights.find((flight) => flight.flightNumber === flightNumber);

function BookingModal({ open, existing, flights, onClose, onSaved }) {
  const flightOptions = getFlightOptions(flights);
  const [form, setForm] = useState(createBookingDraft(flightOptions));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const base = existing
      ? {
          ...existing,
        }
      : createBookingDraft(flightOptions);

    const matchedFlight = findFlightByNumber(flightOptions, base.flightNumber) || flightOptions[0];

    setForm({
      ...base,
      flightNumber: base.flightNumber || matchedFlight?.flightNumber || "",
      date: base.date || toDateInputValue(),
      amount: base.amount || matchedFlight?.economyPrice || 0,
    });
    setError("");
  }, [existing, flightOptions, open]);

  useEffect(() => {
    const linkedFlight = findFlightByNumber(flightOptions, form.flightNumber);
    if (!linkedFlight) return;
    const nextAmount =
      linkedFlight[
        form.class === "Business"
          ? "businessPrice"
          : form.class === "First"
            ? "firstPrice"
            : "economyPrice"
      ] * Number(form.travellers || 1);

    setForm((current) => {
      if (current.amount && existing) {
        return current;
      }

      if (Number(current.amount || 0) === nextAmount) {
        return current;
      }

      return {
        ...current,
        amount: nextAmount,
      };
    });
  }, [existing, flightOptions, form.class, form.flightNumber, form.travellers]);

  const linkedFlight = findFlightByNumber(flightOptions, form.flightNumber);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.passengerName.trim()) {
      setError("Passenger name is required.");
      return;
    }

    if (!form.flightNumber) {
      setError("Choose a scheduled flight first.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        travellers: Number(form.travellers) || 1,
        amount: Number(form.amount) || 0,
      };

      if (existing?.id) {
        await dbs.editDocument("bookings", existing.id, payload);
      } else {
        await dbs.addAutoIdDocument("bookings", payload);
      }
      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "The reservation could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlightModal
      open={open}
      onClose={onClose}
      title={existing ? "Edit reservation" : "Create reservation"}
      description="Manage PNRs, cabin class, contact info, and boarding state from the same desk."
      icon={Ticket}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6C8299]">
            {linkedFlight
              ? `${linkedFlight.flightNumber} on ${formatRouteLabel(linkedFlight.from, linkedFlight.to)}`
              : "Route details appear once you choose a flight."}
          </p>
          <div className="flex gap-3">
            <FlightButton variant="secondary" onClick={onClose}>
              Cancel
            </FlightButton>
            <FlightButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : existing ? "Save changes" : "Confirm booking"}
            </FlightButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <FlightField label="PNR">
          <FlightInput value={form.pnr} readOnly />
        </FlightField>

        <FlightField label="Flight" required>
          <FlightSelect
            value={form.flightNumber}
            onChange={(event) => updateField("flightNumber", event.target.value)}
          >
            <option value="">Select a route</option>
            {flightOptions.map((flight) => (
              <option key={flight.flightNumber} value={flight.flightNumber}>
                {flight.flightNumber} · {formatRouteLabel(flight.from, flight.to)}
              </option>
            ))}
          </FlightSelect>
        </FlightField>

        <FlightField label="Passenger name" required>
          <FlightInput
            value={form.passengerName}
            onChange={(event) => updateField("passengerName", event.target.value)}
            placeholder="Passenger full name"
          />
        </FlightField>

        <FlightField label="Travel date" required>
          <FlightInput
            type="date"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
          />
        </FlightField>

        <FlightField label="Phone">
          <FlightInput
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+91"
          />
        </FlightField>

        <FlightField label="Email">
          <FlightInput
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="traveler@example.com"
          />
        </FlightField>

        <FlightField label="Cabin class">
          <FlightSelect
            value={form.class}
            onChange={(event) => updateField("class", event.target.value)}
          >
            {bookingClassOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FlightSelect>
        </FlightField>

        <FlightField label="Passengers">
          <FlightInput
            type="number"
            min="1"
            value={form.travellers}
            onChange={(event) => updateField("travellers", event.target.value)}
          />
        </FlightField>

        <FlightField label="Reservation status">
          <FlightSelect
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
          >
            {BOOKING_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FlightSelect>
        </FlightField>

        <FlightField label="Collection amount">
          <FlightInput
            type="number"
            min="0"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
          />
        </FlightField>

        <FlightField label="Seat number">
          <FlightInput
            value={form.seatNumber}
            onChange={(event) => updateField("seatNumber", event.target.value)}
            placeholder="14A"
          />
        </FlightField>

        <div className="rounded-[24px] border border-[#D8E5F2] bg-[#F7FBFF] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <FlightBadge tone="blue">Travel brief</FlightBadge>
            {linkedFlight ? (
              <FlightBadge tone="emerald">{linkedFlight.aircraftType}</FlightBadge>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6D85A0]">
                Route
              </p>
              <p className="mt-2 font-serif text-2xl text-[#163353]">
                {linkedFlight ? formatRouteLabel(linkedFlight.from, linkedFlight.to) : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6D85A0]">
                Flight window
              </p>
              <p className="mt-2 text-lg font-semibold text-[#163353]">
                {linkedFlight ? `${linkedFlight.departTime} - ${linkedFlight.arriveTime}` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6D85A0]">
                Fare estimate
              </p>
              <p className="mt-2 text-lg font-semibold text-[#163353]">
                {formatCurrency(form.amount)}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#F3CDD7] bg-[#FFF2F5] px-4 py-3 text-sm text-[#B33863] lg:col-span-2">
            {error}
          </div>
        ) : null}
      </div>
    </FlightModal>
  );
}

export default function FlightBookings() {
  const [bookings, setBookings] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const [bookingResponse, flightResponse] = await Promise.all([
        dbs.readCollection("bookings", 500),
        dbs.readCollection("flights", 300),
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
    fetchBoard();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.passengerName.toLowerCase().includes(search.toLowerCase()) ||
      booking.pnr.toLowerCase().includes(search.toLowerCase()) ||
      booking.flightNumber.toLowerCase().includes(search.toLowerCase()) ||
      booking.phone.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBreakdown = buildStatusBreakdown(bookings, BOOKING_STATUSES);
  const routePerformance = buildRoutePerformance(flights, bookings).slice(0, 4);
  const todayLabel = toDateInputValue();
  const todayBookings = bookings.filter(
    (booking) => booking.date === todayLabel && booking.status !== "Cancelled"
  );
  const activeBookings = bookings.filter((booking) => booking.status !== "Cancelled");
  const checkedInCount = bookings.filter((booking) =>
    ["Checked-In", "Boarded"].includes(booking.status)
  ).length;
  const projectedCollection = activeBookings.reduce(
    (total, booking) => total + Number(booking.amount || 0),
    0
  );

  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (booking) => {
    setEditing(booking);
    setModalOpen(true);
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm("Delete this reservation from the front desk?")) {
      return;
    }

    await dbs.deleteDocument("bookings", bookingId);
    fetchBoard();
  };

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Flight front desk"
        title="Keep reservations, PNRs, and check-in activity moving from one desk."
        description="This board turns the copied flight reference into an owner-ready operations screen with live PNR management, route context, and passenger contact visibility."
        actions={
          <>
            <FlightButton variant="secondary" onClick={fetchBoard}>
              <RefreshCw size={16} />
              Refresh board
            </FlightButton>
            <FlightButton onClick={openCreateModal}>
              <Plus size={16} />
              New reservation
            </FlightButton>
          </>
        }
        stats={[
          {
            label: "Active PNRs",
            value: activeBookings.length,
            detail: "Confirmed, checked-in, and boarded reservations currently tracked.",
            icon: Ticket,
            tone: "blue",
          },
          {
            label: "Desk-ready today",
            value: todayBookings.length,
            detail: `${formatDateLabel(todayLabel, {
              day: "numeric",
              month: "short",
            })} departures still visible on the board.`,
            icon: CalendarDays,
            tone: "indigo",
          },
          {
            label: "Clearance progress",
            value: checkedInCount,
            detail: "Passengers who have already checked in or boarded.",
            icon: ClipboardList,
            tone: "emerald",
          },
          {
            label: "Projected collection",
            value: formatCurrency(projectedCollection),
            detail: "Captured booking value across all non-cancelled reservations.",
            icon: WalletCards,
            tone: "amber",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
        <FlightPanel
          title="Reservations board"
          description="Search by passenger, PNR, or flight number, then jump straight into edits from the same desk."
          action={
            <>
              <FlightSearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search passenger, phone, PNR, or flight"
                className="min-w-[260px]"
              />
              <FlightSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-w-[180px]"
              >
                {BOOKING_FILTERS.map((filter) => (
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
          ) : filteredBookings.length === 0 ? (
            <FlightEmptyState
              icon={Ticket}
              title="No reservations on the desk yet"
              description="Once bookings land in the flight workspace, this board will group them by PNR, cabin, and travel date. You can already start with a manual reservation."
              action={<FlightButton onClick={openCreateModal}>Create first reservation</FlightButton>}
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-[#E1EBF5]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E7EEF7]">
                  <thead className="bg-[#F6FBFF]">
                    <tr className="text-left text-[11px] uppercase tracking-[0.24em] text-[#6A839D]">
                      <th className="px-5 py-4">Passenger</th>
                      <th className="px-5 py-4">Journey</th>
                      <th className="px-5 py-4">Fare</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF3F9] bg-white">
                    {filteredBookings.map((booking) => {
                      const statusMeta = getStatusMeta(BOOKING_STATUSES, booking.status);
                      const linkedFlight = findFlightByNumber(getFlightOptions(flights), booking.flightNumber);

                      return (
                        <tr key={booking.id} className="align-top">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF5FF] text-sm font-semibold text-[#0E5EB9]">
                                {booking.passengerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-[#173453]">{booking.passengerName}</p>
                                <p className="mt-1 text-xs font-medium text-[#6D859E]">{booking.pnr}</p>
                                <div className="mt-2 space-y-1 text-xs text-[#728AA2]">
                                  {booking.phone ? (
                                    <div className="flex items-center gap-2">
                                      <Phone size={12} />
                                      <span>{booking.phone}</span>
                                    </div>
                                  ) : null}
                                  {booking.email ? (
                                    <div className="flex items-center gap-2">
                                      <Mail size={12} />
                                      <span>{booking.email}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#173453]">
                              {booking.flightNumber || "Route pending"}
                            </p>
                            <p className="mt-1 text-sm text-[#55708B]">
                              {linkedFlight
                                ? formatRouteLabel(linkedFlight.from, linkedFlight.to)
                                : booking.routeLabel || "Awaiting route assignment"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#68839E]">
                              <FlightBadge tone="slate">{formatDateLabel(booking.date)}</FlightBadge>
                              <FlightBadge tone="slate">{booking.class}</FlightBadge>
                              <FlightBadge tone="slate">
                                {booking.travellers} passenger{booking.travellers > 1 ? "s" : ""}
                              </FlightBadge>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-serif text-2xl text-[#173453]">
                              {formatCurrency(booking.amount)}
                            </p>
                            <p className="mt-1 text-xs text-[#6D859E]">
                              {booking.seatNumber ? `Seat ${booking.seatNumber}` : "Seat assignment open"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <FlightBadge tone={statusMeta.tone}>{statusMeta.label}</FlightBadge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <FlightButton
                                variant="ghost"
                                className="px-3 py-2"
                                onClick={() => openEditModal(booking)}
                              >
                                <Pencil size={14} />
                              </FlightButton>
                              <FlightButton
                                variant="danger"
                                className="px-3 py-2"
                                onClick={() => deleteBooking(booking.id)}
                              >
                                <Trash2 size={14} />
                              </FlightButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FlightPanel>

        <div className="space-y-6">
          <FlightPanel
            title="Desk signals"
            description="Quick visibility into boarding progress, route strength, and reference availability."
          >
            <div className="space-y-5">
              {statusBreakdown.map((status) => (
                <div key={status.value}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[#38556F]">
                    <span>{status.label}</span>
                    <span className="font-semibold">{status.count}</span>
                  </div>
                  <ProgressBar
                    value={bookings.length ? Math.round((status.count / bookings.length) * 100) : 0}
                    tone={status.tone}
                  />
                </div>
              ))}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Strongest routes"
            description="Revenue and sold-seat visibility derived from your current bookings and scheduled flights."
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
                        <p className="font-serif text-xl text-[#173453]">{route.routeLabel}</p>
                        <p className="mt-1 text-sm text-[#67819A]">
                          {route.soldSeats} sold seats across {route.sectors} scheduled flight
                          {route.sectors === 1 ? "" : "s"}
                        </p>
                      </div>
                      <FlightBadge tone={route.averageLoad > 70 ? "emerald" : "blue"}>
                        {route.averageLoad}% load
                      </FlightBadge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[#38556F] sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#6D859E]">
                          Revenue
                        </p>
                        <p className="mt-1 font-semibold">{formatCurrency(route.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#6D859E]">
                          Average fare
                        </p>
                        <p className="mt-1 font-semibold">{formatCurrency(route.averageFare)}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <FlightEmptyState
                  icon={PlaneTakeoff}
                  title="Route insights will appear here"
                  description="As soon as flights and bookings are stored together, this panel will start highlighting your strongest corridors."
                />
              )}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Reference routes copied"
            description="The sidebar pages now use the same copied aviation context that you placed in the repo."
          >
            <div className="space-y-3">
              {REFERENCE_ROUTE_TEMPLATES.map((route) => (
                <div
                  key={route.flightNumber}
                  className="flex items-center justify-between rounded-[20px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[#173453]">{route.flightNumber}</p>
                    <p className="text-sm text-[#67819A]">
                      {formatRouteLabel(formatAirportLabel(route.from), formatAirportLabel(route.to))}
                    </p>
                  </div>
                  <FlightBadge tone="blue">{route.airlineName}</FlightBadge>
                </div>
              ))}
            </div>
          </FlightPanel>
        </div>
      </div>

      <BookingModal
        open={modalOpen}
        existing={editing}
        flights={flights}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          fetchBoard();
        }}
      />
    </FlightWorkspacePage>
  );
}
