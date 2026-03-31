import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api, { setAccessToken } from "../../lib/axios";
import { setCredentials } from "../../redux/authslice";
import toast from "react-hot-toast";
import { buildSessionUser } from "../../lib/authSession";
import { clearPurchaseIntent, getPurchaseIntent } from "../../lib/purchaseIntent";
import { getHomeRouteForUser } from "../../lib/workspace";

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
      // Re-trigger the registration endpoint which resends if user exists but is inactive
      await api.post("/auth/register", { 
        email, 
        username: "user", // The backend will ignore if user exists
        password: "temp_password", 
        confirm_password: "temp_password" 
      });
      toast.success("OTP resent successfully!");
    } catch (err) {
      if (err.response?.data?.message?.includes("New OTP sent")) {
        toast.success("OTP resent successfully!");
      } else {
        toast.error("Failed to resend OTP");
      }
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
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F23] px-4 font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6C5CE7]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#1A1A2E] border border-[#2A2A40] p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[#6C5CE7] to-[#8A7DF0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6C5CE7]/30 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-[#A0A0B0]">
            We've sent a 6-digit verification code to <br/>
            <span className="font-semibold text-white">{email}</span>
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="6"
                ref={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-[#0F0F23] border border-[#2A2A40] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-inner"
              />
            ))}
          </div>

          {error && (
             <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
               {error}
             </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-semibold flex justify-center items-center bg-gradient-to-r from-[#6C5CE7] to-[#8A7DF0] hover:from-[#5b4cc2] hover:to-[#6C5CE7] shadow-lg shadow-[#6C5CE7]/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6C5CE7] focus:ring-offset-[#0F0F23] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
          >
            {loading ? "Verifying..." : "Verify Account"}
          </button>
        </form>

        <div className="text-center mt-8 space-y-4">
          <p className="text-sm text-[#A0A0B0]">
            Didn't receive the code?{" "}
            <button 
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-[#6C5CE7] hover:text-[#8A7DF0] transition-colors disabled:opacity-50"
            >
              {resending ? "Sending..." : "Click to resend"}
            </button>
          </p>
          <Link to="/login" className="block text-sm text-[#A0A0B0] hover:text-white transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
