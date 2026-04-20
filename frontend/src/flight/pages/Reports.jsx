import { useEffect, useState } from "react";
import {
  FiRefreshCw, FiDollarSign, FiTrendingUp, FiMap, FiXCircle, FiPieChart, FiBarChart2
} from "react-icons/fi";
import { MdFlightTakeoff } from "react-icons/md";
import dbs from "../api/db";
import {
  BOOKING_STATUSES,
  buildClassMix,
  buildDayDistribution,
  buildRoutePerformance,
  buildStatusBreakdown,
  normalizeBookingRecord,
  normalizeFlightRecord,
} from "../lib/workspace";

const formatCurrency = (val) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
const formatNum = (val) => new Intl.NumberFormat("en-IN", { compactDisplay: "short", notation: "compact" }).format(val);

const StatCard = ({ label, value, detail, icon: Icon, tone, delay }) => {
  const tones = {
    blue: "text-[#037ffc] bg-[#037ffc]/5 border-[#037ffc]/10",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    red: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <article className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in zoom-in-95" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-xl border ${tones[tone]}`}>
          <Icon />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 mb-3">{label}</p>
        <p className="text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-100 pt-3">{detail}</p>
      </div>
    </article>
  );
};

const SimpleBar = ({ label, value, percent, toneCode }) => (
  <div className="space-y-2 mb-4 group cursor-default">
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-slate-500 text-xs font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{value} · {percent}%</span>
    </div>
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: toneCode }} />
    </div>
  </div>
);

export default function FlightReports() {
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [fRes, bRes] = await Promise.all([
        dbs.readCollection("flights", 300),
        dbs.readCollection("bookings", 500),
      ]);
      const normF = (fRes?.data || fRes || []).map((f, i) => normalizeFlightRecord(f, i));
      const normB = (bRes?.data || bRes || []).map((b, i) => normalizeBookingRecord(b, i, normF));
      setFlights(normF);
      setBookings(normB);
    } catch {
      setFlights([]); setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const routePerformance = buildRoutePerformance(flights, bookings);
  const statusBreakdown = buildStatusBreakdown(bookings, BOOKING_STATUSES);
  const classMix = buildClassMix(bookings);
  const dayDistribution = buildDayDistribution(flights);

  const activeRevenue = bookings.filter(b => b.status !== "Cancelled").reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const soldSeats = bookings.filter(b => b.status !== "Cancelled").reduce((sum, b) => sum + Number(b.travellers || 1), 0);
  const availableSeats = flights.reduce((sum, f) => sum + Number(f.totalSeats || 0), 0);
  
  const averageLoad = availableSeats ? Math.round((soldSeats / availableSeats) * 100) : 0;
  const cxRate = bookings.length ? Math.round((bookings.filter(b => b.status === "Cancelled").length / bookings.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Financial & Operations</h1>
          <p className="text-slate-500">Aviation intelligence, revenue tracking, and capacity utilization.</p>
        </div>
        <button onClick={fetchReports} disabled={loading} className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50">
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Data
        </button>
      </div>

      {loading ? (
        <div className="py-32 flex justify-center"><FiRefreshCw size={32} className="animate-spin text-slate-300" /></div>
      ) : flights.length === 0 && bookings.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 p-20 text-center shadow-sm animate-in fade-in slide-in-from-bottom-5">
           <div className="w-24 h-24 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-slate-100">
             <FiBarChart2 size={40} className="text-slate-300" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Reports Awaiting Data</h2>
           <p className="text-slate-500 max-w-md mx-auto">Schedule routes and accept passenger bookings to generate automated revenue and operational intelligence here.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Captured Revenue" value={formatCurrency(activeRevenue)} detail="Cumulative value of all non-cancelled flight reservations." icon={FiDollarSign} tone="emerald" delay={0}/>
            <StatCard label="Network Seat Load" value={`${averageLoad}%`} detail={`${formatNum(soldSeats)} tickets sold across ${formatNum(availableSeats)} scheduled sector seats.`} icon={FiTrendingUp} tone="indigo" delay={100}/>
            <StatCard label="Active Routes" value={routePerformance.length} detail="Distinct point-to-point corridors configured in the network." icon={FiMap} tone="blue" delay={200}/>
            <StatCard label="Cancellation Rate" value={`${cxRate}%`} detail="Percentage of PNRs that have moved into a cancelled state." icon={FiXCircle} tone="red" delay={300}/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col (2-span) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Route Performance */}
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                  <MdFlightTakeoff size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-800">Top Routes by Revenue</h2>
                </div>
                {routePerformance.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No route data generated yet.</p>
                ) : (
                  <div className="space-y-4">
                    {routePerformance.slice(0, 5).map((route, idx) => (
                      <div key={route.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="w-6 h-6 rounded-full bg-[#037ffc] text-white text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                             <h3 className="font-bold text-slate-800 text-lg">{route.routeLabel}</h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-2 font-medium ml-8">{route.soldSeats} tickets · {route.sectors} sectors</p>
                        </div>
                        
                        <div className="flex gap-4 sm:ml-auto pl-8 sm:pl-0">
                          <div className="bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm min-w-28 text-center bg-gradient-to-b from-white to-slate-50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Revenue</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(route.revenue)}</p>
                          </div>
                          <div className="bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm min-w-24 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Load</p>
                            <p className="font-bold text-slate-800">{route.averageLoad}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Col (1-span) */}
            <div className="space-y-6">
              
              {/* Cabin Mix */}
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                  <FiPieChart size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-800">Cabin Class Mix</h2>
                </div>
                {classMix.length === 0 ? <p className="text-sm text-slate-500 text-center">No breakdown available.</p> : (
                  <div>
                    {classMix.map((c) => {
                      let color = "#037ffc";
                      if (c.label === "Business") color = "#8b5cf6";
                      if (c.label === "First") color = "#f59e0b";
                      return <SimpleBar key={c.label} label={c.label} value={c.value} percent={c.percentage} toneCode={color} />
                    })}
                  </div>
                )}
              </div>

              {/* Status Tracking */}
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                  <FiBarChart2 size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-800">Boarding Pipeline</h2>
                </div>
                <div className="space-y-3">
                  {statusBreakdown.map(s => {
                    const percent = bookings.length ? Math.round((s.count / bookings.length) * 100) : 0;
                    let color = "#94a3b8";
                    if (s.tone === "emerald") color = "#10b981";
                    else if (s.tone === "blue") color = "#0ea5e9";
                    else if (s.tone === "indigo") color = "#8b5cf6";
                    else if (s.tone === "amber") color = "#f59e0b";
                    else if (s.tone === "red") color = "#ef4444";
                    return (
                      <div key={s.value} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                           <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{s.count} <span className="text-xs text-slate-400 font-medium ml-1">({percent}%)</span></span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
