import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiArrowRight, FiShield } from "react-icons/fi";

import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";

const VerifyOtpPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(location.state?.email || localStorage.getItem("otp_email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/verify-otp", {
        email,
        otp,
      });
      localStorage.removeItem("otp_email");
      const sessionUser = applySession(response.data);
      if (!sessionUser) {
        setError("This verification flow is reserved for customer accounts.");
        return;
      }
      toast.success("Your account is verified.");
      navigate("/activity", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <p>
          Want to restart?{" "}
          <Link to="/login" className="font-bold text-gray-900 hover:text-orange-600 transition-colors">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase mb-4">
            <FiShield size={11} />
            Verify
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Check your email
          </h2>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Enter the 6-digit code sent to{" "}
            <span className="font-bold text-gray-700">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
              Verification code
            </label>
            <div className="relative group">
              <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3.5 text-sm text-gray-900 tracking-[0.35em] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-green-500/8 focus:border-green-400 transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-[0.35em]"
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
                Verifying...
              </span>
            ) : (
              <>
                Verify account
                <FiArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default VerifyOtpPage;
