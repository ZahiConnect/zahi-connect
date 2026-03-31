import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { HiOutlineLockClosed } from "react-icons/hi";
import api from "../../lib/axios";
import toast from "react-hot-toast";

const ResetPassword = () => {
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const location = useLocation();
    const navigate = useNavigate();
    
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (otp.length !== 6) {
            setError("OTP must be exactly 6 digits");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/auth/reset-password", {
                email,
                otp,
                new_password: newPassword,
                confirm_password: confirmPassword
            });

            if (response.status === 200) {
                toast.success("Password reset successfully! You can now login.");
                navigate("/login");
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F0F23] px-4 font-sans relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6C5CE7]/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-md w-full bg-[#1A1A2E] border border-[#2A2A40] p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[#6C5CE7] to-[#8A7DF0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6C5CE7]/30 mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Create New Password</h2>
                    <p className="text-sm text-[#A0A0B0]">
                        Enter the 6-digit OTP sent to <br />
                        <span className="font-semibold text-white">{email}</span>
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="text"
                            maxLength="6"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only numbers
                            className="w-full px-4 py-4 text-center tracking-[0.75em] text-xl font-bold rounded-xl bg-[#0F0F23] border border-[#2A2A40] text-white focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] transition-all shadow-inner placeholder:tracking-normal placeholder:font-normal placeholder:text-base placeholder:text-[#A0A0B0]"
                            placeholder="6-Digit OTP"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A0A0B0] group-focus-within:text-[#6C5CE7] transition-colors">
                            <HiOutlineLockClosed className="text-xl" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#0F0F23] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-inner"
                            placeholder="New Password"
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
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#0F0F23] border border-[#2A2A40] text-white placeholder-[#A0A0B0] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent transition-all shadow-inner"
                            placeholder="Confirm New Password"
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

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl text-white font-semibold flex justify-center items-center bg-gradient-to-r from-[#6C5CE7] to-[#8A7DF0] hover:from-[#5b4cc2] hover:to-[#6C5CE7] shadow-lg shadow-[#6C5CE7]/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6C5CE7] focus:ring-offset-[#0F0F23] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </div>
                </form>

                <div className="text-center mt-8">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-[#A0A0B0] hover:text-white transition-colors"
                    >
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
