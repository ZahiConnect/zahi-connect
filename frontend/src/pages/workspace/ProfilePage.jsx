import { useSelector } from "react-redux";
import {
  HiOutlineHome,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineUserCircle,
} from "react-icons/hi";
import { getWorkspaceLabel } from "../../lib/workspace";

const infoCards = (user) => [
  {
    title: "Workspace",
    value: user?.tenant_name || "Workspace not named yet",
    detail: getWorkspaceLabel(user?.business_type),
    icon: HiOutlineHome,
  },
  {
    title: "Owner account",
    value: user?.username || "User",
    detail: user?.email || "No email connected",
    icon: HiOutlineUserCircle,
  },
  {
    title: "Plan",
    value: user?.plan || "free",
    detail: "Current paid access level",
    icon: HiOutlineMail,
  },
  {
    title: "Phone",
    value: user?.mobile || "Not added yet",
    detail: "Owner contact number",
    icon: HiOutlinePhone,
  },
];

const ProfilePage = () => {
  const { user } = useSelector((state) => state.auth);
  const initials = (user?.tenant_name || user?.username || "Z").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] border border-[#E7DED5] bg-[linear-gradient(135deg,#FCF7F1_0%,#F4E7D7_58%,#E9D7C7_100%)] p-8 shadow-[0_20px_45px_rgba(117,81,44,0.09)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#1F1A17] text-2xl font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[#9E6041]">Workspace profile</p>
              <h1 className="mt-2 text-4xl font-serif text-[#21170F]">
                {user?.tenant_name || user?.username}
              </h1>
              <p className="mt-3 text-base leading-7 text-[#5C4A3C]">
                This is the owner-facing profile view for the current workspace and account.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#D7B89C] bg-white/75 px-5 py-4 text-sm text-[#5C4A3C]">
            <p className="font-semibold text-[#21170F]">{user?.plan || "free"}</p>
            <p className="mt-1">Current workspace plan</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {infoCards(user).map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 inline-flex rounded-2xl bg-[#F8EFE4] p-3 text-[#A76541]">
                <Icon className="text-2xl" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">{card.title}</p>
              <h2 className="mt-3 text-2xl font-serif text-[#21170F]">{card.value}</h2>
              <p className="mt-3 text-sm leading-6 text-[#655649]">{card.detail}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default ProfilePage;
