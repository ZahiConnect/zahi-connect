import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const AuthShell = ({ children, footer }) => (
  <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
    {/* Ambient background */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-indigo-50/50 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-orange-50/40 to-transparent rounded-full blur-3xl" />
    </div>

    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="relative w-full max-w-[440px] mx-auto"
    >
      {/* Logo & back */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg shadow-gray-900/10 group-hover:scale-105 transition-transform">
            Z
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">Zahi</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors bg-white/80 border border-gray-100 px-3 py-2 rounded-full shadow-sm"
        >
          <FiArrowLeft size={12} />
          Sign in
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-[32px] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] border border-gray-100 p-7 sm:p-8"
      >
        {children}
      </motion.div>

      {/* Footer */}
      {footer && (
        <motion.div variants={fadeUp} className="mt-6 text-center text-sm text-gray-400">
          {footer}
        </motion.div>
      )}
    </motion.div>
  </div>
);

export default AuthShell;
