import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiArrowRight, FiMail, FiKey } from "react-icons/fi";

import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";

const ForgotPasswordPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", { email });
      localStorage.setItem("reset_email", email);
      toast.success("Password reset OTP sent.");
      navigate("/reset-password", { state: { email } });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <p>
          Remembered it?{" "}
          <Link to="/login" className="font-bold text-gray-900 hover:text-orange-600 transition-colors">
            Return to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase mb-4">
            <FiKey size={11} />
            Reset
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Forgot password?
          </h2>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Enter your email and we'll send a one-time code to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
              Email address
            </label>
            <div className="relative group">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3.5 text-sm text-gray-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/8 focus:border-orange-400 transition-all placeholder:text-gray-300"
                required
              />
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
                Sending...
              </span>
            ) : (
              <>
                Send reset code
                <FiArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
