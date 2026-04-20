import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CarFront,
  Hotel,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

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
  { to: "/hotels", label: "Hotels", icon: Hotel },
  { to: "/restaurants", label: "Food", icon: Store },
  { to: "/cabs", label: "Cabs", icon: CarFront },
  { to: "/flights", label: "Flights", icon: Plane },
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
      <p className="mt-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-[#9c7f64]">
        <MapPin className="h-3.5 w-3.5" />
        Detecting location
      </p>
    );
  }

  if (status === "ready" && locationLabel) {
    return (
      <p
        title={locationLabel}
        className="mt-1 inline-flex max-w-[220px] items-center gap-1 rounded-full bg-[#f5e4d2] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8e4a1d]"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{locationLabel}</span>
      </p>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-[#9c7f64]">
        <MapPin className="h-3.5 w-3.5" />
        Location unavailable
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-[rgba(198,99,44,0.22)] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8e4a1d] transition hover:bg-[#fff8f1]"
    >
      <MapPin className="h-3.5 w-3.5" />
      Enable location
    </button>
  );
};

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = useMemo(
    () => (user?.username || user?.email || "Z").slice(0, 2).toUpperCase(),
    [user]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(87,62,39,0.08)] bg-[rgba(255,248,239,0.86)] backdrop-blur-xl">
      <div className="border-b border-[rgba(87,62,39,0.06)] bg-[#231a12] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/72 md:hidden">
            Hotels · Restaurants · Cabs · Flights
          </p>
          <div className="hidden grid-cols-[minmax(0,1.7fr)_auto_auto_auto] items-center gap-6 py-2.5 md:grid">
            <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-white/72 lg:text-xs">
              Discover hotels, dining, cabs, and flights in one place
            </p>
            <span className="whitespace-nowrap text-[11px] font-medium text-white/92 lg:text-xs">
              Verified properties
            </span>
            <span className="whitespace-nowrap text-[11px] font-medium text-white/92 lg:text-xs">
              Instant booking
            </span>
            <span className="whitespace-nowrap text-[11px] font-medium text-white/92 lg:text-xs">
              24 / 7 support
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1812] text-lg font-bold text-white shadow-[0_16px_32px_rgba(31,24,18,0.18)]">
            Z
          </div>
          <div>
            <p className="font-display text-3xl leading-none text-[#1c1712]">Zahi Trips</p>
            <LocationBadge />
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "border-[rgba(214,106,47,0.24)] bg-[#f5e4d2] text-[#1f1812] shadow-sm"
                      : "border-transparent text-[#5c4a3d] hover:border-[rgba(87,62,39,0.08)] hover:bg-white hover:text-[#1f1812]"
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? "#1f1812" : "#5c4a3d",
                })}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/account"
                className="inline-flex items-center gap-3 rounded-full bg-white px-3 py-2 text-sm font-medium text-[#1f1812] shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3dfca] text-xs font-bold">
                  {initials}
                </span>
                <span>{user?.username || user?.email}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(87,62,39,0.14)] px-4 py-2.5 text-sm font-medium text-[#5c4a3d] hover:bg-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-[rgba(87,62,39,0.14)] px-4 py-2.5 text-sm font-medium text-[#5c4a3d] hover:bg-white"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,99,44,0.22)] bg-[#c8632c] px-4 py-2.5 text-sm font-medium text-[#fffaf4] shadow-[0_16px_32px_rgba(104,47,18,0.16)] transition hover:bg-[#b95825]"
                style={{ color: "#fffaf4" }}
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(87,62,39,0.14)] text-[#1f1812] lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[rgba(87,62,39,0.08)] bg-[rgba(255,248,239,0.96)] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                      isActive
                        ? "border-[rgba(214,106,47,0.24)] bg-[#f5e4d2] text-[#1f1812]"
                        : "border-[rgba(87,62,39,0.08)] bg-white text-[#1f1812]"
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "#1f1812" : "#1f1812",
                  })}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#1f1812]"
                >
                  <UserRound className="h-4 w-4" />
                  Account
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                  }}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#1f1812]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#1f1812]"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl border border-[rgba(198,99,44,0.22)] bg-[#c8632c] px-4 py-3 text-sm font-medium text-[#fffaf4]"
                  style={{ color: "#fffaf4" }}
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
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
