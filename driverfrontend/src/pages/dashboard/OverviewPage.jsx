import { CarFront, MapPin, RefreshCcw, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { formatCurrency, formatDateTime } from "../../lib/format";

const StatCard = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const OverviewPage = () => {
  const { driver, dashboard, rideRequests, loading, toggleOnline, switchingOnline, locationLabel, locStatus } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw size={28} className="text-zinc-500 animate-spin" />
          <p className="text-sm text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats ?? {};
  const recent = dashboard?.recent_paid_customers ?? [];

  return (
    <div className="space-y-8 fade-up">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            Welcome back, {driver?.full_name?.split(" ")[0] || "Driver"} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {driver?.is_online ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                You are online
                {locationLabel && ` · ${locationLabel}`}
              </span>
            ) : (
              <span className="text-zinc-500">You are currently offline. Go online to receive ride requests.</span>
            )}
          </p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={switchingOnline}
          className={`mt-3 sm:mt-0 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
            driver?.is_online
              ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              : "bg-[#facc15] text-[#09090b] hover:bg-[#eab308]"
          }`}
        >
          {switchingOnline ? <RefreshCcw size={15} className="animate-spin" /> : <Zap size={15} />}
          {driver?.is_online ? "Go Offline" : "Go Online"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Rides"
          value={stats.paid_customers ?? 0}
          sub="Completed trips"
          icon={Users}
          accent="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label="Total Earnings"
          value={formatCurrency(stats.total_fare ?? 0)}
          sub="Gross fare"
          icon={Wallet}
          accent="bg-[#facc15]/15 text-[#facc15]"
        />
        <StatCard
          label="Commission Paid"
          value={formatCurrency(stats.total_commission ?? 0)}
          sub={`@${Math.round((stats.commission_rate ?? 0.12) * 100)}% platform fee`}
          icon={TrendingUp}
          accent="bg-rose-500/15 text-rose-400"
        />
        <StatCard
          label="Net Earned"
          value={formatCurrency((stats.total_fare ?? 0) - (stats.total_commission ?? 0))}
          sub="After commission"
          icon={Zap}
          accent="bg-emerald-500/15 text-emerald-400"
        />
      </div>

      {/* Vehicle quick-view */}
      {driver?.vehicle && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Your Vehicle</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#facc15]/10 text-[#facc15]">
              <CarFront size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{driver.vehicle.vehicle_name}</p>
              <p className="text-xs text-zinc-400">{driver.vehicle.brand} · {driver.vehicle.plate_number} · {driver.vehicle.color}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-xl bg-zinc-800 text-zinc-300 px-3 py-1.5 font-semibold">
                Base: {formatCurrency(driver.vehicle.base_fare)}
              </span>
              <span className="rounded-xl bg-zinc-800 text-zinc-300 px-3 py-1.5 font-semibold">
                {formatCurrency(driver.vehicle.per_km_rate)}/km
              </span>
              <span className="rounded-xl bg-zinc-800 text-zinc-300 px-3 py-1.5 font-semibold">
                {driver.vehicle.seat_capacity} seats
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Recent Rides</p>
          <a href="/dashboard/rides" className="text-xs font-semibold text-[#facc15] hover:underline">View all</a>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-10 text-center">
            <Zap size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm font-semibold text-zinc-400">No completed rides yet</p>
            <p className="mt-1 text-xs text-zinc-600">Go online to start receiving ride requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((ride) => (
              <div key={ride.id} className="flex items-center gap-4 rounded-2xl bg-zinc-900 border border-zinc-800/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                  <Users size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ride.customer_name || "Anonymous"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} className="text-zinc-500 flex-shrink-0" />
                    <p className="text-xs text-zinc-500 truncate">{ride.pickup_label} → {ride.drop_label}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#facc15]">{formatCurrency(ride.estimated_fare)}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{formatDateTime(ride.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewPage;
