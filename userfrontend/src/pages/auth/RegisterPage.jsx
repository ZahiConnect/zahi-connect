import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";

const RegisterPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setGoogleLoading(true);
        setError("");
        const response = await api.post("/auth/google-login", {
          token: tokenResponse.access_token,
        });

        if (response.data.requires_otp) {
          localStorage.setItem("otp_email", response.data.email);
          navigate("/verify-otp", { state: { email: response.data.email } });
          return;
        }

        const sessionUser = applySession(response.data);
        if (!sessionUser) {
          setError("This login is reserved for customer accounts.");
          return;
        }
        toast.success("Welcome to Zahi Connect!");
        navigate("/activity", { replace: true });
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Google sign-up failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google sign-up failed."),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        mobile: form.mobile || null,
        password: form.password,
        confirm_password: form.confirmPassword,
        role: "customer",
      });

      localStorage.setItem("otp_email", form.email);
      toast.success("Account created. Check your email for the OTP.");
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(detail || "We could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create your account"
      description="Save bookings, payments, and trip updates in one place."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="auth-link font-semibold text-[#8e3f11]">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="auth-link text-xs uppercase tracking-[0.24em] text-[#a6633b]">Register</p>
        <h2 className="auth-heading font-display mt-3 text-[3.35rem] leading-[0.98] text-[#1f1812]">
          Create your account
        </h2>
        <p className="auth-muted mt-3 text-sm leading-7 text-[#6a5f56]">
          Sign up once and verify your email to get started.
        </p>
      </div>

      <div className="mt-8 space-y-4 fade-up">
        <button
          type="button"
          onClick={() => googleLogin()}
          disabled={googleLoading}
          className="auth-secondary-button inline-flex w-full items-center justify-center gap-3 rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-5 py-3.5 text-sm font-semibold text-[#1f1812] shadow-sm transition-all hover:bg-[#fffaf4] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FcGoogle className="text-xl" />
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-[#9d8a79]">
          <div className="h-px flex-1 bg-[rgba(96,73,53,0.14)]" />
          Or use email
          <div className="h-px flex-1 bg-[rgba(96,73,53,0.14)]" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 fade-up">
        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Name</span>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="text"
              value={form.username}
              onChange={(event) => setField("username", event.target.value)}
              placeholder="Your name"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
              minLength={3}
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Email</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="Email address"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Mobile number</span>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="tel"
              value={form.mobile}
              onChange={(event) => setField("mobile", event.target.value)}
              placeholder="Optional"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
            />
          </div>
        </label>

        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Password</span>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              placeholder="Create a password"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9d8a79] transition-colors hover:text-[#6a5f56]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Confirm password</span>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(event) => setField("confirmPassword", event.target.value)}
              placeholder="Repeat password"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9d8a79] transition-colors hover:text-[#6a5f56]"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
          className="auth-primary-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,24,18,0.12)] transition-all hover:bg-[#2f241d] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
