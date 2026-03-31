import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import { setCredentials } from "../redux/authslice";
import { buildSessionUser } from "../lib/authSession";
import { getHomeRouteForUser } from "../lib/workspace";
import { clearPurchaseIntent } from "../lib/purchaseIntent";
import { setAccessToken } from "../lib/axios";
import subscriptionService from "../services/subscriptionService";

const initialForm = {
  businessName: "",
  phone: "",
  address: "",
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const SubscriptionDialog = ({ isOpen, plan, onClose }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isOpen) {
      const reuseActiveWorkspaceName =
        user?.workspace_count === 1 && user?.business_type === plan?.business_type;

      setForm({
        businessName: reuseActiveWorkspaceName ? user?.tenant_name || "" : "",
        phone: user?.mobile || "",
        address: "",
      });
    }
  }, [isOpen, plan?.code, user?.mobile, user?.tenant_name]);

  if (!isOpen || !plan) return null;

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const closeDialog = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please sign in before starting a payment.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const checkoutData = await subscriptionService.createCheckout({
        plan_code: plan.code,
        business_name: form.businessName,
        phone: form.phone,
        address: form.address,
      });

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout could not be loaded.");
      }

      const razorpay = new window.Razorpay({
        ...checkoutData.checkout,
        theme: {
          color: "#C96F48",
        },
        handler: async (paymentResult) => {
          try {
            const verified = await subscriptionService.verifyPayment({
              subscription_order_id: checkoutData.subscription_order_id,
              razorpay_order_id: paymentResult.razorpay_order_id,
              razorpay_payment_id: paymentResult.razorpay_payment_id,
              razorpay_signature: paymentResult.razorpay_signature,
            });

            const user = buildSessionUser(verified);
            setAccessToken(verified.access);
            dispatch(
              setCredentials({
                accessToken: verified.access,
                user,
              })
            );

            clearPurchaseIntent();
            toast.success(`Welcome to ${plan.name}! Your workspace is ready.`);
            onClose();
            navigate(getHomeRouteForUser(user));
          } catch (verificationError) {
            console.error("Payment verification failed", verificationError);
            toast.error(
              verificationError.response?.data?.detail ||
                "Payment received, but workspace activation failed."
            );
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Subscription checkout failed", error);
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "We could not start the checkout right now."
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1E1712]/50 px-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-[#E6DBCF] bg-[#FFFDF9] shadow-[0_25px_80px_rgba(46,28,16,0.25)]">
        <button
          type="button"
          onClick={closeDialog}
          className="absolute right-5 top-5 rounded-full border border-[#E8DDD1] bg-white p-2 text-[#655649] transition-colors hover:text-[#1F1A17]"
        >
          <HiOutlineX className="text-xl" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_1.35fr]">
          <aside className="border-b border-[#EFE5DB] bg-[linear-gradient(155deg,#1E1712_0%,#4A2D1D_52%,#8E553A_100%)] p-8 text-white lg:border-b-0 lg:border-r">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-white/80">
              Selected Plan
            </span>
            <h2 className="mt-5 text-4xl font-serif">{plan.name}</h2>
            <p className="mt-4 text-sm leading-7 text-white/80">{plan.headline}</p>
            <p className="mt-6 text-3xl font-serif">{plan.display_price}</p>

            <div className="mt-8 space-y-4">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm text-white/90">
                  <HiOutlineSparkles className="mt-0.5 shrink-0 text-base text-[#F7C59F]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/8 p-5">
              <div className="flex items-start gap-3">
                <HiOutlineShieldCheck className="mt-1 shrink-0 text-xl text-[#F7C59F]" />
                <div>
                  <p className="font-medium">Instant access after payment</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Once Razorpay confirms the payment, we create your workspace and move you
                    straight into the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="p-8">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.22em] text-[#A26A4A]">Owner onboarding</p>
              <h3 className="mt-3 text-3xl font-serif text-[#1F1A17]">Complete your workspace details</h3>
              <p className="mt-3 text-sm leading-6 text-[#655649]">
                Your logged-in account becomes the workspace owner after payment. Add the business
                details below, then continue to Razorpay.
              </p>
            </div>

            <div className="mb-5 rounded-2xl border border-[#EDE1D5] bg-[#FCF7F1] px-4 py-3 text-sm leading-6 text-[#655649]">
              Owner account: <span className="font-medium text-[#1F1A17]">{user?.email}</span>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#3A2C21]">Business name</span>
                <input
                  value={form.businessName}
                  onChange={updateField("businessName")}
                  required
                  className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-[#1F1A17] outline-none transition-colors focus:border-[#C96F48]"
                  placeholder="Zahi Downtown Bistro"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-1">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#3A2C21]">Phone</span>
                  <input
                    value={form.phone}
                    onChange={updateField("phone")}
                    required
                    className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-[#1F1A17] outline-none transition-colors focus:border-[#C96F48]"
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#3A2C21]">Business address</span>
                <textarea
                  value={form.address}
                  onChange={updateField("address")}
                  rows="3"
                  className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-[#1F1A17] outline-none transition-colors focus:border-[#C96F48]"
                  placeholder="MG Road, Kochi"
                />
              </label>

              <div className="rounded-2xl border border-[#EDE1D5] bg-[#FCF7F1] px-4 py-3 text-sm leading-6 text-[#655649]">
                This uses your existing account. Once the test payment is verified, the new
                workspace is attached to your login and ready to open right away.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#1F1A17] px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#33261D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Preparing checkout..." : `Continue to pay for ${plan.name}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDialog;
