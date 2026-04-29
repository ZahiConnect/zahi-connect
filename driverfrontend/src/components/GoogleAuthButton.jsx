import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import mobilityService from "../services/mobilityService";

// Google "G" SVG icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GoogleAuthButton = ({ mode = "signin", label }) => {
  const [loading, setLoading] = useState(false);
  const { applySession } = useAuth();
  const navigate = useNavigate();

  const defaultLabel = mode === "signin" ? "Continue with Google" : "Sign up with Google";

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      if (!tokenResponse.access_token) {
        throw new Error("Google did not return an access token.");
      }

      const result = await mobilityService.googleAuth(tokenResponse.access_token);
      applySession({ access: result.access, driver: result.driver });

      if (result.is_new) {
        toast.success("Account created! Please complete your profile.", { duration: 5000 });
        navigate("/dashboard/profile");
      } else {
        toast.success(`Welcome back, ${result.driver.full_name?.split(" ")[0]}!`);
        navigate("/dashboard");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Google sign-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error("Google sign-in was cancelled or failed."),
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-zinc-900 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] disabled:opacity-60 shadow-sm"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-[#18181b] rounded-full animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {loading ? "Connecting..." : (label || defaultLabel)}
    </button>
  );
};

export default GoogleAuthButton;
