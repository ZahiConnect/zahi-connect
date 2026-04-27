import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiKey,
} from "react-icons/fi";

import api from "../../lib/axios";
import AuthShell from "./AuthShell";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(location.state?.email || localStorage.getItem("reset_email") || "");
  const [form, setForm] = useState({ otp: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp: form.otp,
        new_password: form.password,
        confirm_password: form.confirmPassword,
      });
      localStorage.removeItem("reset_email");
      toast.success("Password updated. You can sign in now.");
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <p>
          Need another code?{" "}
          <Link to="/forgot-password" className="font-bold text-gray-900 hover:text-orange-600 transition-colors">
            Request OTP again
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase mb-4">
            <FiKey size={11} />
            New Password
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Set new password
          </h2>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Resetting password for{" "}
            <span className="font-bold text-gray-700">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
              OTP Code
            </label>
            <div className="relative group">
              <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                value={form.otp}
                onChange={(e) => setField("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3.5 text-sm text-gray-900 tracking-[0.35em] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/8 focus:border-orange-400 transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-[0.35em]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
              New password
            </label>
            <div className="relative group">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-11 pr-12 py-3.5 text-sm text-gray-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/8 focus:border-orange-400 transition-all placeholder:text-gray-300"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
              Confirm password
            </label>
            <div className="relative group">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-11 pr-12 py-3.5 text-sm text-gray-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/8 focus:border-orange-400 transition-all placeholder:text-gray-300"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((c) => !c)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showConfirmPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl shadow-gray-900/8 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                Save new password
                <FiArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default ResetPasswordPage;
