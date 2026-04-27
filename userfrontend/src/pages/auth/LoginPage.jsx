import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";

const LoginPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = location.state?.from || "/activity";

  const finishLogin = (payload) => {
    const sessionUser = applySession(payload);
    if (!sessionUser) {
      setError("This login is reserved for customer accounts. Use the workspace frontend for operator access.");
      return;
    }
    toast.success("Welcome back to Zahi Connect.");
    navigate(nextPath, { replace: true });
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

        finishLogin(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Google sign-in failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google sign-in failed."),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });
      finishLogin(response.data);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      if (requestError.response?.status === 401 && String(detail).toLowerCase().includes("verify")) {
        localStorage.setItem("otp_email", username);
        navigate("/verify-otp", { state: { email: username } });
      } else {
        setError(detail || "Unable to sign in with those credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      description="View bookings, payments, and trip updates from one account."
      footer={
        <p>
          No account yet?{" "}
          <Link to="/register" className="auth-link font-semibold text-[#8e3f11]">
            Create one
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="auth-link text-xs uppercase tracking-[0.24em] text-[#a6633b]">Sign in</p>
        <h2 className="auth-heading font-display mt-3 text-[3.35rem] leading-[0.98] text-[#1f1812]">
          Welcome back
        </h2>
        <p className="auth-muted mt-3 text-sm leading-7 text-[#6a5f56]">
          Continue with Google or use your email and password.
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
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Email or username</span>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Email or username"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="auth-heading mb-2 block text-sm font-medium text-[#3f342a]">Password</span>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="auth-input-surface w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none transition-all focus:border-[#d56d2e] focus:ring-4 focus:ring-[rgba(213,109,46,0.08)]"
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

        <div className="flex items-center justify-end text-sm">
          <Link to="/forgot-password" className="auth-link font-medium text-[#8e3f11] transition-colors hover:text-[#b5511a]">
            Forgot password?
          </Link>
        </div>

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
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
