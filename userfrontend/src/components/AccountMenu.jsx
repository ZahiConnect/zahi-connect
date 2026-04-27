import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiChevronDown,
  FiEdit3,
  FiLock,
  FiLogOut,
  FiMapPin,
  FiMoon,
  FiPhone,
  FiSun,
  FiUser,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const getDisplayName = (user) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
  user?.username ||
  user?.email ||
  "Account";

const getShortName = (user) =>
  user?.first_name ||
  user?.username?.split(" ")[0] ||
  user?.email?.split("@")[0] ||
  "Account";

const getInitials = (user) => {
  const source = getDisplayName(user);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const menuItemClassName =
  "flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900";

export const ThemeToggleButton = ({ compact = false, onToggleComplete }) => {
  const { isDark, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme();
    onToggleComplete?.();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-3 rounded-[22px] border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900"
    >
      {isDark ? <FiSun /> : <FiMoon />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
};

export const DesktopAccountMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const shortName = useMemo(() => getShortName(user), [user]);
  const initials = useMemo(() => getInitials(user), [user]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-3 rounded-full border border-gray-100 bg-gray-50 p-1.5 pr-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-100"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xs font-extrabold text-orange-700">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="max-w-[140px] truncate text-sm font-bold text-gray-900">{shortName}</p>
          <p className="max-w-[140px] truncate text-xs text-gray-500">{user?.email}</p>
        </div>
        <FiChevronDown className={`text-sm text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-[calc(100%+0.8rem)] z-[70] w-[340px] overflow-hidden rounded-[30px] border border-gray-200 bg-white/95 p-3 shadow-[0_24px_60px_rgba(18,24,32,0.16)] backdrop-blur-2xl"
          >
            <div className="grid gap-1">
              <Link to="/activity" onClick={closeMenu} className={menuItemClassName}>
                <FiActivity className="text-orange-500" />
                My Activity
              </Link>

              <Link to="/edit-profile" onClick={closeMenu} className={menuItemClassName}>
                <FiEdit3 className="text-orange-500" />
                Edit Profile
              </Link>

              <Link
                to="/forgot-password"
                state={{ email: user?.email || "" }}
                onClick={closeMenu}
                className={menuItemClassName}
              >
                <FiLock className="text-orange-500" />
                Forgot Password
              </Link>

              <button type="button" onClick={handleLogout} className={`${menuItemClassName} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                <FiLogOut className="text-red-500" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MobileAccountPanel = ({ onClose }) => {
  const { user, logout } = useAuth();

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(user), [user]);

  const handleLogout = async () => {
    onClose?.();
    await logout();
  };

  return (
    <>
      <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-sm font-extrabold text-orange-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-gray-900">{displayName}</p>
            <p className="truncate text-sm text-gray-500">{user?.email}</p>
            {user?.mobile ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <FiPhone className="shrink-0" />
                {user.mobile}
              </p>
            ) : null}
            {user?.address ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
                <FiMapPin className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{user.address}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <ThemeToggleButton onToggleComplete={onClose} />

        <Link to="/activity" onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-orange-50 p-4 font-bold text-orange-700">
          <FiActivity />
          My Activity
        </Link>

        <Link to="/edit-profile" onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 font-bold text-gray-700">
          <FiUser />
          Edit Profile
        </Link>

        <Link
          to="/forgot-password"
          state={{ email: user?.email || "" }}
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 font-bold text-gray-700"
        >
          <FiLock />
          Forgot Password
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-2xl p-4 font-bold text-red-500 transition-colors hover:bg-red-50"
        >
          <FiLogOut />
          Logout
        </button>
      </div>
    </>
  );
};
