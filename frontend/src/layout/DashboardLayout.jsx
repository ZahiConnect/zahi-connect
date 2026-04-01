import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/authslice";
import api from "../lib/axios";
import { clearPurchaseIntent } from "../lib/purchaseIntent";
import { getWorkspaceLabel } from "../lib/workspace";

import {
  HiOutlineArrowUp,
  HiOutlineBell,
  HiOutlineCash,
  HiOutlineChartPie,
  HiOutlineChevronDown,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineHome,
  HiOutlineLogout,
  HiOutlineMenuAlt2,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineViewGrid,
  HiOutlineArchive,
  HiOutlineX,
} from "react-icons/hi";
import { MdOutlineTableBar } from "react-icons/md";

const menuItemsByType = {
  restaurant: [
    { name: "Dashboard", path: "/dashboard", icon: HiOutlineHome },
    { name: "Menu", path: "/dashboard/menu", icon: HiOutlineViewGrid },
    { name: "Orders", path: "/dashboard/orders", icon: HiOutlineClipboardList },
    { name: "Kitchen", path: "/dashboard/kitchen", icon: HiOutlineClipboardList },
    { name: "Attender", path: "/dashboard/attender", icon: HiOutlineUsers },
    { name: "Accountant", path: "/dashboard/accountant", icon: HiOutlineCash },
    { name: "Tables", path: "/dashboard/tables", icon: MdOutlineTableBar },
    { name: "Inventory", path: "/dashboard/inventory", icon: HiOutlineArchive },
    { name: "Reports", path: "/dashboard/reports", icon: HiOutlineChartPie },
  ],
  hotel: [
    { name: "Dashboard", path: "/dashboard", icon: HiOutlineHome },
    { name: "Front Desk", path: "/dashboard/bookings", icon: HiOutlineClipboardList },
    { name: "Room Setup", path: "/dashboard/rooms", icon: HiOutlineViewGrid },
    { name: "Pricing", path: "/dashboard/pricing", icon: HiOutlineArchive },
    { name: "Guests", path: "/dashboard/guests", icon: HiOutlineUsers },
    { name: "Settings", path: "/dashboard/settings", icon: HiOutlineCog },
  ],
  mobility: [
    { name: "Dashboard", path: "/dashboard", icon: HiOutlineHome },
    { name: "Ride Requests", path: "/dashboard/rides", icon: HiOutlineClipboardList },
    { name: "Drivers", path: "/dashboard/drivers", icon: HiOutlineViewGrid },
    { name: "Fleet", path: "/dashboard/fleet", icon: HiOutlineArchive },
    { name: "Reports", path: "/dashboard/reports", icon: HiOutlineChartPie },
  ],
};

const extraPageTitles = {
  "/dashboard/profile": "Profile",
  "/dashboard/upgrade": "Upgrade",
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profileMenuRef = useRef(null);

  const businessType = user?.business_type || "restaurant";
  const isHotelWorkspace = businessType === "hotel";
  const menuItems = menuItemsByType[businessType] || menuItemsByType.restaurant;
  const activeTitle =
    menuItems.find((item) => item.path === location.pathname)?.name ||
    extraPageTitles[location.pathname] ||
    "Dashboard";
  const displayName = user?.tenant_name || user?.username || "Workspace";
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      clearPurchaseIntent();
      dispatch(logout());
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="flex h-screen bg-[#FDFCFB] font-sans text-[#333333]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#F2F0ED] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center font-serif text-2xl text-[#1A1A1A]">
              z
            </div>
            <h1 className="text-xl font-serif text-[#1A1A1A] tracking-tight">Zahi Connect</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#666666] hover:text-[#1A1A1A]"
          >
            <HiOutlineX className="text-2xl" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-[#E5E2DC] text-[#1A1A1A]"
                    : "text-[#666666] hover:bg-[#EAE7E1] hover:text-[#1A1A1A]"
                }`}
              >
                <Icon className={`text-lg ${isActive ? "text-[#1A1A1A]" : "text-[#888888]"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D6CBC0] bg-white px-4 py-3 text-sm font-semibold text-[#3A2C21] transition-colors hover:bg-[#FBF6F0]"
          >
            <HiOutlineLogout className="text-lg" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FDFCFB]">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 lg:px-10 z-30 bg-[#FDFCFB]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-[#666666] hover:bg-[#F2F0ED] hover:text-[#1A1A1A] transition-colors"
            >
              <HiOutlineMenuAlt2 className="text-2xl" />
            </button>
            <h2 className="text-2xl font-serif text-[#1A1A1A] tracking-tight hidden sm:block">
              {activeTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-[#666666] hover:text-[#1A1A1A] transition-colors rounded-full hover:bg-[#F2F0ED]">
              <HiOutlineBell className="text-xl" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#D97757] rounded-full border border-[#FDFCFB]"></span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-full border border-[#E6DBCF] bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:bg-[#FBF6F0]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D97757] text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left md:block">
                  <p className="max-w-[180px] truncate text-sm font-semibold text-[#1A1A1A]">
                    {displayName}
                  </p>
                  <p className="text-xs text-[#666666]">
                    {getWorkspaceLabel(user?.business_type)}
                    {user?.plan ? ` - ${user.plan}` : ""}
                  </p>
                </div>
                <HiOutlineChevronDown className="hidden text-lg text-[#7B6A5B] md:block" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-[24px] border border-[#E6DBCF] bg-white p-3 shadow-[0_20px_60px_rgba(46,28,16,0.18)]">
                  <div className="rounded-2xl bg-[#FBF6F0] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">{displayName}</p>
                    <p className="mt-1 truncate text-xs text-[#655649]">{user?.email}</p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#3A2C21] transition-colors hover:bg-[#FBF6F0]"
                    >
                      <HiOutlineUserCircle className="text-lg text-[#A76541]" />
                      Profile
                    </Link>
                    <Link
                      to="/workspace-select"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#3A2C21] transition-colors hover:bg-[#FBF6F0]"
                    >
                      <HiOutlineArrowUp className="text-lg text-[#A76541]" />
                      Switch workspace
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:px-10 lg:py-8 layout-content">
          <div className={`${isHotelWorkspace ? "h-full w-full" : "max-w-6xl mx-auto h-full"} text-[#333333]`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
