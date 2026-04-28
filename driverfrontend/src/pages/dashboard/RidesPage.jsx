import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  RefreshCcw,
  Route,
  UserRound,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";
import { formatCurrency, formatDateTime, formatDistance } from "../../lib/format";

const statusCopy = {
  pending: "Waiting for driver",
  requested: "Requested",
  accepted: "Accepted",
  completed: "Completed",
  paid: "Accepted",
};

const RideCard = ({ ride, isDark, acceptingRideId, onAccept }) => {
  const isPending = ride.status === "pending" || ride.status === "requested";
  const accepting = acceptingRideId === ride.id;

  return (
    <article className={`rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              isPending
                ? isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700"
                : isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
            }`}>
              {isPending ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}
              {statusCopy[ride.status] || ride.status}
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
              {ride.tier_label || "Tier"} - {formatCurrency(ride.tier_fare)}/km
            </span>
            {ride.trip_distance_km ? (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                Trip {ride.trip_distance_km} km
              </span>
            ) : null}
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
              Paid
            </span>
            {ride.distance_km ? (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                {formatDistance(ride.distance_km)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {ride.customer_name || "Customer"}
              </h2>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {ride.customer_phone ? (
                  <a href={`tel:${ride.customer_phone}`} className={isDark ? "text-amber-300 hover:underline" : "text-amber-700 hover:underline"}>
                    {ride.customer_phone}
                  </a>
                ) : (
                  <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Phone not shared</span>
                )}
                <span className={isDark ? "text-zinc-600" : "text-slate-400"}>{formatDateTime(ride.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              <p className={`text-sm ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>Pickup:</span> {ride.pickup_label}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Route size={15} className={`mt-0.5 shrink-0 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
              <p className={`text-sm ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>Drop:</span> {ride.drop_label}
              </p>
            </div>
          </div>

          {ride.notes ? (
            <p className={`mt-4 rounded-xl px-4 py-3 text-xs ${isDark ? "bg-zinc-800/70 text-zinc-400" : "bg-slate-50 text-slate-500"}`}>
              {ride.notes}
            </p>
          ) : null}
        </div>

        <div className={`rounded-2xl p-4 lg:w-56 ${isDark ? "bg-zinc-950" : "bg-slate-50"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
            Fare
          </p>
          <p className={`mt-1 text-3xl font-bold ${isDark ? "text-[#facc15]" : "text-amber-600"}`}>
            {formatCurrency(ride.estimated_fare || ride.tier_fare)}
          </p>
          <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            {ride.passengers || 1} passenger{ride.passengers === 1 ? "" : "s"}
          </p>

          <div className="mt-4 grid gap-2">
            {isPending ? (
              <button
                type="button"
                onClick={() => onAccept(ride.id)}
                disabled={accepting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-[#eab308] disabled:opacity-60"
              >
                {accepting ? <RefreshCcw size={15} className="animate-spin" /> : <Zap size={15} />}
                {accepting ? "Accepting" : "Accept ride"}
              </button>
            ) : null}

            {ride.customer_phone ? (
              <a
                href={`tel:${ride.customer_phone}`}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
                  isDark ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                <Phone size={15} />
                Call customer
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

const RidesPage = () => {
  const { rideRequests, loading, theme, setupStatus, acceptingRideId, acceptRideRequest } = useDashboard();
  const isDark = theme === "dark";
  const pendingCount = rideRequests.filter((ride) => ride.status === "pending" || ride.status === "requested").length;
  const requestsLocked = !setupStatus.canSetLocation || !setupStatus.locationReady;
  const gateTarget = !setupStatus.profileReady
    ? "/dashboard/profile"
    : !setupStatus.vehicleReady
      ? "/dashboard/vehicle"
      : "/dashboard/location";

  return (
    <div className="space-y-8 fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Requests</p>
          <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Ride Requests</h1>
          <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            Only requests near your saved service location will come here.
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"}`}>
          {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
        </div>
      </div>

      {requestsLocked ? (
        <div className={`rounded-2xl border p-5 ${isDark ? "border-amber-400/25 bg-amber-400/10" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-amber-300" : "text-amber-700"}`} />
              <div>
                <p className={`text-sm font-bold ${isDark ? "text-amber-100" : "text-amber-900"}`}>
                  {setupStatus.canSetLocation ? "Set location to receive requests" : "Finish setup to receive requests"}
                </p>
                <p className={`mt-1 text-sm ${isDark ? "text-amber-100/70" : "text-amber-800"}`}>
                  Paid cab requests will appear here only after My Profile, My Vehicle, and your service location are saved.
                </p>
              </div>
            </div>
            <Link to={gateTarget} className={`w-fit rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-zinc-950 text-amber-200" : "bg-white text-amber-800 shadow-sm"}`}>
              {setupStatus.canSetLocation ? "Set Location" : "Complete Setup"}
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
          <RefreshCcw size={20} className="mr-2 animate-spin" />
          Loading ride requests...
        </div>
      ) : rideRequests.length === 0 ? (
        <div className={`rounded-2xl border p-16 text-center ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
          <Zap size={32} className={`mx-auto mb-4 ${isDark ? "text-zinc-600" : "text-slate-300"}`} />
          <p className={`text-base font-semibold ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
            {requestsLocked ? "Requests unlock after setup" : "No ride requests right now"}
          </p>
          <p className={`mt-1 text-sm ${isDark ? "text-zinc-600" : "text-slate-400"}`}>
            {requestsLocked
              ? "Only after your service location is saved will nearby paid requests come here."
              : "Nearby paid requests will show here when customers book cabs around your location."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rideRequests.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              isDark={isDark}
              acceptingRideId={acceptingRideId}
              onAccept={acceptRideRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RidesPage;
