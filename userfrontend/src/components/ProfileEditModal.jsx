import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiMail, FiMapPin, FiPhone, FiSave, FiUser, FiX } from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

const fieldClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";

const ProfileEditModal = ({ open, onClose }) => {
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
    if (!open) return;
    setForm({
      username: user?.username || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
      address: user?.address || "",
    });
  }, [open, user]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const displayName = useMemo(() => {
    const parts = [form.first_name, form.last_name].filter(Boolean);
    return parts.join(" ").trim() || form.username || "Guest";
  }, [form.first_name, form.last_name, form.username]);

  const initials = useMemo(() => {
    const source = displayName.trim() || form.email || "Z";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [displayName, form.email]);

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
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update your profile right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,35,0.45)] px-4 py-8 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_30px_100px_rgba(25,28,35,0.2)]"
          >
            <div className="relative overflow-hidden border-b border-gray-100 bg-gray-900 px-6 py-6 text-white sm:px-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,161,79,0.34),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(81,205,174,0.22),transparent_24%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/12 text-lg font-extrabold text-white backdrop-blur-sm">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Profile Settings</p>
                    <h2 className="mt-2 text-3xl font-extrabold">{displayName}</h2>
                    <p className="mt-2 text-sm text-white/72">
                      Update the details used for sign-in, booking coordination, and delivery handoff.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white transition-colors hover:bg-white/16"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-8 px-6 py-6 sm:px-8 lg:grid-cols-[1.1fr_1.4fr]">
              <div className="space-y-5">
                <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-600">Account Snapshot</p>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                      <FiUser className="text-orange-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-500">Visible account identity</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                      <FiMail className="text-orange-500" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{form.email || "Email pending"}</p>
                        <p className="text-xs text-gray-500">Used for login and password recovery</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                      <FiMapPin className="text-orange-500" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-gray-900">{form.address || "Delivery address not added yet"}</p>
                        <p className="text-xs text-gray-500">Shared for deliveries and service follow-up</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5 text-sm text-orange-900">
                  <p className="font-bold">Keep this current</p>
                  <p className="mt-2 leading-7 text-orange-800/90">
                    Updated email, phone, and address details help Zahi partners confirm reservations, deliveries, and handoffs faster.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Username</span>
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
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Email</span>
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
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">First Name</span>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(event) => setField("first_name", event.target.value)}
                      className={fieldClassName}
                      placeholder="Anu"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Last Name</span>
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
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Phone Number</span>
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
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Delivery Address</span>
                  <textarea
                    rows="5"
                    value={form.address}
                    onChange={(event) => setField("address", event.target.value)}
                    className={`${fieldClassName} resize-none`}
                    placeholder="House name, street, town, landmark, and anything delivery partners should know."
                  />
                </label>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(17,23,32,0.18)] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FiSave />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileEditModal;
