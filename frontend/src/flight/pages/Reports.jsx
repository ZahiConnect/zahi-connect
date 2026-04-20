import { useEffect, useState } from "react";
import {
  ChartColumn,
  ClipboardCheck,
  RefreshCw,
  Route,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import dbs from "../api/db";
import {
  BOOKING_STATUSES,
  buildClassMix,
  buildDayDistribution,
  buildRoutePerformance,
  buildStatusBreakdown,
  formatCompactNumber,
  formatCurrency,
  normalizeBookingRecord,
  normalizeFlightRecord,
} from "../lib/workspace";
import {
  FlightBadge,
  FlightEmptyState,
  FlightHero,
  FlightPanel,
  FlightWorkspacePage,
  ProgressBar,
} from "../components/WorkspaceChrome";

export default function FlightReports() {
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
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
    fetchReports();
  }, []);

  const routePerformance = buildRoutePerformance(flights, bookings);
  const statusBreakdown = buildStatusBreakdown(bookings, BOOKING_STATUSES);
  const classMix = buildClassMix(bookings);
  const dayDistribution = buildDayDistribution(flights);

  const activeRevenue = bookings
    .filter((booking) => booking.status !== "Cancelled")
    .reduce((total, booking) => total + Number(booking.amount || 0), 0);
  const soldSeats = bookings
    .filter((booking) => booking.status !== "Cancelled")
    .reduce((total, booking) => total + Number(booking.travellers || 1), 0);
  const availableSeats = flights.reduce((total, flight) => total + Number(flight.totalSeats || 0), 0);
  const averageLoad = availableSeats ? Math.round((soldSeats / availableSeats) * 100) : 0;
  const cancellationRate = bookings.length
    ? Math.round(
        (bookings.filter((booking) => booking.status === "Cancelled").length / bookings.length) *
          100
      )
    : 0;
  const topRoute = routePerformance[0];
  const busiestDay = [...dayDistribution].sort((left, right) => right.count - left.count)[0];

  return (
    <FlightWorkspacePage>
      <FlightHero
        eyebrow="Flight reports"
        title="See revenue, route strength, cabin mix, and schedule spread in one reporting layer."
        description="The generic report shell has been replaced with a real aviation dashboard so the flight workspace now has its own reporting surface instead of a placeholder."
        actions={
          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex items-center gap-2 rounded-full border border-[#C5DAF3] bg-white px-4 py-2.5 text-sm font-semibold text-[#123D67] transition hover:bg-[#F5FAFF]"
          >
            <RefreshCw size={16} />
            Refresh reports
          </button>
        }
        stats={[
          {
            label: "Captured revenue",
            value: formatCurrency(activeRevenue),
            detail: "Non-cancelled booking value visible to the current flight tenant.",
            icon: WalletCards,
            tone: "blue",
          },
          {
            label: "Seat load",
            value: `${averageLoad}%`,
            detail: `${formatCompactNumber(soldSeats)} sold seats across ${formatCompactNumber(
              availableSeats
            )} scheduled seats.`,
            icon: TrendingUp,
            tone: "emerald",
          },
          {
            label: "Route count",
            value: routePerformance.length,
            detail: "Distinct corridors currently represented in the schedule.",
            icon: Route,
            tone: "indigo",
          },
          {
            label: "Cancellation rate",
            value: `${cancellationRate}%`,
            detail: "Reservation share that has moved into the cancelled state.",
            icon: ClipboardCheck,
            tone: "amber",
          },
        ]}
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-[#7191AF]">
          <RefreshCw className="animate-spin" />
        </div>
      ) : flights.length === 0 && bookings.length === 0 ? (
        <FlightEmptyState
          icon={ChartColumn}
          title="Reports will appear once the flight workspace has data"
          description="Schedule routes and add bookings first. This reporting page will then summarize revenue, route demand, and operating patterns."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <FlightPanel
              title="Booking status composition"
              description="How the live reservation book is split across the major operational states."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {statusBreakdown.map((status) => (
                  <article
                    key={status.value}
                    className="rounded-[24px] border border-[#E4EDF7] bg-[#F8FBFF] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#173453]">{status.label}</p>
                      <FlightBadge tone={status.tone}>{status.count}</FlightBadge>
                    </div>
                    <div className="mt-4">
                      <ProgressBar
                        value={bookings.length ? Math.round((status.count / bookings.length) * 100) : 0}
                        tone={status.tone}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </FlightPanel>

            <FlightPanel
              title="Top routes by revenue"
              description="The corridors generating the strongest booking value and seat movement so far."
            >
              <div className="space-y-4">
                {routePerformance.slice(0, 5).map((route) => (
                  <article
                    key={route.id}
                    className="rounded-[24px] border border-[#E4EDF7] bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-2xl text-[#173453]">{route.routeLabel}</p>
                        <p className="mt-1 text-sm text-[#69839D]">
                          {route.soldSeats} sold seats · {route.sectors} sectors scheduled
                        </p>
                      </div>
                      <FlightBadge tone={route.averageLoad > 70 ? "emerald" : "blue"}>
                        {route.averageLoad}% load
                      </FlightBadge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[#47657F] md:grid-cols-3">
                      <div className="rounded-[18px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3">
                        Revenue: {formatCurrency(route.revenue)}
                      </div>
                      <div className="rounded-[18px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3">
                        Avg fare: {formatCurrency(route.averageFare)}
                      </div>
                      <div className="rounded-[18px] border border-[#E4EDF7] bg-[#F8FBFF] px-4 py-3">
                        Active sectors: {route.activeFlights}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </FlightPanel>
          </div>

          <div className="space-y-6">
            <FlightPanel
              title="Cabin mix"
              description="Passenger distribution across the cabin ladder."
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
              title="Weekly spread"
              description="Which days currently carry the heaviest route footprint."
            >
              <div className="space-y-4">
                {dayDistribution.map((day) => (
                  <div key={day.value}>
                    <div className="mb-2 flex items-center justify-between text-sm text-[#38556F]">
                      <span>{day.label}</span>
                      <span className="font-semibold">{day.count} routes</span>
                    </div>
                    <ProgressBar
                      value={
                        flights.length
                          ? Math.round(
                              (day.count / Math.max(...dayDistribution.map((item) => item.count), 1)) *
                                100
                            )
                          : 0
                      }
                      tone="indigo"
                    />
                  </div>
                ))}
              </div>
            </FlightPanel>

            <FlightPanel
              title="Report highlights"
              description="A quick owner summary pulled from the current schedule and booking book."
            >
              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#69839D]">
                    Top route
                  </p>
                  <p className="mt-2 font-serif text-2xl text-[#173453]">
                    {topRoute?.routeLabel || "Awaiting data"}
                  </p>
                  <p className="mt-2 text-sm text-[#617D97]">
                    {topRoute
                      ? `${formatCurrency(topRoute.revenue)} from ${topRoute.soldSeats} sold seats.`
                      : "Once bookings come in, this card will highlight the best-performing corridor."}
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#E4EDF7] bg-[#F8FBFF] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#69839D]">
                    Busiest operating day
                  </p>
                  <p className="mt-2 font-serif text-2xl text-[#173453]">
                    {busiestDay?.label || "Awaiting schedule"}
                  </p>
                  <p className="mt-2 text-sm text-[#617D97]">
                    {busiestDay
                      ? `${busiestDay.count} routes currently run on this day.`
                      : "Schedule data will surface the busiest day automatically."}
                  </p>
                </div>
              </div>
            </FlightPanel>
          </div>
        </div>
      )}
    </FlightWorkspacePage>
  );
}
