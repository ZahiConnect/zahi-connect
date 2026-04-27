import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

const fieldClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10";

const getDisplayName = (user) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
  user?.username ||
  user?.email ||
  "Guest";

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

const EditProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    address: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        username: user?.username || "",
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        mobile: user?.mobile || "",
        address: user?.address || "",
      });
    }
  }, [user]);

  const displayName = useMemo(() => {
    const parts = [form.first_name, form.last_name].filter(Boolean);
    return parts.join(" ").trim() || form.username || "Guest";
  }, [form.first_name, form.last_name, form.username]);

  const initials = useMemo(() => getInitials({ ...user, ...form }), [user, form]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        username: form.username.trim(),
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        email: form.email.trim(),
        mobile: form.mobile.trim() || null,
        address: form.address.trim() || null,
      });
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <div className="mx-auto max-w-5xl pb-12">
      {/* Breadcrumb */}
      <motion.div {...fadeUp} className="mb-6">
        <Link
          to="/activity"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <FiArrowLeft /> Back to Activity
        </Link>
      </motion.div>

      {/* Header card */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.05 }}
        className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-gray-900 p-6 text-white sm:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,161,79,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(81,205,174,0.2),transparent_24%)]" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="group relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/12 text-2xl font-extrabold text-white backdrop-blur-sm">
              {initials}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <FiCamera className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-orange-200">
              Profile Settings
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{displayName}</h1>
            <p className="mt-2 text-sm text-white/70">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Left Sidebar */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="space-y-5"
        >
          {/* Account Snapshot */}
          <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-600">
              Account Snapshot
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <FiUser className="shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Display name</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <FiMail className="shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{form.email || "Not set"}</p>
                  <p className="text-xs text-gray-500">Login email</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <FiPhone className="shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {form.mobile || "Not added"}
                  </p>
                  <p className="text-xs text-gray-500">Contact number</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
                <FiMapPin className="mt-0.5 shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold text-gray-900">
                    {form.address || "No delivery address"}
                  </p>
                  <p className="text-xs text-gray-500">Delivery address</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5 text-sm">
            <div className="flex items-center gap-2 font-bold text-orange-900">
              <FiShield /> Security
            </div>
            <p className="mt-2 leading-7 text-orange-800/90">
              Need to change your password?{" "}
              <Link
                to="/forgot-password"
                state={{ email: user?.email }}
                className="font-semibold underline decoration-orange-300 underline-offset-2 hover:decoration-orange-500"
              >
                Reset it here
              </Link>
            </p>
          </div>

          {/* Tips */}
          <div className="rounded-[28px] border border-green-100 bg-green-50 p-5 text-sm">
            <div className="flex items-center gap-2 font-bold text-green-900">
              <FiCheck /> Keep details current
            </div>
            <p className="mt-2 leading-7 text-green-800/90">
              Accurate contact info helps Zahi partners confirm reservations, deliveries, and
              handoffs faster.
            </p>
          </div>
        </motion.div>

        {/* Right Form */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
        >
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_18px_44px_rgba(71,49,31,0.06)] sm:p-8"
          >
            <h2 className="text-lg font-extrabold text-gray-900">Edit Details</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update your personal information below.
            </p>

            <div className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Username
                  </span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(event) => setField("username", event.target.value)}
                    className={fieldClassName}
                    minLength={3}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    className={fieldClassName}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    First Name
                  </span>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(event) => setField("first_name", event.target.value)}
                    className={fieldClassName}
                    placeholder="Anu"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Last Name
                  </span>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(event) => setField("last_name", event.target.value)}
                    className={fieldClassName}
                    placeholder="Nair"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Phone Number
                </span>
                <div className="relative">
                  <FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(event) => setField("mobile", event.target.value)}
                    className={`${fieldClassName} pl-11`}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Delivery Address
                </span>
                <textarea
                  rows="4"
                  value={form.address}
                  onChange={(event) => setField("address", event.target.value)}
                  className={`${fieldClassName} resize-none`}
                  placeholder="House name, street, town, landmark..."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                to="/activity"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(17,23,32,0.18)] transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiSave />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfilePage;
