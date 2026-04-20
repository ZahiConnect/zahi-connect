import { useSelector } from "react-redux";
import {
  FiBox, FiPieChart, FiClipboard, FiUsers
} from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import RestaurantDashboard from "../restaurant/Dashboard";

const presetBase = "rounded-[24px] border border-slate-200 bg-white p-6 hover:shadow-[0_8px_30px_-4px_rgba(3,127,252,0.08)] transition-all duration-300 group";
const iconBase = "w-12 h-12 rounded-[16px] flex items-center justify-center text-xl shrink-0";

const workspacePresets = {
  hotel: {
    kicker: "Hotel workspace active",
    title: "Hospitality Management System",
    description: "Your stay operations are live. Manage front desk, pricing, guest flows, and property settings from a single command center.",
    primaryColor: "text-amber-600",
    bgAccent: "bg-amber-50 border-amber-100",
    cards: [
      { title: "Booking board", value: "Upcoming arrivals", detail: "Manual bookings and walk-ins.", icon: FiClipboard },
      { title: "Room readiness", value: "Rooms tracked", detail: "Occupancy and cleaning.", icon: FiBox },
      { title: "Pricing control", value: "Seasonal rules", detail: "Room rates and overrides.", icon: FiPieChart },
      { title: "Guest service layer", value: "WhatsApp concierge", detail: "Requests and late checkout.", icon: FiUsers },
    ],
  },
  mobility: {
    kicker: "Dispatch workspace active",
    title: "Fleet Operations Center",
    description: "Run local rides, fleet visibility, and WhatsApp demand from one board. Designed for autos, cabs, and small fleet teams.",
    primaryColor: "text-emerald-600",
    bgAccent: "bg-emerald-50 border-emerald-100",
    cards: [
      { title: "Ride queue", value: "Live requests", detail: "Incoming ride demand.", icon: FiClipboard },
      { title: "Fleet board", value: "Vehicles listed", detail: "Local transport teams.", icon: FiBox },
      { title: "Owner analytics", value: "Dispatch snapshot", detail: "Trips and payouts.", icon: FiPieChart },
      { title: "Driver roster", value: "Available drivers", detail: "Online and offline status.", icon: FiUsers },
    ],
  },
  flight: {
    kicker: "Aviation workspace active",
    title: "Flight Operations Control",
    description: "Your aviation operations are live. Manage active PNRs, scheduled flights, dynamic fare classes, and passenger clearance all in one place.",
    primaryColor: "text-[#037ffc]",
    bgAccent: "bg-[#037ffc]/5 border-[#037ffc]/10",
    cards: [
      { title: "Reservations", value: "Active PNRs", detail: "Ticket purchases and passenger bookings.", icon: FiClipboard },
      { title: "Flight Schedule", value: "Network Routing", detail: "Manage departures and arrivals.", icon: FiBox },
      { title: "Pricing Engine", value: "Fare Classes", detail: "Economy, Business, First.", icon: FiPieChart },
      { title: "Passenger Manifest", value: "Clearance Board", detail: "Track boarding and frequent flyers.", icon: FiUsers },
    ],
  },
};

const DashboardHome = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type === "restaurant" || user?.role === "super_admin") {
    return <RestaurantDashboard />;
  }

  const preset = workspacePresets[user?.business_type] || workspacePresets.hotel;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-0 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Header Area (Replaces giant blue/gradient div) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${preset.bgAccent} ${preset.primaryColor} mb-4`}>
            {preset.kicker}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
            {preset.title}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
            {preset.description}
          </p>
        </div>
        
        <div className="relative z-10 hidden md:flex items-center justify-center w-32 h-32 rounded-full border border-slate-100 bg-slate-50 p-6 shadow-inner shrink-0">
          <HiOutlineBuildingOffice2 className="w-full h-full text-slate-300" />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Command Modules</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {preset.cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className={presetBase} style={{ animationFillMode: "both", animationDelay: `${i * 100}ms` }}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`${iconBase} ${preset.bgAccent} ${preset.primaryColor}`}>
                      <Icon />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-widest ${preset.primaryColor}`}>{card.title}</p>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight mt-1">{card.value}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mt-auto pt-4 border-t border-slate-100">{card.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
