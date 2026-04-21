import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiLogOut, FiUser, FiMapPin, FiArrowRight } from "react-icons/fi";
import { MdOutlineHotel, MdOutlineRestaurant, MdOutlineLocalTaxi, MdOutlineFlight } from "react-icons/md";
import { BiRestaurant } from "react-icons/bi";

import { useAuth } from "./context/AuthContext";
import AccountPage from "./pages/AccountPage";
import useCustomerLocation from "./hooks/useCustomerLocation";
import CabsPage from "./pages/CabsPage";
import FlightsPage from "./pages/FlightsPage";
import HomePage from "./pages/HomePage";
import HotelDetailPage from "./pages/HotelDetailPage";
import HotelsPage from "./pages/HotelsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyOtpPage from "./pages/auth/VerifyOtpPage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import RestaurantsPage from "./pages/RestaurantsPage";

const navItems = [
  { to: "/hotels", label: "Hotels", icon: MdOutlineHotel },
  { to: "/restaurants", label: "Food", icon: MdOutlineRestaurant },
  { to: "/cabs", label: "Cabs", icon: MdOutlineLocalTaxi },
  { to: "/flights", label: "Flights", icon: MdOutlineFlight },
];

const LoadingSplash = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="glass-panel w-full max-w-md rounded-[36px] px-8 py-12 text-center fade-in">
      <p className="text-xs uppercase tracking-[0.32em] text-[#c15d1f]">Zahi Trips</p>
      <h1 className="font-display mt-4 text-5xl text-[#1c1712]">Getting everything ready for you&hellip;</h1>
      <div className="mx-auto mt-8 h-2 w-44 overflow-hidden rounded-full bg-[#f1dcc4]">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#d66a2f]" />
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSplash />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSplash />;
  if (isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  return children;
};

const LocationBadge = () => {
  const { locationLabel, status, requestLocation } = useCustomerLocation(true);

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium tracking-wide">
        <FiMapPin className="animate-pulse" /> Locating...
      </span>
    );
  }

  if (status === "ready" && locationLabel) {
    return (
      <span title={locationLabel} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold max-w-[200px] truncate border border-gray-200">
        <FiMapPin className="text-orange-500 shrink-0" />
        <span className="truncate">{locationLabel}</span>
      </span>
    );
  }

  if (status === "unsupported") return null;

  return (
    <button
      onClick={requestLocation}
      className="inline-flex items-center gap-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
    >
      <FiMapPin /> Enable location
    </button>
  );
};

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = useMemo(() => (user?.username || user?.email || "Z").slice(0, 2).toUpperCase(), [user]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo & Location */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                Z
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">Zahi</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-gray-200"></div>
            <div className="hidden sm:block"><LocationBadge /></div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-50/80 p-1 rounded-full border border-gray-100">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${isActive
                      ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                    }`
                  }
                >
                  <Icon className="text-lg" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-gray-50 p-1 pr-4 rounded-full border border-gray-100">
                <Link to="/account" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-9 h-9 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-xs">
                    {initials}
                  </div>
                  <span className="text-sm font-bold text-gray-700 max-w-[100px] truncate">
                    {user?.username?.split(" ")[0] || "Account"}
                  </span>
                </Link>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Logout">
                  <FiLogOut className="text-lg" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-5 py-2.5 font-bold text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="px-6 py-2.5 bg-gray-900 text-white hover:bg-black font-bold text-sm rounded-full shadow-lg shadow-gray-900/20 transition-all active:scale-95">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            {mobileOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <div className="pb-4 mb-2 border-b border-gray-100"><LocationBadge /></div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-4 rounded-2xl font-bold transition-colors ${isActive ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"
                      }`
                    }
                  >
                    <Icon className="text-xl" />
                    {item.label}
                  </NavLink>
                );
              })}

              <div className="pt-4 mt-2 border-t border-gray-100 grid gap-3">
                {isAuthenticated ? (
                  <>
                    <Link to="/account" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl font-bold text-gray-900">
                      <FiUser /> My Account
                    </Link>
                    <button onClick={async () => { setMobileOpen(false); await logout(); }} className="flex items-center justify-center gap-2 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors">
                      <FiLogOut /> Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-gray-900 text-white rounded-2xl font-bold shadow-md">
                      Get Started <FiArrowRight />
                    </Link>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-gray-50 text-gray-600 rounded-2xl font-bold">
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Footer = () => (
  <footer className="mt-20 border-t border-[rgba(87,62,39,0.08)]">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-[#67574a] sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
      <div>
        <p className="font-display text-4xl text-[#1f1812]">Your journey starts here.</p>
        <p className="mt-4 max-w-xl leading-7">
          Zahi Trips brings together hotels, restaurants, cabs, and flights in one seamless
          marketplace. Book confidently with real-time pricing and availability.
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#c15d1f]">Explore</p>
        <div className="mt-4 flex flex-col gap-3">
          <Link to="/hotels">Hotels</Link>
          <Link to="/restaurants">Restaurants</Link>
          <Link to="/cabs">Cabs</Link>
          <Link to="/flights">Flights</Link>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#c15d1f]">Account</p>
        <div className="mt-4 flex flex-col gap-3">
          <Link to="/account">My bookings</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  </footer>
);

const AppShell = () => (
  <div className="min-h-screen">
    <Header />
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const NotFoundPage = () => (
  <div className="glass-panel mx-auto max-w-2xl rounded-[36px] px-8 py-14 text-center">
    <p className="text-xs uppercase tracking-[0.32em] text-[#c15d1f]">Page not found</p>
    <h1 className="font-display mt-4 text-6xl text-[#1f1812]">This page doesn&apos;t exist.</h1>
    <p className="mt-4 text-[#67574a]">
      The link may have changed or the page has been removed. Head back home to continue browsing
      hotels, restaurants, and more.
    </p>
    <Link
      to="/"
      className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-medium text-white"
    >
      Back to home
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/hotels/:slug" element={<HotelDetailPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:slug" element={<RestaurantDetailPage />} />
          <Route path="/cabs" element={<CabsPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/verify-otp"
          element={
            <PublicOnlyRoute>
              <VerifyOtpPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
