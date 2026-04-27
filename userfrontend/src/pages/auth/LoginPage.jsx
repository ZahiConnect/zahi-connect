import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiMapPin,
  FiShield,
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
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const services = [
  { Icon: MdOutlineHotel, label: "Hotels", tone: "bg-sky-50 text-sky-600 border-sky-100" },
  { Icon: MdOutlineRestaurant, label: "Food", tone: "bg-orange-50 text-orange-600 border-orange-100" },
  { Icon: MdOutlineLocalTaxi, label: "Cabs", tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { Icon: MdOutlineFlight, label: "Flights", tone: "bg-violet-50 text-violet-600 border-violet-100" },
];

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
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        variants={page}
        initial="hidden"
        animate="show"
        className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <motion.section
          variants={fadeUp}
          className="relative hidden h-full min-h-[690px] overflow-hidden rounded-[32px] bg-gray-950 p-8 text-white shadow-2xl shadow-gray-900/15 lg:flex lg:flex-col lg:justify-between"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.20),transparent_34%,rgba(14,165,233,0.16)_72%,rgba(16,185,129,0.14))]" />
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

          <div className="relative max-w-md">
            <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-200">
              <FiShield size={14} />
              Customer access
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl font-extrabold leading-[1.02] tracking-tight">
              Pick up where your plans left off.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-base leading-7 text-white/65">
              Manage stays, meals, rides, and trips from one calm customer account.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="relative grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white/55">Next stop</p>
                  <p className="mt-1 text-xl font-extrabold">Near Edakkara</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                  <FiMapPin size={22} />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-3">
                {services.map(({ Icon, label }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + index * 0.06, duration: 0.4 }}
                    whileHover={{ y: -3, scale: 1.03 }}
                    className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center"
                  >
                    <Icon className="mx-auto text-2xl text-white" />
                    <p className="mt-2 text-[11px] font-bold text-white/70">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                <FiCheckCircle className="text-emerald-300" />
                <p className="mt-3 text-sm font-extrabold">Fast booking</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Return to saved activity quickly.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                <FiCreditCard className="text-sky-300" />
                <p className="mt-3 text-sm font-extrabold">Secure payments</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Checkout stays connected to orders.</p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section variants={fadeUp} className="mx-auto w-full max-w-[500px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-lg font-extrabold text-white shadow-lg">
                Z
              </span>
              <span className="text-xl font-extrabold text-gray-950">Zahi</span>
            </Link>
            <Link to="/hotels" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500">
              Browse
            </Link>
          </div>

          <motion.div
            layout
            className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-2xl shadow-gray-200/70"
          >
            <div className="border-b border-gray-100 bg-gray-50/70 px-7 py-6 sm:px-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">Sign in</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Continue to your bookings, orders, and saved travel activity.</p>
            </div>

            <div className="p-7 sm:p-8">
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FcGoogle className="text-xl" />
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-300">or</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                    Email or username
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="you@email.com"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
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

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs font-bold text-orange-600 transition hover:text-orange-700">
                    Forgot password?
                  </Link>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-4 font-extrabold text-white shadow-xl shadow-gray-900/15 transition hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  {!loading && <FiArrowRight size={17} />}
                </button>
              </form>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            </div>
          </motion.div>

          <p className="mt-6 text-center text-sm text-gray-500">
            New to Zahi?{" "}
            <Link to="/register" className="font-extrabold text-gray-950 transition hover:text-orange-600">
              Create account
            </Link>
          </p>
        </motion.section>
      </motion.div>
    </main>
  );
};

export default LoginPage;
