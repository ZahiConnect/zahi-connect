import { MapPin, Zap } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { formatCurrency, formatDateTime } from "../../lib/format";

const STATUS_STYLES = {
  paid: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const RidesPage = () => {
  const { rideRequests, loading } = useDashboard();

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">History</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Ride History</h1>
        <p className="mt-1 text-sm text-zinc-500">All your assigned ride requests — completed and pending.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 text-sm">Loading rides...</div>
      ) : rideRequests.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-16 text-center">
          <Zap size={32} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-base font-semibold text-zinc-400">No rides found</p>
          <p className="mt-1 text-sm text-zinc-600">Go online to start receiving ride requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rideRequests.map((ride) => (
            <div key={ride.id} className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{ride.customer_name || "Anonymous"}</p>
                    {ride.customer_phone && (
                      <span className="text-xs text-zinc-500">{ride.customer_phone}</span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_STYLES[ride.status] || "bg-zinc-800 text-zinc-400"}`}>
                      {ride.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-[#facc15] flex-shrink-0" />
                      <p className="text-xs text-zinc-400 truncate"><span className="text-zinc-500">From:</span> {ride.pickup_label}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
                      <p className="text-xs text-zinc-400 truncate"><span className="text-zinc-500">To:</span> {ride.drop_label}</p>
                    </div>
                  </div>
                  {ride.notes && (
                    <p className="mt-2 text-xs italic text-zinc-600">"{ride.notes}"</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-[#facc15]">{formatCurrency(ride.estimated_fare)}</p>
                  <p className="text-[10px] text-zinc-600">{ride.passengers} passenger{ride.passengers !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{formatDateTime(ride.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RidesPage;
