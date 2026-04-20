import { useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { CarFront, LogOut, Menu, X } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import DashboardShell from "./pages/dashboard/DashboardShell";
import OverviewPage from "./pages/dashboard/OverviewPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import VehiclePage from "./pages/dashboard/VehiclePage";
import RidesPage from "./pages/dashboard/RidesPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

const LoadingSplash = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="drive-panel w-full max-w-md rounded-[32px] px-8 py-12 text-center fade-in border border-slate-200">
      <div className="mx-auto w-16 h-16 bg-[#facc15] text-[#422006] flex items-center justify-center rounded-2xl mb-6 shadow-sm"><CarFront size={32}/></div>
      <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-[#09090b]">Initializing Command Center</h1>
      <div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#18181b]" />
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSplash />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSplash />;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#facc15] text-[#422006] transition-transform group-hover:scale-105 shadow-sm">
            <CarFront size={20} strokeWidth={2.5}/>
          </div>
          <div>
            <p className="font-display font-bold text-xl leading-none tracking-tight text-[#09090b]">Zahi Drive</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Operations
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-slate-100 text-[#09090b]" : "text-slate-500 hover:text-[#09090b]"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-slate-100 text-[#09090b]" : "text-slate-500 hover:text-[#09090b]"
              }`
            }
          >
            Dashboard
          </NavLink>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <div className="rounded-full bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                {user?.full_name || "Driver"}
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#facc15] px-5 py-2.5 text-sm font-semibold tracking-wide text-[#09090b] hover:bg-[#eab308] shadow-sm transition-all active:scale-95"
              >
                Register
                <CarFront className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden hover:bg-slate-50"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden shadow-lg absolute w-full">
          <div className="flex flex-col gap-2">
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Home
            </NavLink>
            <NavLink
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </NavLink>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={async () => {
                  setMobileOpen(false);
                  await logout();
                }}
                className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-[#18181b] px-4 py-3 text-sm font-bold text-white text-center"
                >
                  Register
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
  <footer className="mt-20 border-t border-slate-200 bg-white">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 text-sm text-slate-500 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
      <div>
        <p className="font-display text-4xl font-bold tracking-tight text-[#09090b]">Drive when you want.</p>
        <p className="mt-4 max-w-xl leading-7">
          Zahi Drive puts the wheel back in your hands. High-end tools to manage your cab documents, track rider receipts, and operate independently.
        </p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Portal</p>
        <div className="mt-6 flex flex-col gap-4">
          <Link to="/" className="hover:text-slate-900 transition-colors font-medium">Home</Link>
          <Link to="/dashboard" className="hover:text-slate-900 transition-colors font-medium">Dashboard</Link>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Access</p>
        <div className="mt-6 flex flex-col gap-4">
          <Link to="/register" className="hover:text-slate-900 transition-colors font-medium">Register</Link>
          <Link to="/login" className="hover:text-slate-900 transition-colors font-medium">Sign in</Link>
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
  <div className="drive-panel mx-auto max-w-xl rounded-[32px] px-8 py-16 text-center shadow-lg mt-12 bg-white">
    <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-600 flex items-center justify-center rounded-full mb-6">!</div>
    <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-[#09090b]">Route Terminated.</h1>
    <p className="mt-4 text-slate-500">
      Head back to the Zahi command center to continue your session.
    </p>
    <Link
      to="/"
      className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#facc15] px-6 py-3 text-sm font-semibold text-[#422006] hover:bg-[#eab308] transition-colors"
    >
      Back to HQ
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public shell with navbar + footer */}
        <Route element={<AppShell />}>
          <Route path="/" element={
            <PublicOnlyRoute>
              <LandingPage />
            </PublicOnlyRoute>
          } />
        </Route>

        {/* Dashboard — fullscreen sidebar layout, no navbar */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="vehicle" element={<VehiclePage />} />
          <Route path="rides" element={<RidesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Auth pages */}
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
