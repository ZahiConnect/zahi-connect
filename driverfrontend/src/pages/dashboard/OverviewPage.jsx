import { CarFront, MapPin, RefreshCcw, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { formatCurrency, formatDateTime } from "../../lib/format";

const StatCard = ({ label, value, sub, icon: Icon, accent, isDark }) => (
  <div className={`rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>{label}</p>
        <p className={`mt-2 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{value}</p>
        {sub && <p className={`mt-1 text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const OverviewPage = () => {
  const { driver, dashboard, loading, theme } = useDashboard();
  const isDark = theme === "dark";

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
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Dashboard</p>
          <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Welcome back, {driver?.full_name?.split(" ")[0] || "Driver"}
          </h1>
          <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            Track customer-paid ride requests, vehicle details, and your latest receipts.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          isDark={isDark}
          label="Total Rides"
          value={stats.paid_customers ?? 0}
          sub="Accepted trips"
          icon={Users}
          accent={isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}
        />
        <StatCard
          isDark={isDark}
          label="Total Earnings"
          value={formatCurrency(stats.total_fare ?? 0)}
          sub="Gross fare"
          icon={Wallet}
          accent={isDark ? "bg-[#facc15]/15 text-[#facc15]" : "bg-amber-50 text-amber-600"}
        />
        <StatCard
          isDark={isDark}
          label="Commission Paid"
          value={formatCurrency(stats.total_commission ?? 0)}
          sub={`@${Math.round((stats.commission_rate ?? 0.12) * 100)}% platform fee`}
          icon={TrendingUp}
          accent={isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600"}
        />
        <StatCard
          isDark={isDark}
          label="Net Earned"
          value={formatCurrency((stats.total_fare ?? 0) - (stats.total_commission ?? 0))}
          sub="After commission"
          icon={Zap}
          accent={isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}
        />
      </div>

      {/* Vehicle quick-view */}
      {driver?.vehicle && (
        <div className={`rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Your Vehicle</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${isDark ? "bg-[#facc15]/10 text-[#facc15]" : "bg-amber-50 text-amber-600"}`}>
              <CarFront size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{driver.vehicle.vehicle_name}</p>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>{driver.vehicle.brand} - {driver.vehicle.plate_number} - {driver.vehicle.color}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className={`rounded-xl px-3 py-1.5 font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-700"}`}>
                {driver.vehicle.seat_capacity} seats
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Recent Rides</p>
          <a href="/dashboard/rides" className={`text-xs font-semibold hover:underline ${isDark ? "text-[#facc15]" : "text-amber-600"}`}>View all</a>
        </div>
        {recent.length === 0 ? (
          <div className={`rounded-2xl border p-10 text-center ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
            <Zap size={28} className={`mx-auto mb-3 ${isDark ? "text-zinc-600" : "text-slate-300"}`} />
            <p className={`text-sm font-semibold ${isDark ? "text-zinc-400" : "text-slate-500"}`}>No completed rides yet</p>
            <p className={`mt-1 text-xs ${isDark ? "text-zinc-600" : "text-slate-400"}`}>Accepted and completed rides will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((ride) => (
              <div key={ride.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                  <Users size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{ride.customer_name || "Anonymous"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} className={`flex-shrink-0 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
                    <p className={`text-xs truncate ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{ride.pickup_label} -&gt; {ride.drop_label}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${isDark ? "text-[#facc15]" : "text-amber-600"}`}>{formatCurrency(ride.estimated_fare)}</p>
                  <p className={`text-[10px] mt-0.5 ${isDark ? "text-zinc-600" : "text-slate-400"}`}>{formatDateTime(ride.created_at)}</p>
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
