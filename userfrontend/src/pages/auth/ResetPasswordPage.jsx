import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

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
      eyebrow="Create a fresh password"
      title="Finish the reset flow."
      description="Use the OTP from your email, set a new password, and then step back into the customer-facing Zahi experience."
      footer={
        <p>
          Need another code?{" "}
          <Link to="/forgot-password" className="font-semibold text-[#8e3f11]">
            Request OTP again
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="text-xs uppercase tracking-[0.24em] text-[#a6633b]">Reset password</p>
        <h2 className="font-display mt-3 text-5xl text-[#1f1812]">Choose a new password</h2>
        <p className="mt-3 text-sm leading-7 text-[#6a5f56]">
          Resetting access for <span className="font-medium text-[#1f1812]">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 fade-up">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">OTP</span>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="text"
              value={form.otp}
              onChange={(event) => setField("otp", event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 tracking-[0.35em] outline-none focus:border-[#d56d2e]"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">New password</span>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9d8a79]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">Confirm password</span>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(event) => setField("confirmPassword", event.target.value)}
              placeholder="Repeat your password"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9d8a79]"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
          {loading ? "Updating password..." : "Save new password"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
