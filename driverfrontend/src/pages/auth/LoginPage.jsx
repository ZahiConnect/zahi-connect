import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";
import mobilityService from "../../services/mobilityService";
import GoogleAuthButton from "../../components/GoogleAuthButton";

const LoginPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = location.state?.from || "/dashboard";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await mobilityService.loginDriver({
        identifier,
        password,
      });
      applySession(response);
      toast.success("Welcome back to Zahi Drive.");
      navigate(nextPath, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to sign in with those credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Commission-first driver onboarding"
      title="Sign in to your driver space."
      description="Manage your cab, update documents, and keep an eye on the latest paid riders."
      footer={
        <p>
          New to Zahi Drive?{" "}
          <Link to="/register" className="font-semibold text-amber-600">
            Create your driver account
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Secure Protocol
        </span>
        <h2 className="font-display mt-2 text-4xl font-bold tracking-tight text-zinc-900">System Access</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
          Authenticate using your dispatch communications ID or secure email vector.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5 fade-up">
        <label className="block">
          <span className="field-label">Dispatch Identifier</span>
          <div className="relative group">
            <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="operator@zahi.app"
              className="field-input"
              style={{ paddingLeft: "3rem" }}
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="field-label">Security Clearance</span>
          <div className="relative group">
            <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="field-input"
              style={{ paddingLeft: "3rem", paddingRight: "3rem" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-900 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full mt-4 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 hover:bg-zinc-800 shadow-xl shadow-black/10"
        >
          {loading ? "Signing in..." : "Sign In"}
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs font-semibold tracking-widest uppercase text-slate-400">or</span>
          </div>
        </div>

        <GoogleAuthButton mode="signin" />
      </form>
    </AuthShell>
  );
};

export default LoginPage;
