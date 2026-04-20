import { AlertTriangle, Info, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import mobilityService from "../../services/mobilityService";
import { useDashboard } from "../../context/DashboardContext";

const SettingsPage = () => {
  const { driver } = useDashboard();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await mobilityService.logoutDriver(); } catch {}
    logout();
    navigate("/");
    toast.success("Logged out successfully.");
  };

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Account</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account preferences and security.</p>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3">Account Info</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Full Name</p>
            <p className="mt-1 text-sm font-semibold text-white">{driver?.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Email</p>
            <p className="mt-1 text-sm font-semibold text-white">{driver?.email || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Phone</p>
            <p className="mt-1 text-sm font-semibold text-white">{driver?.phone || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Account Status</p>
            <p className="mt-1 text-sm font-semibold text-emerald-400">{driver?.status || "active"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Rating</p>
            <p className="mt-1 text-sm font-semibold text-[#facc15]">⭐ {driver?.rating?.toFixed(1) || "4.8"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Member Since</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {driver?.created_at ? new Date(driver.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
          <Shield size={15} className="text-zinc-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Security</p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-zinc-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-400">
              To change your password or update your email, please contact Zahi Drive support.
              Your account security is managed through our verified onboarding process.
            </p>
          </div>
        </div>
      </div>

      {/* Platform info */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-3 mb-4">Platform</p>
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex justify-between">
            <span>Commission Rate</span>
            <span className="font-bold text-white">12%</span>
          </div>
          <div className="flex justify-between">
            <span>Ride assignment</span>
            <span className="font-bold text-white">Auto-dispatch</span>
          </div>
          <div className="flex justify-between">
            <span>Payment model</span>
            <span className="font-bold text-white">Per-ride commission</span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-zinc-900 border border-red-900/40 p-6">
        <div className="flex items-center gap-2 border-b border-red-900/30 pb-3 mb-4">
          <AlertTriangle size={15} className="text-red-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">Session</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Sign out of Zahi Drive</p>
            <p className="text-xs text-zinc-500 mt-0.5">You will need to log in again to access your dashboard.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
