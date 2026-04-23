import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Mail } from "lucide-react";

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
      eyebrow="Reset access"
      title="Request a password OTP."
      description="The reset flow stays consistent with the existing accounts service, so you only need one user identity across both frontends."
      footer={
        <p>
          Remembered it?{" "}
          <Link to="/login" className="auth-link font-semibold text-[#8e3f11]">
            Return to sign in
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="auth-link text-xs uppercase tracking-[0.24em] text-[#a6633b]">Forgot password</p>
        <h2 className="font-display mt-3 text-5xl text-[#1f1812]">Let’s reset it</h2>
        <p className="auth-muted mt-3 text-sm leading-7 text-[#6a5f56]">
          Enter your email and we will send a one-time code so you can create a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 fade-up">
        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Email address</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
              required
            />
          </div>
        </label>

        {error ? (
          <div className="auth-error rounded-[22px] border border-[#efc8b7] bg-[#fff1ea] px-4 py-3 text-sm text-[#9f4318]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#2f241d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
