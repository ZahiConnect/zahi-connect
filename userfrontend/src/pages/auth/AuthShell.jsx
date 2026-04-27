import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCheckCircle, FiClock, FiShield } from "react-icons/fi";

import { ThemeToggleButton } from "../../components/AccountMenu";

const sidePoints = [
  {
    icon: FiCheckCircle,
    title: "Bookings together",
    copy: "Keep stays, rides, meals, and flights easy to revisit.",
  },
  {
    icon: FiClock,
    title: "Faster next time",
    copy: "Saved details help you move from browsing to booking more quickly.",
  },
  {
    icon: FiShield,
    title: "Secure recovery",
    copy: "OTP and password reset stay in one simple flow.",
  },
];

const summaryChips = ["Bookings", "Payments", "Saved details"];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const AuthShell = ({ eyebrow, title, description, children, footer }) => (
  <div className="auth-shell relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[4%] top-[2%] h-56 w-56 rounded-full bg-orange-50 blur-[110px]" />
      <div className="absolute right-[7%] top-[10%] h-48 w-48 rounded-full bg-indigo-50 blur-[100px]" />
      <div className="absolute bottom-[8%] left-[14%] h-44 w-44 rounded-full bg-green-50 blur-[96px]" />
    </div>

    <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="auth-stage grid w-full gap-5 rounded-[42px] border p-3 shadow-[0_28px_90px_rgba(58,41,25,0.08)] sm:p-5 lg:grid-cols-[0.96fr_1.04fr] lg:p-6">
        <motion.aside
          initial="hidden"
          animate="show"
          className="auth-copy-panel hidden overflow-hidden rounded-[34px] border border-gray-100 p-8 shadow-sm lg:flex lg:min-h-[720px] lg:flex-col lg:justify-between xl:p-10"
        >
          <div>
            <motion.div variants={fadeUp} custom={0.03} className="flex items-center gap-3">
              <Link to="/" className="group inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-lg font-extrabold text-white shadow-sm transition-transform group-hover:scale-105">
                  Z
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-gray-900">Zahi</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">
                    Account
                  </p>
                </div>
              </Link>
            </motion.div>

            <div className="mt-14">
              <motion.p
                variants={fadeUp}
                custom={0.1}
                className="text-xs font-black uppercase tracking-[0.28em] text-orange-600"
              >
                Your Zahi account
              </motion.p>
              <motion.h1
                variants={fadeUp}
                custom={0.17}
                className="font-display mt-5 text-[4.1rem] leading-[0.95] text-gray-900"
              >
                Everything you book, in one calm place.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                custom={0.24}
                className="mt-6 max-w-xl text-base leading-8 text-gray-500"
              >
                Sign in once to keep bookings, payments, and saved details ready whenever you return.
              </motion.p>

              <motion.div variants={fadeUp} custom={0.31} className="mt-8 flex flex-wrap gap-3">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
                  >
                    {chip}
                  </span>
                ))}
              </motion.div>

              <div className="mt-8 grid gap-4">
                {sidePoints.map(({ icon: Icon, title: itemTitle, copy }, index) => (
                  <motion.div
                    key={itemTitle}
                    variants={fadeUp}
                    custom={0.38 + index * 0.07}
                    className="auth-info-card rounded-[26px] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                        <Icon className="text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{itemTitle}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-500">{copy}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            variants={fadeUp}
            custom={0.62}
            className="mt-10 rounded-[30px] bg-gray-900 p-6 text-white shadow-[0_22px_60px_rgba(31,24,18,0.2)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">
              Ready when you are
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              One sign in for browsing, checkout, and history.
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-300">
              Keep your activity and payment updates easy to find without jumping between screens.
            </p>
          </motion.div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="auth-form-panel rounded-[34px] border border-gray-100 p-4 shadow-sm sm:p-5 lg:p-6"
        >
          <div className="flex items-center justify-between gap-4 rounded-[26px] border border-gray-100 bg-white/92 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-5">
            <Link to="/" className="group inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-lg font-extrabold text-white shadow-sm transition-transform group-hover:scale-105">
                Z
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight text-gray-900">Zahi</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">
                  Account
                </p>
              </div>
            </Link>
            <ThemeToggleButton compact />
          </div>

          <div className="mt-5 rounded-[30px] border border-gray-100 bg-white/94 p-5 shadow-sm sm:p-6">
            {children}
          </div>

          {footer ? <div className="mt-5 text-sm text-gray-500">{footer}</div> : null}

          <div className="mt-6 lg:hidden">
            <div className="rounded-[24px] border border-gray-100 bg-white/82 px-4 py-4 shadow-sm backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                {eyebrow}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/hotels"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
            >
              <FiArrowLeft className="text-[10px]" />
              Back to browsing
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  </div>
);

export default AuthShell;
