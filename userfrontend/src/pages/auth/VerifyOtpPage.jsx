import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, ShieldCheck } from "lucide-react";

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
      applySession(response.data);
      toast.success("Your account is verified.");
      navigate("/account", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Confirm your one-time code."
      description="We use the same OTP verification flow as the main Zahi app so your customer account stays fully aligned with the existing backend."
      footer={
        <p>
          Want to restart?{" "}
          <Link to="/login" className="font-semibold text-[#8e3f11]">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="text-xs uppercase tracking-[0.24em] text-[#a6633b]">Verify OTP</p>
        <h2 className="font-display mt-3 text-5xl text-[#1f1812]">Almost there</h2>
        <p className="mt-3 text-sm leading-7 text-[#6a5f56]">
          Enter the 6-digit code sent to <span className="font-medium text-[#1f1812]">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 fade-up">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">OTP</span>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 tracking-[0.35em] outline-none focus:border-[#d56d2e]"
              required
            />
          </div>
        </label>

        {error ? (
          <div className="rounded-[22px] border border-[#efc8b7] bg-[#fff1ea] px-4 py-3 text-sm text-[#9f4318]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#2f241d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Verifying..." : "Verify account"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default VerifyOtpPage;
