import { useEffect, useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationCircle,
  HiOutlineTrendingUp,
} from "react-icons/hi";

import restaurantService from "../../services/restaurantService";
import { formatCurrency, formatOrderSourceLabel, formatOrderStatus } from "../../lib/restaurant";

const rangeOptions = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 14 Days", value: 14 },
  { label: "Last 30 Days", value: 30 },
];

const InsightCard = ({ title, value, detail, icon, accent }) => {
  const IconComponent = icon;

  return (
    <article className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl p-3 text-xl text-white" style={{ background: accent }}>
        <IconComponent />
      </div>
      <p className="text-sm uppercase tracking-[0.16em] text-[#A76541]">{title}</p>
      <h2 className="mt-3 text-3xl font-serif text-[#21170F]">{value}</h2>
      <p className="mt-3 text-sm leading-6 text-[#655649]">{detail}</p>
    </article>
  );
};

export default function Reports() {
  const [range, setRange] = useState(14);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const [dashboardData, trendData, itemsData, lowStockData] = await Promise.all([
          restaurantService.getDashboardStats(range),
          restaurantService.getSalesTrend(range),
          restaurantService.getPopularItems({ days: range, limit: 8 }),
          restaurantService.getLowStockInventory(),
        ]);

        setDashboard(dashboardData);
        setSalesTrend(trendData || []);
        setPopularItems(itemsData || []);
        setLowStockItems(lowStockData || []);
      } catch (error) {
        console.error("Failed to load restaurant reports", error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [range]);

  const maxRevenue = Math.max(...salesTrend.map((entry) => entry.revenue_total || 0), 1);
  const sourceBreakdown = Object.entries(dashboard?.orders_by_source || {});
  const statusBreakdown = Object.entries(dashboard?.orders_by_status || {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FAF5EF_0%,#F3E7D7_55%,#EBD7C1_100%)] p-8 shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-[#D4B89D] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
              Restaurant analytics
            </span>
            <div>
              <h1 className="text-4xl font-serif text-[#21170F] sm:text-5xl">Operational reports that owners can actually use</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
                Revenue, source mix, popular dishes, and low-stock pressure are now all visible in one page.
              </p>
            </div>
          </div>

          <label className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/75 p-4 text-sm font-medium text-[#4B3D31] shadow-sm">
            Reporting window
            <select value={range} onChange={(event) => setRange(Number(event.target.value))} className="rounded-xl border border-[#DECFC0] bg-white px-4 py-2 text-sm text-[#1F1A17] outline-none">
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
        <InsightCard title="Revenue" value={loading ? "..." : formatCurrency(dashboard?.revenue_total)} detail={`Completed sales across the last ${range} days.`} icon={HiOutlineCurrencyDollar} accent="#1F8A70" />
        <InsightCard title="Completed Orders" value={loading ? "..." : dashboard?.completed_orders ?? 0} detail="Closed tickets contributing to reported revenue." icon={HiOutlineClipboardList} accent="#A76541" />
        <InsightCard title="Average Ticket" value={loading ? "..." : formatCurrency(dashboard?.average_order_value)} detail="Average revenue generated per completed order." icon={HiOutlineTrendingUp} accent="#D97757" />
        <InsightCard title="Low Stock Alerts" value={loading ? "..." : lowStockItems.length} detail="Ingredients already at or below their threshold." icon={HiOutlineExclamationCircle} accent="#C2410C" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-[#F2E9DE] p-3 text-[#A76541]">
              <HiOutlineChartBar className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#1F1A17]">Sales Trend</h2>
              <p className="text-sm text-[#6A5B4C]">Daily revenue and order volume over the selected window.</p>
            </div>
          </div>

          <div className="space-y-4">
            {salesTrend.map((entry) => (
              <div key={entry.date} className="grid gap-3 lg:grid-cols-[110px_1fr_120px_100px] lg:items-center">
                <div className="text-sm font-medium text-[#3A2C21]">{entry.date}</div>
                <div className="h-3 overflow-hidden rounded-full bg-[#F1E7DC]">
                  <div className="h-full rounded-full bg-[#D97757]" style={{ width: `${Math.max(4, (entry.revenue_total / maxRevenue) * 100)}%` }} />
                </div>
                <div className="text-sm font-semibold text-[#1F1A17]">{formatCurrency(entry.revenue_total)}</div>
                <div className="text-xs uppercase tracking-[0.16em] text-[#8A7C6D]">{entry.order_count} orders</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-serif text-[#1F1A17]">Order Sources</h2>
            <div className="mt-5 space-y-3">
              {sourceBreakdown.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between rounded-2xl bg-[#FBF6F0] px-4 py-3">
                  <span className="text-sm font-medium text-[#3A2C21]">{formatOrderSourceLabel(source)}</span>
                  <span className="text-sm font-semibold text-[#9E6041]">{count}</span>
                </div>
              ))}
              {!loading && sourceBreakdown.length === 0 && <p className="text-sm text-[#7A6B5E]">No source data yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-serif text-[#1F1A17]">Status Breakdown</h2>
            <div className="mt-5 space-y-3">
              {statusBreakdown.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-2xl bg-[#FBF6F0] px-4 py-3">
                  <span className="text-sm font-medium text-[#3A2C21]">{formatOrderStatus(status)}</span>
                  <span className="text-sm font-semibold text-[#9E6041]">{count}</span>
                </div>
              ))}
              {!loading && statusBreakdown.length === 0 && <p className="text-sm text-[#7A6B5E]">No status data yet.</p>}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-serif text-[#1F1A17]">Best Performing Menu Items</h2>
          <p className="mt-2 text-sm text-[#6A5B4C]">Top dishes ranked by completed sales volume.</p>
          <div className="mt-6 space-y-4">
            {popularItems.map((item) => (
              <div key={item.item_name} className="rounded-2xl border border-[#F1E7DC] bg-[#FFFCF8] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-[#1F1A17]">{item.item_name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8A7C6D]">{item.total_sold} items sold</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-[#9E6041]">{formatCurrency(item.total_revenue)}</div>
                </div>
              </div>
            ))}
            {!loading && popularItems.length === 0 && <p className="text-sm text-[#7A6B5E]">No popular-item data yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-serif text-[#1F1A17]">Inventory Alerts</h2>
          <p className="mt-2 text-sm text-[#6A5B4C]">Items that need replenishment soon or immediately.</p>
          <div className="mt-6 space-y-4">
            {lowStockItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-rose-900">{item.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-rose-700">{item.category || "General"} | {item.supplier || "No supplier set"}</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-rose-800">
                    {item.quantity} {item.unit}
                  </div>
                </div>
              </div>
            ))}
            {!loading && lowStockItems.length === 0 && <p className="text-sm text-[#7A6B5E]">No low-stock alerts right now.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
