import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import dbs from "../api/db";
import {
  buildPassengerManifest,
  formatCurrency,
  formatDateLabel,
  getInitials,
  normalizeBookingRecord,
  normalizeFlightRecord,
} from "../lib/workspace";
import {
  FlightBadge,
  FlightEmptyState,
  FlightHero,
  FlightPanel,
  FlightSearchField,
  FlightWorkspacePage,
  ProgressBar,
} from "../components/WorkspaceChrome";

const passengerSegments = ["All", "Standard", "Frequent", "Elite"];

export default function FlightCustomers() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("All");

  const fetchPassengers = async () => {
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

      setPassengers(buildPassengerManifest(normalizedBookings));
    } catch {
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, []);

  const filteredPassengers = passengers.filter((passenger) => {
    const value = search.toLowerCase();
    const matchesSearch =
      passenger.name.toLowerCase().includes(value) ||
      passenger.phone.toLowerCase().includes(value) ||
      passenger.email.toLowerCase().includes(value) ||
      passenger.latestPnr.toLowerCase().includes(value);

    const matchesSegment = segment === "All" || passenger.segment === segment;
    return matchesSearch && matchesSegment;
  });

  const frequentFlyers = passengers.filter((passenger) => passenger.segment !== "Standard");
  const contactCoverage = passengers.length
    ? Math.round(
        (passengers.filter((passenger) => passenger.phone || passenger.email).length /
          passengers.length) *
          100
      )
    : 0;
  const eliteCount = passengers.filter((passenger) => passenger.segment === "Elite").length;
  const topTraveler = passengers[0];

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Passenger manifest"
        title="Track traveler relationships, contact readiness, and repeat flyers from one board."
        description="This manifest page turns booking history into a real passenger layer for the airline workspace, so frequent travelers, contact gaps, and recent bookings are visible without leaving the dashboard."
        stats={[
          {
            label: "Unique passengers",
            value: passengers.length,
            detail: "Distinct travelers currently known to the flight workspace.",
            icon: Users,
            tone: "blue",
          },
          {
            label: "Frequent flyers",
            value: frequentFlyers.length,
            detail: "Passengers with repeat activity worth special handling or retention.",
            icon: Star,
            tone: "amber",
          },
          {
            label: "Contact coverage",
            value: `${contactCoverage}%`,
            detail: "Passengers with at least one support-ready phone or email channel.",
            icon: ShieldCheck,
            tone: "emerald",
          },
          {
            label: "Elite travelers",
            value: eliteCount,
            detail: "Passengers crossing the highest repeat-flyer threshold right now.",
            icon: BadgeCheck,
            tone: "indigo",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <FlightPanel
          title="Passenger directory"
          description="Search by name, contact, or latest PNR, then use segment filters to focus on the travelers who need attention."
          action={
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <FlightSearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search passenger, contact, or PNR"
              />
              <div className="flex flex-wrap gap-2">
                {passengerSegments.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSegment(option)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      option === segment
                        ? "border-[#6EAEFD] bg-[#037FFC] text-white"
                        : "border-[#D3E2F0] bg-white text-[#3E5A74]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#7191AF]">
              <RefreshCw className="animate-spin" />
            </div>
          ) : filteredPassengers.length === 0 ? (
            <FlightEmptyState
              icon={Users}
              title="No passengers to show yet"
              description="Passenger records are created from bookings. Once reservations land, the manifest will group travelers automatically."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredPassengers.map((passenger) => (
                <article
                  key={passenger.id}
                  className="rounded-[24px] border border-[#E3ECF6] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF5FF] text-lg font-semibold text-[#0E5EB9]">
                      {getInitials(passenger.name)}
                    </div>
                    <FlightBadge
                      tone={
                        passenger.segment === "Elite"
                          ? "amber"
                          : passenger.segment === "Frequent"
                            ? "indigo"
                            : "slate"
                      }
                    >
                      {passenger.segment}
                    </FlightBadge>
                  </div>

                  <h3 className="mt-4 font-serif text-2xl text-[#173453]">{passenger.name}</h3>

                  <div className="mt-4 space-y-2 text-sm text-[#5C7893]">
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      <span>{passenger.phone || "Phone not captured"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      <span>{passenger.email || "Email not captured"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket size={14} />
                      <span>
                        {passenger.totalFlights} flight{passenger.totalFlights === 1 ? "" : "s"} ·{" "}
                        {formatCurrency(passenger.totalRevenue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-[#E7EEF7] bg-[#F8FBFF] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#69839D]">
                      Latest booking
                    </p>
                    <p className="mt-2 font-semibold text-[#173453]">
                      {passenger.latestPnr} · {passenger.latestFlight || "Flight pending"}
                    </p>
                    <p className="mt-1 text-sm text-[#69839D]">
                      {formatDateLabel(passenger.latestDate)}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(passenger.segments || []).map((currentSegment) => (
                      <FlightBadge key={currentSegment} tone="blue">
                        {currentSegment}
                      </FlightBadge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </FlightPanel>

        <div className="space-y-6">
          <FlightPanel
            title="Frequent flyer lane"
            description="Passengers worth proactive boarding, support, or loyalty attention."
          >
            <div className="space-y-4">
              {frequentFlyers.length ? (
                frequentFlyers.slice(0, 5).map((passenger) => (
                  <article
                    key={passenger.id}
                    className="rounded-[22px] border border-[#E4EDF7] bg-[#F8FBFF] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#173453]">{passenger.name}</p>
                        <p className="mt-1 text-sm text-[#69839D]">
                          {passenger.totalFlights} trips · {formatCurrency(passenger.totalRevenue)}
                        </p>
                      </div>
                      <FlightBadge
                        tone={passenger.segment === "Elite" ? "amber" : "indigo"}
                      >
                        {passenger.segment}
                      </FlightBadge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-[#3D5B76]">
                        <span>Loyalty strength</span>
                        <span className="font-semibold">
                          {Math.min(passenger.totalFlights * 20, 100)}%
                        </span>
                      </div>
                      <ProgressBar
                        value={Math.min(passenger.totalFlights * 20, 100)}
                        tone={passenger.segment === "Elite" ? "amber" : "indigo"}
                      />
                    </div>
                  </article>
                ))
              ) : (
                <FlightEmptyState
                  icon={Star}
                  title="Repeat flyers will appear here"
                  description="Once the same traveler books multiple times, they’ll graduate into this lane automatically."
                />
              )}
            </div>
          </FlightPanel>

          <FlightPanel
            title="Manifest pulse"
            description="A quick summary of the strongest traveler relationship currently on file."
          >
            {topTraveler ? (
              <div className="rounded-[24px] border border-[#E4EDF7] bg-[#F8FBFF] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#69839D]">
                  Top traveler
                </p>
                <h3 className="mt-3 font-serif text-3xl text-[#173453]">{topTraveler.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#617D97]">
                  {topTraveler.totalFlights} trips tracked with {formatCurrency(topTraveler.totalRevenue)} in captured booking value.
                </p>
                <div className="mt-5 grid gap-3 text-sm text-[#47657F]">
                  <div className="rounded-[18px] border border-[#E4EDF7] bg-white px-4 py-3">
                    Latest PNR: {topTraveler.latestPnr}
                  </div>
                  <div className="rounded-[18px] border border-[#E4EDF7] bg-white px-4 py-3">
                    Latest flight: {topTraveler.latestFlight || "Pending assignment"}
                  </div>
                </div>
              </div>
            ) : (
              <FlightEmptyState
                icon={ShieldCheck}
                title="Manifest overview is waiting on bookings"
                description="The first saved reservations will start filling this summary area automatically."
              />
            )}
          </FlightPanel>
        </div>
      </div>
    </FlightWorkspacePage>
  );
}
