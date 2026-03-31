import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  HiOutlineChartPie,
  HiOutlineClipboardList,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationCircle,
  HiOutlineTrendingUp,
  HiOutlineViewGrid,
} from "react-icons/hi";

import restaurantService from "../../services/restaurantService";
import {
  formatCurrency,
  formatOrderSourceLabel,
  formatOrderStatus,
  getRelativeTime,
  orderStatusClasses,
} from "../../lib/restaurant";

const StatCard = ({ title, value, detail, icon: Icon, accent }) => (
  <div className="rounded-2xl border border-[#E6DDD4] bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className={`rounded-2xl p-3 ${accent}`}>
        <Icon className="text-xl" />
      </div>
      <span className="rounded-full bg-[#F7F1EA] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B5D44]">
        Live
      </span>
    </div>
    <p className="text-sm font-medium text-[#7A6B5E]">{title}</p>
    <p className="mt-2 text-3xl font-serif text-[#1F1A17]">{value}</p>
    <p className="mt-3 text-sm leading-6 text-[#6A5B4C]">{detail}</p>
  </div>
);

const rangeOptions = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 14 Days", value: 14 },
  { label: "Last 30 Days", value: 30 },
];

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [selectedRange, setSelectedRange] = useState(7);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await restaurantService.getDashboardStats(selectedRange);
        setStats(data);
      } catch (fetchError) {
        console.error("Failed to fetch restaurant dashboard", fetchError);
        setError("Unable to load dashboard insights right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedRange]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  const occupiedTables = stats?.tables_by_status?.occupied || 0;
  const availableTables = stats?.tables_by_status?.available || 0;
  const reservedTables = stats?.tables_by_status?.reserved || 0;
  const recentOrders = stats?.recent_orders || [];
  const popularItems = stats?.popular_items || [];
  const ordersBySource = Object.entries(stats?.orders_by_source || {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[28px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FAF5EF_0%,#F3E7D7_55%,#EBD7C1_100%)] p-8 shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-[#D4B89D] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
              Restaurant command center
            </span>
            <div>
              <h1 className="text-4xl font-serif text-[#21170F] sm:text-5xl">
                {greeting}, {user?.tenant_name || user?.username || "Owner"}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
                Orders, tables, and stock are all flowing through one live workspace now.
              </p>
            </div>
          </div>

          <label className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/75 p-4 text-sm font-medium text-[#4B3D31] shadow-sm">
            Performance window
            <select
              value={selectedRange}
              onChange={(event) => setSelectedRange(Number(event.target.value))}
              className="rounded-xl border border-[#DECFC0] bg-white px-4 py-2 text-sm text-[#1F1A17] outline-none transition focus:border-[#B97B57]"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={loading ? "..." : formatCurrency(stats?.revenue_total)}
          detail={`Completed sales across the last ${selectedRange} days.`}
          icon={HiOutlineCurrencyDollar}
          accent="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Active Orders"
          value={loading ? "..." : stats?.active_orders ?? 0}
          detail="Orders still moving through kitchen, ready, or service."
          icon={HiOutlineClipboardList}
          accent="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Average Ticket"
          value={loading ? "..." : formatCurrency(stats?.average_order_value)}
          detail={`Based on ${stats?.completed_orders ?? 0} completed orders in this window.`}
          icon={HiOutlineTrendingUp}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Low Stock Alerts"
          value={loading ? "..." : stats?.low_stock_count ?? 0}
          detail="Ingredients at or below the threshold that need attention."
          icon={HiOutlineExclamationCircle}
          accent="bg-rose-50 text-rose-700"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif text-[#1F1A17]">Recent Orders</h2>
              <p className="mt-1 text-sm text-[#6A5B4C]">
                The latest tickets flowing through your restaurant.
              </p>
            </div>
            <div className="rounded-full bg-[#F8EFE4] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#9E6041]">
              {recentOrders.length} shown
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-[#F6F1EB]" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6DDD4] px-6 py-10 text-center text-sm text-[#7A6B5E]">
              No orders yet. Create your first one from the Orders page.
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[#ECE5DD] bg-[#FFFEFC] p-4 transition-colors hover:bg-[#FCF8F2]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9E6041]">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            orderStatusClasses[order.status] || orderStatusClasses.cancelled
                          }`}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-serif text-[#1F1A17]">
                        {order.customer_name ||
                          (order.table_number ? `Table ${order.table_number}` : "Walk-in order")}
                      </h3>
                      <p className="mt-1 text-sm text-[#6A5B4C]">
                        {formatOrderSourceLabel(order.order_type)}
                        {order.table_number ? ` | Table ${order.table_number}` : ""}
                        {order.item_count ? ` | ${order.item_count} items` : ""}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-lg font-serif text-[#1F1A17]">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8C7A6A]">
                        {getRelativeTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-[#F8EFE4] p-3 text-[#A76541]">
                <HiOutlineChartPie className="text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-[#1F1A17]">Order Sources</h2>
                <p className="text-sm text-[#6A5B4C]">How guests are placing orders.</p>
              </div>
            </div>

            <div className="space-y-3">
              {ordersBySource.length === 0 && !loading ? (
                <p className="text-sm text-[#7A6B5E]">No source data yet.</p>
              ) : (
                ordersBySource.map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between rounded-2xl bg-[#FBF6F0] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-[#3A2C21]">
                      {formatOrderSourceLabel(source)}
                    </span>
                    <span className="text-sm font-semibold text-[#9E6041]">{count}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-[#EEF7F1] p-3 text-emerald-700">
                <HiOutlineViewGrid className="text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-[#1F1A17]">Table Snapshot</h2>
                <p className="text-sm text-[#6A5B4C]">Current floor availability.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Available</p>
                <p className="mt-2 text-2xl font-serif text-emerald-900">{availableTables}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Occupied</p>
                <p className="mt-2 text-2xl font-serif text-amber-900">{occupiedTables}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Reserved</p>
                <p className="mt-2 text-2xl font-serif text-blue-900">{reservedTables}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-serif text-[#1F1A17]">Top Menu Items</h2>
              <p className="mt-1 text-sm text-[#6A5B4C]">
                Best performers in the last {selectedRange} days.
              </p>
            </div>

            <div className="space-y-4">
              {popularItems.length === 0 && !loading ? (
                <p className="text-sm text-[#7A6B5E]">No completed sales yet.</p>
              ) : (
                popularItems.map((item) => (
                  <div key={item.item_name} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-[#3A2C21]">{item.item_name}</span>
                      <span className="text-[#8C7A6A]">{item.total_sold} sold</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.16em] text-[#9E6041]">
                      <span>{formatCurrency(item.total_revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F2E8DD]">
                      <div
                        className="h-full rounded-full bg-[#D97757]"
                        style={{
                          width: `${Math.max(
                            12,
                            Math.min(
                              100,
                              item.total_sold /
                                Math.max(...popularItems.map((entry) => entry.total_sold || 1)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
