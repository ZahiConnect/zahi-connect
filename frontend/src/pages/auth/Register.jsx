import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from "react-icons/hi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import api from "../../lib/axios";
import toast from "react-hot-toast";

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
    <div className="flex min-h-screen bg-[#0F0F23] text-[#E8E8F0] font-sans">
      
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] to-[#0F0F23] border-r border-[#2A2A40]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#6C5CE7]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00B894]/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#6C5CE7] to-[#8A7DF0] flex items-center justify-center shadow-lg shadow-[#6C5CE7]/20">
            <span className="text-xl font-bold text-white">Z</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Zahi Connect</h1>
        </div>

        <div className="relative z-10 max-w-lg mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
            Join the Ecosystem.
          </h2>
          <p className="text-[#A0A0B0] text-lg leading-relaxed mb-8">
            Set up your organization in minutes. From boutique hotels to multi-chain restaurants, 
            everything you need is right here.
          </p>
          
          <div className="space-y-4">
            {['Unified AI Assistants', 'Real-time Analytics', 'Multi-tenant Ready'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#6C5CE7] to-[#00B894] flex items-center justify-center text-xs text-white">✓</div>
                <span className="text-[#E8E8F0] font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6C5CE7] to-[#00B894] lg:hidden"></div>

        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#6C5CE7] to-[#8A7DF0] flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">Z</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Zahi Connect</h1>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-[#A0A0B0]">Start managing your business effortlessly.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
                  <HiOutlineUser className="text-xl" />
                </div>
                <input
                  type="text"
                  placeholder="Username (e.g., your business name)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-input"
                  required
                  minLength={3}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
                  <HiOutlineMail className="text-xl" />
                </div>
                <input
                  type="email"
                  placeholder="Business Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-input"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
                  <HiOutlineLockClosed className="text-xl" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-input"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A0A0B0] hover:text-white transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
                  <HiOutlineLockClosed className="text-xl" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-input"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A0A0B0] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <p className="text-xs text-[#A0A0B0] leading-relaxed">
              By registering, you agree to our{" "}
              <span className="text-[#6C5CE7] hover:underline cursor-pointer">Terms of Service</span>{" "}
              and{" "}
              <span className="text-[#6C5CE7] hover:underline cursor-pointer">Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold flex justify-center items-center bg-gradient-to-r from-[#6C5CE7] to-[#8A7DF0] hover:from-[#5b4cc2] hover:to-[#6C5CE7] shadow-lg shadow-[#6C5CE7]/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6C5CE7] focus:ring-offset-[#0F0F23] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#A0A0B0] mt-8">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#6C5CE7] hover:text-[#8A7DF0] transition-colors hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
