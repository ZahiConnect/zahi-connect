import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  MdOutlineFlight,
  MdOutlineHotel,
  MdOutlineLocalTaxi,
  MdOutlineRestaurant,
} from "react-icons/md";

import api from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

const page = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const services = [
  { Icon: MdOutlineHotel, label: "Hotels", detail: "Stays", tone: "bg-sky-50 text-sky-600 border-sky-100" },
  { Icon: MdOutlineRestaurant, label: "Food", detail: "Orders", tone: "bg-orange-50 text-orange-600 border-orange-100" },
  { Icon: MdOutlineLocalTaxi, label: "Cabs", detail: "Rides", tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { Icon: MdOutlineFlight, label: "Flights", detail: "Trips", tone: "bg-violet-50 text-violet-600 border-violet-100" },
];

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
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        variants={page}
        initial="hidden"
        animate="show"
        className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <motion.section
          variants={fadeUp}
          className="relative hidden h-full min-h-[720px] overflow-hidden rounded-[32px] bg-gray-950 p-8 text-white shadow-2xl shadow-gray-900/15 lg:flex lg:flex-col lg:justify-between"
        >
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(14,165,233,0.17),transparent_34%,rgba(249,115,22,0.18)_66%,rgba(16,185,129,0.13))]" />
          <div className="relative flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-gray-950 shadow-xl">
                Z
              </span>
              <span className="text-2xl font-extrabold tracking-tight">Zahi</span>
            </Link>
            <Link
              to="/hotels"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/15"
            >
              <FiArrowLeft size={14} />
              Browse
            </Link>
          </div>

          <div className="relative">
            <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sky-200">
              <FiShield size={14} />
              Customer account
            </motion.div>
            <motion.h1 variants={fadeUp} className="max-w-md text-5xl font-extrabold leading-[1.02] tracking-tight">
              One account for every Zahi service.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-md text-base leading-7 text-white/65">
              Create your profile once, then move between stays, food orders, rides, and flight bookings.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="relative space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {services.map(({ Icon, label, detail }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.08, duration: 0.45 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="rounded-[24px] border border-white/10 bg-white/10 p-4"
                >
                  <Icon className="text-3xl text-white" />
                  <p className="mt-4 text-lg font-extrabold">{label}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{detail}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <motion.section variants={fadeUp} className="mx-auto w-full max-w-[620px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-lg font-extrabold text-white shadow-lg">
                Z
              </span>
              <span className="text-xl font-extrabold text-gray-950">Zahi</span>
            </Link>
            <Link to="/login" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500">
              Sign in
            </Link>
          </div>

          <motion.div
            layout
            className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-2xl shadow-gray-200/70"
          >
            <div className="border-b border-gray-100 bg-gray-50/70 px-7 py-6 sm:px-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">Create account</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950">Start with Zahi</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Already registered?{" "}
                <Link to="/login" className="font-extrabold text-gray-950 transition hover:text-orange-600">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="p-7 sm:p-8">
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FcGoogle className="text-xl" />
                {googleLoading ? "Connecting..." : "Sign up with Google"}
              </button>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-300">or fill details</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                      Full name
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type="text"
                        value={form.username}
                        onChange={(event) => setField("username", event.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                        minLength={3}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                      Email
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setField("email", event.target.value)}
                        placeholder="you@email.com"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                    Phone optional
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(event) => setField("mobile", event.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(event) => setField("password", event.target.value)}
                        placeholder="Minimum 6 chars"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition hover:text-gray-600"
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                      Confirm password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                        placeholder="Repeat password"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition hover:text-gray-600"
                      >
                        {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                  >
                    {error}
                  </motion.div>
                )}

                <p className="text-xs leading-6 text-gray-400">
                  By creating an account, you agree to Zahi account verification and customer booking records.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-4 font-extrabold text-white shadow-xl shadow-gray-900/15 transition hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create account"}
                  {!loading && <FiArrowRight size={17} />}
                </button>
              </form>
            </div>
          </motion.div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
            {services.map(({ Icon, label, tone }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06 }}
                className={`rounded-2xl border p-3 text-center ${tone}`}
              >
                <Icon className="mx-auto text-xl" />
                <p className="mt-1 text-[11px] font-extrabold">{label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
};

export default RegisterPage;
