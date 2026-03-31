import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineMail } from "react-icons/hi";
import api from "../../lib/axios";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/forgot-password", { email });
      if (response.status === 200) {
        toast.success("Password reset OTP sent to your email!");
        navigate("/reset-password", { state: { email } });
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to send reset link. Try again."
      );
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Password Reset</h2>
          <p className="text-[#A0A0B0]">
            Enter your email and we'll send you an OTP to reset your password.
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
              <HiOutlineMail className="text-xl" />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0F0F23] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-inner"
              required
            />
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
            {loading ? "Sending..." : "Send Reset OTP"}
          </button>
        </form>

        <div className="text-center mt-8 space-y-4">
          <Link to="/login" className="block text-sm font-medium text-[#6C5CE7] hover:text-[#8A7DF0] transition-colors hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
