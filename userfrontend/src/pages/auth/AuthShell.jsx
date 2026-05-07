import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import ZahiLogo from "../../components/ZahiLogo";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const AuthShell = ({ children, footer }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-8 sm:px-4 sm:py-10">
    {/* Ambient background */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[-6rem] top-0 h-[18rem] w-[24rem] rounded-full bg-gradient-to-b from-indigo-50/50 to-transparent blur-3xl sm:left-1/4 sm:h-[400px] sm:w-[600px]" />
      <div className="absolute bottom-0 right-[-8rem] h-[18rem] w-[22rem] rounded-full bg-gradient-to-t from-orange-50/40 to-transparent blur-3xl sm:right-1/4 sm:h-[400px] sm:w-[400px]" />
    </div>

    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="relative w-full max-w-[440px] mx-auto"
    >
      {/* Logo & back */}
      <motion.div variants={fadeUp} className="mb-8 flex items-center justify-between sm:mb-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <ZahiLogo
            label="Zahi"
            markClassName="h-11 w-11 rounded-2xl shadow-lg shadow-gray-900/10 transition-transform group-hover:scale-105"
          />
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
        className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8"
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
