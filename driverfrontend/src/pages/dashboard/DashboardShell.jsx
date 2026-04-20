import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CarFront, ChevronRight, LayoutDashboard, LogOut, MapPin,
  Menu, Moon, Settings, Sun, User, X, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";
import mobilityService from "../../services/mobilityService";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/profile", label: "My Profile", icon: User },
  { to: "/dashboard/vehicle", label: "My Vehicle", icon: CarFront },
  { to: "/dashboard/rides", label: "Ride History", icon: Zap },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const OnlineToggle = () => {
  const { driver, toggleOnline, switchingOnline, locationLabel, locStatus, theme } = useDashboard();
  const isOnline = driver?.is_online;
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleOnline}
      disabled={switchingOnline}
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
        isOnline
          ? isDark ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          : isDark ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      } disabled:opacity-60`}
    >
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
      <div className="flex-1 text-left min-w-0">
        <p className="leading-none">{isOnline ? "Online" : "Offline"}</p>
        {locStatus === "ready" && locationLabel && (
          <p className="mt-0.5 text-[10px] font-normal opacity-60 truncate">{locationLabel}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 opacity-40 flex-shrink-0" />
    </button>
  );
};

const Sidebar = ({ onClose }) => {
  const { driver, theme } = useDashboard();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const handleLogout = async () => {
    try { await mobilityService.logoutDriver(); } catch {}
    logout();
    navigate("/");
    toast.success("Logged out.");
  };

  return (
    <div className={`flex h-full w-64 flex-col ${isDark ? "bg-zinc-950 border-r border-zinc-800" : "bg-white border-r border-slate-200"}`}>
      {/* Logo area */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b ${isDark ? "border-zinc-800/60" : "border-slate-100"}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#facc15] text-[#422006] flex-shrink-0">
          <CarFront size={20} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className={`text-base font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>Zahi Drive</p>
          <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-amber-400" : "text-amber-600"}`}>Driver Portal</p>
        </div>
        {onClose && (
          <button onClick={onClose} className={`ml-auto ${isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"} lg:hidden`}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Driver Card */}
      <div className={`mx-3 mt-4 rounded-2xl border p-4 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
        <div className="flex items-center gap-3">
          {driver?.profile_photo_url ? (
            <img src={driver.profile_photo_url} alt="avatar" className="h-10 w-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-slate-200 text-slate-500"}`}>
              <User size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate leading-none ${isDark ? "text-white" : "text-slate-800"}`}>{driver?.full_name || "Driver"}</p>
            <p className={`mt-0.5 text-[11px] truncate ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{driver?.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <OnlineToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-600" : "text-slate-400"}`}>Navigation</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#facc15] text-[#09090b]"
                  : isDark 
                    ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Logout */}
      <div className={`border-t p-3 ${isDark ? "border-zinc-800/60" : "border-slate-100"}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            isDark 
              ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-red-400" 
              : "text-slate-600 hover:bg-slate-100 hover:text-red-600"
          }`}
        >
          <LogOut size={17} className="flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
};

const DashboardShellInner = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useDashboard();
  const isDark = theme === "dark";

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? "bg-[#09090b]" : "bg-slate-50"}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-shrink-0 border-r ${isDark ? "bg-zinc-950 border-zinc-800/60" : "bg-white border-slate-200"}`}>
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar + Desktop Header Toggle */}
        <div className={`flex items-center justify-between px-4 py-3 border-b lg:px-8 ${isDark ? "bg-zinc-950 border-zinc-800/60" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`flex items-center justify-center h-9 w-9 rounded-xl lg:hidden ${isDark ? "bg-zinc-800/60 text-zinc-300" : "bg-slate-100 text-slate-600"}`}
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#facc15] flex items-center justify-center shadow-lg shadow-amber-500/20">
                <CarFront size={16} className="text-[#422006]" strokeWidth={2.5} />
              </div>
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Zahi Drive</p>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              isDark 
                ? "border-zinc-800 bg-zinc-900 text-[#facc15] hover:border-[#facc15]/40" 
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 shadow-sm"
            }`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${isDark ? "bg-zinc-950" : "bg-slate-50"}`}>
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const DashboardShell = () => (
  <DashboardProvider>
    <DashboardShellInner />
  </DashboardProvider>
);

export default DashboardShell;
