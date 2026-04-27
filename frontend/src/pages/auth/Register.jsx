import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from "react-icons/hi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import api from "../../lib/axios";
import toast from "react-hot-toast";

const workspaceHighlights = [
  { label: "Fast setup", value: "Create your workspace in minutes" },
  { label: "One system", value: "Bookings, teams, and operations together" },
  { label: "AI ready", value: "Assistants and automation built in" },
  { label: "Multi-tenant", value: "Made for growing hospitality brands" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.62,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        username,
        email,
        password,
        confirm_password: confirmPassword,
        role: "business_admin",
      });

      if (response.status === 200 || response.status === 201) {
        toast.success("Account created successfully! Check your email for OTP.");
        navigate("/verify-otp", { state: { email } });
      }
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        let errorMessage = "Registration failed";

        if (typeof data === "string") {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === "object") {
          const firstValue = Object.values(data)[0];
          if (Array.isArray(firstValue)) {
            errorMessage = firstValue[0];
          } else {
            errorMessage = firstValue;
          }
        }
        setError(errorMessage);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#FDFCFB] text-[#333333] font-sans">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-6rem] top-[-4rem] h-56 w-56 rounded-full bg-[#EADFD3] blur-3xl"
        animate={{ x: [0, 20, -10, 0], y: [0, 12, -14, 0], scale: [1, 1.06, 0.98, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-5rem] right-[-4rem] h-64 w-64 rounded-full bg-[#F3EADF] blur-3xl"
        animate={{ x: [0, -16, 14, 0], y: [0, -18, 10, 0], scale: [1, 0.97, 1.04, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-[#F2F0ED] border-r border-[#E5E5E5]"
      >
        <motion.div variants={fadeUp} custom={0.02} className="relative z-10 flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center shadow-sm"
            initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, rotate: -4 }}
          >
            <span className="text-xl font-bold text-white font-serif">Z</span>
          </motion.div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1A1A1A]">
            Zahi Connect
          </h1>
        </motion.div>

        <div className="relative z-10 max-w-lg mb-16">
          <motion.h2
            variants={fadeUp}
            custom={0.1}
            className="text-4xl sm:text-5xl font-serif font-semibold text-[#1A1A1A] mb-6 leading-tight"
          >
            Build Your Workspace <br /> Around Hospitality.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={0.18}
            className="text-[#666666] text-lg leading-relaxed mb-8"
          >
            Launch your business account, invite your team, and start managing hotels,
            restaurants, flights, and mobility from one calm, connected dashboard.
          </motion.p>

          <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2">
            {workspaceHighlights.map((item, index) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                custom={0.24 + index * 0.06}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-[#E4DED7] bg-white/70 p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888888]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#1A1A1A]">
                  {item.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#FFFFFF]"
      >
        <motion.div
          variants={fadeUp}
          custom={0.08}
          className="w-full max-w-md space-y-8"
        >
          <motion.div
            variants={fadeUp}
            custom={0.1}
            className="flex lg:hidden items-center justify-center gap-3 mb-8"
          >
            <motion.div
              className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center shadow-sm"
              initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-xl font-bold font-serif text-white">Z</span>
            </motion.div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1A1A1A]">
              Zahi Connect
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} custom={0.14} className="text-center lg:text-left">
            <h2 className="text-3xl font-serif font-semibold text-[#1A1A1A] mb-2">
              Create Account
            </h2>
            <p className="text-[#666666]">
              Start your business workspace and verify your email to continue.
            </p>
          </motion.div>

          <motion.form
            variants={stagger}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-4">
              <motion.div variants={fadeUp} custom={0.2} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineUser className="text-xl" />
                </div>
                <input
                  type="text"
                  placeholder="Business name or username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                  minLength={3}
                />
              </motion.div>

              <motion.div variants={fadeUp} custom={0.26} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineMail className="text-xl" />
                </div>
                <input
                  type="email"
                  placeholder="Business email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                />
              </motion.div>

              <motion.div variants={fadeUp} custom={0.32} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineLockClosed className="text-xl" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A0A0B0] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </motion.div>

              <motion.div variants={fadeUp} custom={0.38} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineLockClosed className="text-xl" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A0A0B0] hover:text-[#1A1A1A] transition-colors"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </motion.div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              variants={fadeUp}
              custom={0.44}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-[#EAE4DD] bg-[#FAF8F5] px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#888888]">
                Account setup
              </p>
              <p className="mt-2 text-sm leading-6 text-[#666666]">
                Use your business email. After registration, we&apos;ll send an OTP to verify the account.
              </p>
            </motion.div>

            <motion.p
              variants={fadeUp}
              custom={0.48}
              className="text-xs text-[#888888] leading-relaxed"
            >
              By registering, you agree to our terms of service and privacy policy.
            </motion.p>

            <motion.button
              variants={fadeUp}
              custom={0.54}
              type="submit"
              disabled={loading}
              whileHover={loading ? undefined : { y: -1, scale: 1.01 }}
              whileTap={loading ? undefined : { scale: 0.985 }}
              className="w-full py-3.5 rounded-xl text-white font-medium flex justify-center items-center bg-[#1A1A1A] hover:bg-[#333333] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-white rounded-full animate-spin"></div>
              ) : (
                "Create Account"
              )}
            </motion.button>
          </motion.form>

          <motion.p
            variants={fadeUp}
            custom={0.6}
            className="text-center text-sm text-[#666666] mt-8"
          >
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[#1A1A1A] hover:underline">
              Log in here
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
