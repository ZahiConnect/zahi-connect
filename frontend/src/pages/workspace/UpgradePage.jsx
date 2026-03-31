import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import SubscriptionDialog from "../../components/SubscriptionDialog";
import subscriptionService from "../../services/subscriptionService";

const UpgradePage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await subscriptionService.getPlans();
        setPlans(data);
      } catch (error) {
        console.error("Unable to load plans", error);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.code === user?.plan),
    [plans, user?.plan]
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] border border-[#E7DED5] bg-[linear-gradient(135deg,#FCF7F1_0%,#F4E7D7_58%,#E9D7C7_100%)] p-8 shadow-[0_20px_45px_rgba(117,81,44,0.09)]">
        <p className="text-sm uppercase tracking-[0.22em] text-[#9E6041]">Plan controls</p>
        <h1 className="mt-3 text-4xl font-serif text-[#21170F]">Manage your workspace plan</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5C4A3C]">
          This is the upgrade area for the current workspace. Right now it shows the live plan
          catalog and keeps room for future higher tiers.
        </p>

        <div className="mt-6 inline-flex rounded-3xl border border-[#D7B89C] bg-white/75 px-5 py-4 text-sm text-[#5C4A3C]">
          <div>
            <p className="font-semibold text-[#21170F]">{currentPlan?.name || user?.plan || "Current plan"}</p>
            <p className="mt-1">Active workspace plan</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[300px] animate-pulse rounded-[30px] border border-[#E8DDD1] bg-white/70"
              />
            ))
          : plans.map((plan) => {
              const isCurrentPlan = plan.code === user?.plan;
              const sameBusinessType = !user?.business_type || plan.business_type === user.business_type;

              return (
                <article
                  key={plan.code}
                  className={`rounded-[30px] border p-7 shadow-sm ${
                    plan.featured
                      ? "border-[#CC815A] bg-[#1F1A17] text-white"
                      : "border-[#E8DDD1] bg-white text-[#1F1A17]"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-[0.24em] ${plan.featured ? "text-[#F4C7A7]" : "text-[#A76541]"}`}>
                    {plan.badge}
                  </p>
                  <h2 className="mt-4 text-3xl font-serif">{plan.name}</h2>
                  <p className={`mt-4 text-sm leading-7 ${plan.featured ? "text-white/78" : "text-[#625446]"}`}>
                    {plan.description}
                  </p>
                  <p className="mt-6 text-3xl font-serif">{plan.display_price}</p>

                  <div className="mt-6 space-y-3">
                    {plan.dashboard_modules.map((moduleName) => (
                      <div
                        key={moduleName}
                        className={`inline-flex w-full rounded-2xl px-4 py-3 text-sm ${
                          plan.featured ? "bg-white/8 text-white/90" : "bg-[#FBF5EE] text-[#5C4A3C]"
                        }`}
                      >
                        {moduleName}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isCurrentPlan || !sameBusinessType}
                    onClick={() => setSelectedPlan(plan)}
                    className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                      isCurrentPlan
                        ? "cursor-not-allowed bg-[#EADBCB] text-[#7A644F]"
                        : !sameBusinessType
                          ? "cursor-not-allowed bg-[#EFE7DE] text-[#8B7866]"
                          : plan.featured
                            ? "bg-white text-[#1F1A17] hover:bg-[#F7ECE2]"
                            : "bg-[#1F1A17] text-white hover:bg-[#35281F]"
                    }`}
                  >
                    {isCurrentPlan
                      ? "Current plan"
                      : sameBusinessType
                        ? `Choose ${plan.name}`
                        : "Different business module"}
                  </button>
                </article>
              );
            })}
      </section>

      <SubscriptionDialog
        isOpen={Boolean(selectedPlan)}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
};

export default UpgradePage;
