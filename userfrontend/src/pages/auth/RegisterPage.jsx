import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Phone, UserRound } from "lucide-react";

import api from "../../lib/axios";
import AuthShell from "./AuthShell";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

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
      eyebrow="A shared identity across Zahi surfaces"
      title="Create your customer account."
      description="This demo keeps the same auth backbone as the main workspace frontend, but repackages it for guests and local buyers."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-[#8e3f11]">
            Sign in instead
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <p className="text-xs uppercase tracking-[0.24em] text-[#a6633b]">Register</p>
        <h2 className="font-display mt-3 text-5xl text-[#1f1812]">Join the Zahi flow</h2>
        <p className="mt-3 text-sm leading-7 text-[#6a5f56]">
          Browse hotels, restaurants, and future hyper-local services from the same account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 fade-up">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">Username</span>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="text"
              value={form.username}
              onChange={(event) => setField("username", event.target.value)}
              placeholder="traveller.anu"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
              minLength={3}
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">Email</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">Mobile number</span>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d8a79]" />
            <input
              type="tel"
              value={form.mobile}
              onChange={(event) => setField("mobile", event.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-12 py-3.5 outline-none focus:border-[#d56d2e]"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#3f342a]">Password</span>
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
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
