import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { HiOutlineMail } from "react-icons/hi";
import api, { setAccessToken } from "../../lib/axios";
import { setCredentials } from "../../redux/authslice";
import toast from "react-hot-toast";
import { buildSessionUser } from "../../lib/authSession";
import { clearPurchaseIntent, getPurchaseIntent } from "../../lib/purchaseIntent";
import { getHomeRouteForUser } from "../../lib/workspace";

const verificationHighlights = [
  { label: "Secure sign in", value: "Your workspace opens after email verification." },
  { label: "One inbox", value: "Use the same business email across Zahi Connect." },
  { label: "Almost there", value: "Enter the six digits and continue to your dashboard." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
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

const VerifyOtp = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const inputRefs = useRef([]);

  const email = location.state?.email || localStorage.getItem("otp_email");

  useEffect(() => {
    if (!email) {
      toast.error("No email found. Please login again.");
      navigate("/login");
    }
  }, [email, navigate]);

  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split("");
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6) newOtp[index + i] = pastedData[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      toast.success("OTP resent successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/verify-otp", {
        email,
        otp: otpString,
      });

      setAccessToken(response.data.access);
      const user = buildSessionUser(response.data);
      dispatch(
        setCredentials({
          user,
          accessToken: response.data.access,
        })
      );

      localStorage.removeItem("otp_email");
      toast.success("Account verified successfully!");
      const pendingPlan = getPurchaseIntent();
      if (pendingPlan) {
        navigate("/", { state: { openPlanCode: pendingPlan } });
        return;
      }
      clearPurchaseIntent();
      navigate(getHomeRouteForUser(user));
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
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
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
            Confirm Your Email <br /> Before You Continue.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={0.18}
            className="text-[#666666] text-lg leading-relaxed mb-8"
          >
            This final check keeps your business workspace connected to the right inbox.
          </motion.p>

          <motion.div variants={stagger} className="grid gap-4">
            {verificationHighlights.map((item, index) => (
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
        <motion.div variants={fadeUp} custom={0.08} className="w-full max-w-md space-y-8">
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
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EAE4DD] bg-[#FAF8F5] text-[#1A1A1A] shadow-sm lg:mx-0">
              <HiOutlineMail className="text-2xl" />
            </div>
            <h2 className="text-3xl font-serif font-semibold text-[#1A1A1A] mb-2">
              Check Your Email
            </h2>
            <p className="text-[#666666]">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-[#1A1A1A]">{email}</span>
            </p>
          </motion.div>

          <motion.form variants={stagger} className="space-y-6" onSubmit={handleSubmit}>
            <motion.div variants={fadeUp} custom={0.2} className="grid grid-cols-6 gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`OTP digit ${index + 1}`}
                  maxLength="6"
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-full rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] text-center text-xl font-bold text-[#1A1A1A] shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] sm:h-14 sm:text-2xl"
                />
              ))}
            </motion.div>

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

            <motion.button
              variants={fadeUp}
              custom={0.26}
              type="submit"
              disabled={loading}
              whileHover={loading ? undefined : { y: -1, scale: 1.01 }}
              whileTap={loading ? undefined : { scale: 0.985 }}
              className="w-full py-3.5 rounded-xl text-white font-medium flex justify-center items-center bg-[#1A1A1A] hover:bg-[#333333] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-white rounded-full animate-spin"></div>
              ) : (
                "Verify Account"
              )}
            </motion.button>
          </motion.form>

          <motion.div variants={fadeUp} custom={0.32} className="text-center space-y-4">
            <p className="text-sm text-[#666666]">
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-[#1A1A1A] underline decoration-transparent transition-all hover:decoration-[#1A1A1A] disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend code"}
              </button>
            </p>
            <Link to="/login" className="block text-sm font-medium text-[#666666] hover:text-[#1A1A1A] hover:underline">
              Back to login
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
