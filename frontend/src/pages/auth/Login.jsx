import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../redux/authslice";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineMail, HiOutlineLockClosed } from "react-icons/hi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import api, { setAccessToken } from "../../lib/axios";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { buildSessionUser } from "../../lib/authSession";
import { clearPurchaseIntent, getPurchaseIntent } from "../../lib/purchaseIntent";
import { getHomeRouteForUser } from "../../lib/workspace";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setError("");
        const response = await api.post("/auth/google-login", {
          token: tokenResponse.access_token,
        });

        const data = response.data;

        if (data.requires_otp) {
          localStorage.setItem("otp_email", data.email);
          navigate("/verify-otp", {
            state: { email: data.email, role: data.role },
          });
          return;
        }

        setAccessToken(data.access);
        const user = buildSessionUser(data);
        dispatch(
          setCredentials({
            accessToken: data.access,
            user,
          })
        );
        toast.success("Login successful!");
        const pendingPlan = getPurchaseIntent();
        if (pendingPlan) {
          navigate("/", { state: { openPlanCode: pendingPlan } });
          return;
        }
        clearPurchaseIntent();
        navigate(getHomeRouteForUser(user));
      } catch (err) {
        setError(
          err.response?.data?.detail || err.response?.data?.error || "Google Login Failed"
        );
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google Login Failed"),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: email,
        password,
      });

      const data = response.data;

      setAccessToken(data.access);
      const user = buildSessionUser(data);
      dispatch(
        setCredentials({
          accessToken: data.access,
          user,
        })
      );
      toast.success("Welcome back to Zahi Connect!");
      const pendingPlan = getPurchaseIntent();
      if (pendingPlan) {
        navigate("/", { state: { openPlanCode: pendingPlan } });
        return;
      }
      clearPurchaseIntent();
      navigate(getHomeRouteForUser(user));
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.detail?.includes("verify")) {
        // Handle unverified user
        localStorage.setItem("otp_email", email);
        navigate("/verify-otp", { state: { email } });
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-[#333333] font-sans">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-[#F2F0ED] border-r border-[#E5E5E5]">
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center shadow-sm">
            <span className="text-xl font-bold text-white font-serif">Z</span>
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1A1A1A]">
            Zahi Connect
          </h1>
        </div>

        <div className="relative z-10 max-w-lg mb-16">
          <h2 className="text-4xl sm:text-5xl font-serif font-semibold text-[#1A1A1A] mb-6 leading-tight">
            The Intelligent ERP <br /> for Modern Hospitality.
          </h2>
          <p className="text-[#666666] text-lg leading-relaxed mb-8">
            Manage your restaurant, track live KOTs, and automate guest 
            conversations with our AI-driven ecosystem.
          </p>
          
          <div className="flex gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#F2F0ED] bg-[#FFFFFF] flex items-center justify-center text-xs font-bold text-[#1A1A1A] shadow-sm">
                   U{i}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-semibold text-[#1A1A1A]">10k+ users</span>
              <span className="text-xs text-[#888888]">trust Zahi Connect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#FFFFFF]">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold font-serif text-white">Z</span>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1A1A1A]">
              Zahi Connect
            </h1>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-serif font-semibold text-[#1A1A1A] mb-2">Welcome Back</h2>
            <p className="text-[#666666]">Sign in to your account to continue</p>
          </div>

          <button
            type="button"
            onClick={() => googleLogin()}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] font-medium hover:bg-[#F9F9F9] transition-all shadow-sm"
          >
            <FcGoogle className="text-xl" />
            Sign in with Google
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-[#E5E5E5]"></div>
            <span className="flex-shrink-0 mx-4 text-[#888888] text-sm">Or continue with email</span>
            <div className="flex-grow border-t border-[#E5E5E5]"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineMail className="text-xl" />
                </div>
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#1A1A1A] transition-colors">
                  <HiOutlineLockClosed className="text-xl" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#A0A0B0] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A0A0B0] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[#E5E5E5] bg-[#FFFFFF] text-[#1A1A1A] focus:ring-[#1A1A1A] focus:ring-offset-0" />
                <span className="text-sm text-[#666666]">Remember me</span>
              </label>
              
              <Link to="/forgot-password" className="text-sm font-medium text-[#666666] hover:text-[#1A1A1A] underline decoration-transparent hover:decoration-[#1A1A1A] transition-all">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-medium flex justify-center items-center bg-[#1A1A1A] hover:bg-[#333333] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A1A] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-white rounded-full animate-spin"></div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#666666] mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-[#1A1A1A] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
