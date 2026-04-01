import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Compass, Hotel, LogOut, Menu, Store, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "./context/AuthContext";
import AccountPage from "./pages/AccountPage";
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
  { to: "/", label: "Discover", icon: Compass },
  { to: "/restaurants", label: "Restaurants", icon: Store },
  { to: "/hotels", label: "Hotels", icon: Hotel },
];

const LoadingSplash = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="glass-panel w-full max-w-md rounded-[32px] px-8 py-12 text-center fade-in">
      <p className="text-xs uppercase tracking-[0.28em] text-[#a6633b]">Zahi Connect</p>
      <h1 className="font-display mt-4 text-5xl text-[#1f1812]">Loading your trip board</h1>
      <div className="mx-auto mt-8 h-2 w-40 overflow-hidden rounded-full bg-[#eedfce]">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#d56d2e]" />
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSplash />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = useMemo(
    () => (user?.username || user?.email || "Z").slice(0, 2).toUpperCase(),
    [user]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(96,73,53,0.08)] bg-[rgba(255,249,240,0.8)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1812] text-lg font-bold text-white shadow-[0_12px_30px_rgba(31,24,18,0.18)]">
            Z
          </div>
          <div>
            <p className="font-display text-2xl text-[#1f1812]">Zahi Connect</p>
            <p className="text-xs uppercase tracking-[0.24em] text-[#876c56]">User Frontend</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#1f1812] text-white"
                    : "text-[#5d4d40] hover:bg-white/70 hover:text-[#1f1812]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/account"
                className="inline-flex items-center gap-3 rounded-full bg-white px-3 py-2 text-sm font-medium text-[#1f1812] shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4e5d4] text-xs font-bold">
                  {initials}
                </span>
                <span>{user?.username || user?.email}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,73,53,0.16)] px-4 py-2 text-sm font-medium text-[#5d4d40] hover:bg-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-[rgba(96,73,53,0.16)] px-4 py-2 text-sm font-medium text-[#5d4d40] hover:bg-white"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[#1f1812] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_30px_rgba(31,24,18,0.12)]"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(96,73,53,0.14)] text-[#1f1812] md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[rgba(96,73,53,0.08)] bg-[rgba(255,249,240,0.94)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                      isActive ? "bg-[#1f1812] text-white" : "bg-white/80 text-[#1f1812]"
                    }`
                  }
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
                  className="inline-flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-[#1f1812]"
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
                  className="inline-flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-[#1f1812]"
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
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-[#1f1812]"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl bg-[#1f1812] px-4 py-3 text-sm font-medium text-white"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const Footer = () => (
  <footer className="mt-16 border-t border-[rgba(96,73,53,0.08)]">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-[#6a5f56] sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
      <div>
        <p className="font-display text-3xl text-[#1f1812]">One number. Many local services.</p>
        <p className="mt-3 max-w-xl leading-7">
          This demo customer site shows how Zahi Connect can surface restaurants and hotels from
          live owner dashboards while cabs and flights stay staged for the next sprint.
        </p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.22em] text-[#a6633b]">Explore</p>
        <div className="mt-4 flex flex-col gap-3">
          <Link to="/restaurants">Browse restaurants</Link>
          <Link to="/hotels">Browse hotels</Link>
          <Link to="/account">Your account</Link>
        </div>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.22em] text-[#a6633b]">Roadmap</p>
        <div className="mt-4 flex flex-col gap-3">
          <span>Cabs: coming soon</span>
          <span>Flights: coming soon</span>
          <span>WhatsApp super bot: next layer</span>
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
  <div className="glass-panel mx-auto max-w-2xl rounded-[32px] px-8 py-12 text-center">
    <p className="text-xs uppercase tracking-[0.28em] text-[#a6633b]">Lost the thread</p>
    <h1 className="font-display mt-4 text-5xl text-[#1f1812]">This page is not on the route map.</h1>
    <p className="mt-4 text-[#6a5f56]">
      Jump back to the main discovery board and continue exploring restaurants and hotels.
    </p>
    <Link
      to="/"
      className="mt-8 inline-flex rounded-full bg-[#1f1812] px-5 py-3 text-sm font-medium text-white"
    >
      Back to home
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:slug" element={<RestaurantDetailPage />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/hotels/:slug" element={<HotelDetailPage />} />
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
