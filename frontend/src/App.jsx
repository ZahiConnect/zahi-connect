import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api, { setAccessToken } from "./lib/axios";
import { logout, finishInitialLoad, setCredentials } from "./redux/authslice";
import { buildSessionUser } from "./lib/authSession";
import {
  getActiveWorkspaceRoute,
  getHomeRouteForUser,
  getWorkspaceLabel,
  hasWorkspaceAccess,
} from "./lib/workspace";

import LoadingScreen from "./components/LoadingScreen";
import WorkspaceModulePage from "./components/WorkspaceModulePage";
import LandingPage from "./pages/public/LandingPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyOtp from "./pages/auth/VerifyOtp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import DashboardLayout from "./layout/DashboardLayout";
import DashboardHome from "./pages/workspace/DashboardHome";
import ProfilePage from "./pages/workspace/ProfilePage";
import WorkspaceSelectPage from "./pages/workspace/WorkspaceSelectPage";
import Kitchen from "./pages/restaurant/Kitchen";
import Menu from "./pages/restaurant/Menu";
import Orders from "./pages/restaurant/Orders";
import Tables from "./pages/restaurant/Tables";
import Inventory from "./pages/restaurant/Inventory";
import Attender from "./pages/restaurant/Attender";
import Accountant from "./pages/restaurant/Accountant";
import RestaurantReports from "./pages/restaurant/Reports";
import RestaurantSettings from "./pages/restaurant/Settings";
import RestaurantSettingsGeneral from "./pages/restaurant/settings/General";
import RestaurantSettingsOperations from "./pages/restaurant/settings/Operations";
import RestaurantSettingsImages from "./pages/restaurant/settings/Images";
import HotelBookings from "./hotel/pages/Bookings";
import HotelConfig from "./hotel/pages/Config";
import HotelCalender from "./hotel/pages/Calender";
import HotelCustomers from "./hotel/pages/Customers";
import HotelSettings from "./hotel/pages/Settings";
import FlightBookings from "./flight/pages/Bookings";
import FlightConfig from "./flight/pages/Config";
import FlightCalender from "./flight/pages/Calender";
import FlightCustomers from "./flight/pages/Customers";
import FlightReports from "./flight/pages/Reports";
import FlightSettings from "./flight/pages/Settings";

const DelayedLoader = ({ isLoading }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout;
    if (isLoading) {
      timeout = setTimeout(() => {
        setShow(true);
      }, 200);
    } else {
      timeout = setTimeout(() => {
        setShow(false);
      }, 0);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <LoadingScreen />
    </div>
  );
};

const Unauthorized = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      dispatch(logout());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F1EA] px-4">
      <div className="max-w-xl rounded-[32px] border border-[#E7DCCE] bg-white p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Workspace locked</p>
        <h1 className="mt-4 text-4xl font-serif text-[#1F1A17]">This account does not have an active paid workspace.</h1>
        <p className="mt-4 text-base leading-7 text-[#625446]">
          Zahi dashboards are reserved for business owners and paid team members. Choose a plan or
          sign in with the workspace owner account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#35281F]"
          >
            Explore plans
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex rounded-full border border-[#D8CBBB] px-5 py-3 text-sm font-semibold text-[#3A2C21] transition-colors hover:bg-[#FBF6F0]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type === "restaurant" || user?.role === "super_admin") {
    return <RestaurantReports />;
  }

  if (user?.business_type === "flight") {
    return <FlightReports />;
  }

  return (
    <WorkspaceModulePage
      eyebrow="Insight layer"
      title={`${getWorkspaceLabel(user?.business_type)} reports are staged here.`}
      description="Revenue snapshots, service trends, and team performance can live in this reporting layer once your next sprint starts filling these modules with live data."
      primaryLabel="Reporting shell ready"
      secondaryLabel={user?.plan ? `Plan: ${user.plan}` : "Plan-aware routing"}
      highlights={[
        {
          kicker: "Owner snapshot",
          title: "Daily business pulse",
          body: "Summaries for orders, bookings, or flight volumes can sit here depending on the business type.",
        },
        {
          kicker: "Team lens",
          title: "Operational accountability",
          body: "Staff efficiency, driver response time, or booking throughput can plug into the same report shell later.",
        },
        {
          kicker: "Growth layer",
          title: "Module expansion path",
          body: "This page is intentionally generic so future modules can reuse the same paid workspace structure.",
        },
      ]}
    />
  );
};

const WorkspaceSettingsPage = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type === "restaurant" || user?.role === "super_admin") {
    return <RestaurantSettings />;
  }

  if (user?.business_type === "hotel") {
    return <HotelSettings />;
  }

  if (user?.business_type === "flight") {
    return <FlightSettings />;
  }

  return (
    <WorkspaceModulePage
      eyebrow="Settings shell"
      title={`${getWorkspaceLabel(user?.business_type)} settings are staged here.`}
      description="Business details, branding, and operational defaults can plug into this same settings surface once the next module is ready."
      primaryLabel="Settings shell"
      secondaryLabel="Shared workspace pattern"
      highlights={[
        {
          kicker: "Identity",
          title: "Business basics",
          body: "Business name, contacts, and public-facing defaults can all live in one owner-managed settings layer.",
        },
        {
          kicker: "Media",
          title: "Brand assets",
          body: "Logos, cover images, and gallery media can reuse the same upload pattern across future workspaces.",
        },
        {
          kicker: "Operations",
          title: "Default controls",
          body: "Hours, service modes, and availability rules can plug into this view as the workspace matures.",
        },
      ]}
    />
  );
};

const PublicRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (isAuthenticated && hasWorkspaceAccess(user)) {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }
  return <Outlet />;
};

const RoleRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasWorkspaceAccess(user)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

const HotelWorkspaceRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type !== "hotel") {
    return <Navigate to={getActiveWorkspaceRoute(user)} replace />;
  }

  return <Outlet />;
};

const FlightWorkspaceRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type !== "flight") {
    return <Navigate to={getActiveWorkspaceRoute(user)} replace />;
  }

  return <Outlet />;
};

const RestaurantWorkspaceRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type !== "restaurant" && user?.role !== "super_admin") {
    return <Navigate to={getActiveWorkspaceRoute(user)} replace />;
  }

  return <Outlet />;
};

function App() {
  const dispatch = useDispatch();
  const { loading, loadingCount } = useSelector((state) => state.auth);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.post("/auth/token/refresh");
        setAccessToken(response.data.access);
        dispatch(
          setCredentials({
            user: buildSessionUser(response.data.user),
            accessToken: response.data.access,
          })
        );
      } catch {
        dispatch(logout());
      } finally {
        dispatch(finishInitialLoad());
      }
    };

    checkAuth();
  }, [dispatch]);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <DelayedLoader isLoading={loadingCount > 0} />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RoleRoute />}>
          <Route path="/workspace-select" element={<WorkspaceSelectPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/menu" element={<Menu />} />
            <Route path="/dashboard/orders" element={<Orders />} />
            <Route path="/dashboard/kitchen" element={<Kitchen />} />
            <Route path="/dashboard/attender" element={<Attender />} />
            <Route path="/dashboard/accountant" element={<Accountant />} />
            <Route path="/dashboard/tables" element={<Tables />} />
            <Route path="/dashboard/inventory" element={<Inventory />} />
            <Route path="/dashboard/settings" element={<WorkspaceSettingsPage />} />
            <Route element={<RestaurantWorkspaceRoute />}>
              <Route path="/dashboard/settings/general" element={<RestaurantSettingsGeneral />} />
              <Route
                path="/dashboard/settings/operations"
                element={<RestaurantSettingsOperations />}
              />
              <Route path="/dashboard/settings/images" element={<RestaurantSettingsImages />} />
            </Route>
            <Route element={<HotelWorkspaceRoute />}>
              <Route path="/dashboard/bookings" element={<HotelBookings />} />
              <Route path="/dashboard/rooms" element={<HotelConfig />} />
              <Route path="/dashboard/pricing" element={<HotelCalender />} />
              <Route path="/dashboard/guests" element={<HotelCustomers />} />
            </Route>
            <Route element={<FlightWorkspaceRoute />}>
              <Route path="/dashboard/flight-bookings" element={<FlightBookings />} />
              <Route path="/dashboard/flight-schedule" element={<FlightConfig />} />
              <Route path="/dashboard/flight-pricing" element={<FlightCalender />} />
              <Route path="/dashboard/flight-passengers" element={<FlightCustomers />} />
            </Route>
            <Route
              path="/dashboard/rides"
              element={
                <WorkspaceModulePage
                  eyebrow="Ride queue"
                  title="Live ride requests can appear here as your mobility layer grows."
                  description="The current structure gives you the paid dispatch shell now, without pretending you already built a full Uber clone."
                  primaryLabel="Dispatch shell"
                  secondaryLabel="WhatsApp-triggered demand"
                  highlights={[
                    {
                      kicker: "Incoming demand",
                      title: "Pickup board",
                      body: "User ride intents from WhatsApp or the site can land here first for assignment.",
                    },
                    {
                      kicker: "Driver actions",
                      title: "Accept or assign",
                      body: "This screen can become the operator view for owner-side or driver-side acceptance flows.",
                    },
                    {
                      kicker: "Local focus",
                      title: "Built for small fleets",
                      body: "The goal is a clean local dispatch system, not a nationwide mobility network on day one.",
                    },
                  ]}
                />
              }
            />
            <Route
              path="/dashboard/drivers"
              element={
                <WorkspaceModulePage
                  eyebrow="Driver roster"
                  title="Manage driver availability, status, and contact visibility from one place."
                  description="This shell lets the mobility plan feel real now while you build deeper assignment logic later."
                  primaryLabel="Driver management"
                  secondaryLabel="Fleet team layer"
                  highlights={[
                    {
                      kicker: "Availability",
                      title: "Who is online",
                      body: "Owners can later filter active, offline, and in-trip drivers from this board.",
                    },
                    {
                      kicker: "Operations",
                      title: "Contact and coverage",
                      body: "Phone, zone, shift, and trip state can all be surfaced here.",
                    },
                    {
                      kicker: "Future alerting",
                      title: "Popup dispatch",
                      body: "This is the right route for real-time driver notifications when you connect that next.",
                    },
                  ]}
                />
              }
            />
            <Route
              path="/dashboard/fleet"
              element={
                <WorkspaceModulePage
                  eyebrow="Vehicle board"
                  title="Keep vehicles, categories, and operational notes in one fleet shell."
                  description="This is where autos, cabs, and small transport partners can manage their listed vehicles."
                  primaryLabel="Fleet overview"
                  secondaryLabel="Mobility owner panel"
                  highlights={[
                    {
                      kicker: "Vehicle listing",
                      title: "Fleet registry",
                      body: "Track plate number, capacity, and status without overengineering the first release.",
                    },
                    {
                      kicker: "Owner view",
                      title: "Readiness checks",
                      body: "Maintenance, active duty, and unavailable states can fit here naturally later.",
                    },
                    {
                      kicker: "Expansion",
                      title: "Dispatch-friendly data",
                      body: "This route sets you up for future matching and assignment logic without changing layout later.",
                    },
                  ]}
                />
              }
            />
            <Route path="/dashboard/reports" element={<ReportsPage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/upgrade" element={<Navigate to="/workspace-select" replace />} />
          </Route>
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<div className="p-8 text-[#1F1A17]">404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
