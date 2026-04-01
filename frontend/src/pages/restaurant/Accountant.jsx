import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCash,
  HiOutlineCheckCircle,
  HiOutlineReceiptTax,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineX,
} from "react-icons/hi";
import toast from "react-hot-toast";

import BillPreviewModal from "../../components/restaurant/BillPreviewModal";
import useRestaurantLiveUpdates from "../../hooks/useRestaurantLiveUpdates";
import restaurantService from "../../services/restaurantService";
import {
  formatCurrency,
  formatDateTime,
  formatOrderSourceLabel,
  formatOrderStatus,
  getRelativeTime,
  orderStatusClasses,
} from "../../lib/restaurant";

const createSettlementForm = () => ({
  paymentMethod: "cash",
  paymentReference: "",
});

export default function Accountant() {
  const [board, setBoard] = useState({
    pending: [],
    recent_settlements: [],
    pending_count: 0,
    pending_amount: 0,
    settled_today_count: 0,
    settled_today_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [settlementTarget, setSettlementTarget] = useState(null);
  const [settlementForm, setSettlementForm] = useState(createSettlementForm());

  const loadBoard = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const data = await restaurantService.getBillingBoard();
      setBoard({
        pending: data?.pending || [],
        recent_settlements: data?.recent_settlements || [],
        pending_count: data?.pending_count || 0,
        pending_amount: data?.pending_amount || 0,
        settled_today_count: data?.settled_today_count || 0,
        settled_today_amount: data?.settled_today_amount || 0,
      });
    } catch (error) {
      console.error("Failed to load billing board", error);
      if (!silent) toast.error("Failed to load accountant board");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const { connectionState } = useRestaurantLiveUpdates((event) => {
    if (event?.scopes?.some((scope) => ["billing", "service", "orders", "tables"].includes(scope))) {
      loadBoard({ silent: true });
    }
  });

  const filteredPending = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return board.pending;

    return board.pending.filter((order) => {
      const haystack = [
        order.id,
        order.bill_number,
        order.customer_name,
        order.customer_phone,
        order.table_number ? `table ${order.table_number}` : "",
        ...(order.items || []).map((item) => item.item_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [board.pending, searchTerm]);

  const openSettlement = (order) => {
    setSettlementTarget(order);
    setSettlementForm(createSettlementForm());
  };

  const closeSettlement = () => {
    setSettlementTarget(null);
    setSettlementForm(createSettlementForm());
  };

  const settleOrder = async () => {
    if (!settlementTarget) return;

    try {
      setBusyOrderId(settlementTarget.id);
      const settledOrder = await restaurantService.settlePayment(settlementTarget.id, {
        payment_method: settlementForm.paymentMethod,
        payment_reference: settlementForm.paymentReference || null,
      });
      toast.success(`Payment settled for ${settledOrder.bill_number}`);
      setSelectedBill(settledOrder);
      closeSettlement();
      await loadBoard({ silent: true });
    } catch (error) {
      console.error("Failed to settle payment", error);
      toast.error(error.response?.data?.detail || "Failed to settle payment");
    } finally {
      setBusyOrderId("");
    }
  };

  const liveBadge =
    connectionState === "live"
      ? "Live cashier feed connected"
      : connectionState === "reconnecting"
        ? "Reconnecting cashier feed..."
        : "Connecting cashier feed...";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FFF7EE_0%,#F6E3CF_55%,#ECD0B1_100%)] p-8 shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-[#D4B89D] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
              Accountant Desk
            </span>
            <div>
              <h1 className="text-4xl font-serif text-[#21170F] sm:text-5xl">Pending bills and live settlement</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
                Search by bill ID, customer, or table, then settle the payment and keep a clear running record of what has already been collected.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#5C4A3C]">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionState === "live" ? "bg-emerald-500" : "animate-pulse bg-amber-500"
                }`}
              />
              {liveBadge}
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadBoard({ silent: true })}
            className="inline-flex items-center gap-2 rounded-full border border-[#D8C9B8] bg-white/85 px-4 py-2.5 text-sm font-semibold text-[#3A2C21] hover:bg-white"
          >
            <HiOutlineRefresh className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Pending Bills" value={board.pending_count} detail="Served orders waiting for cashier settlement." icon={HiOutlineReceiptTax} accent="bg-fuchsia-50 text-fuchsia-700" />
        <SummaryCard title="Pending Amount" value={formatCurrency(board.pending_amount)} detail="Current receivable value from all open served bills." icon={HiOutlineCash} accent="bg-amber-50 text-amber-700" />
        <SummaryCard title="Settled Today" value={`${board.settled_today_count} / ${formatCurrency(board.settled_today_amount)}`} detail="Payments already closed today through this screen." icon={HiOutlineCheckCircle} accent="bg-emerald-50 text-emerald-700" />
      </section>

      <div className="relative">
        <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by bill number, customer, table, or item..."
          className="w-full rounded-full border border-[#DDCDBF] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none"
        />
      </div>

      <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-[#1F1A17]">Pending Settlements</h2>
            <p className="mt-1 text-sm text-[#6A5B4C]">
              These are the served orders still waiting for payment.
            </p>
          </div>
          <div className="rounded-full bg-[#FBF1E7] px-4 py-2 text-sm font-semibold text-[#A76541]">
            {filteredPending.length} visible
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {loading ? (
            [...Array(4)].map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-3xl bg-[#F7F1EA]" />
            ))
          ) : filteredPending.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-[#FFFCF8] px-6 py-10 text-center text-sm text-[#8A7C6D] xl:col-span-2">
              No pending bills match this search.
            </div>
          ) : (
            filteredPending.map((order) => (
              <article key={order.id} className="rounded-3xl border border-[#ECE5DD] bg-[#FFFEFC] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A76541]">
                      {order.bill_number || `#${order.id.slice(0, 8)}`}
                    </p>
                    <h3 className="mt-2 text-xl font-serif text-[#1F1A17]">
                      {order.customer_name ||
                        (order.table_number ? `Table ${order.table_number}` : "Walk-in")}
                    </h3>
                    <p className="mt-2 text-sm text-[#6A5B4C]">
                      {formatOrderSourceLabel(order.order_type)}
                      {order.table_number ? ` | Table ${order.table_number}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      orderStatusClasses[order.status] || orderStatusClasses.served
                    }`}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-[#FBF6F0] px-4 py-4 text-sm text-[#5F5144]">
                  <div className="flex items-center justify-between">
                    <span>Served at</span>
                    <span className="font-semibold text-[#1F1A17]">
                      {order.served_at ? formatDateTime(order.served_at) : getRelativeTime(order.updated_at)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span>Total payable</span>
                    <span className="font-serif text-xl text-[#1F1A17]">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBill(order)}
                    className="rounded-full border border-[#DECFC0] bg-white px-4 py-2.5 text-sm font-semibold text-[#3A2C21] hover:bg-[#FBF6F0]"
                  >
                    Open Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => openSettlement(order)}
                    className="rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#333333]"
                  >
                    Settle Payment
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-serif text-[#1F1A17]">Recent Settlements</h2>
          <p className="mt-1 text-sm text-[#6A5B4C]">
            This section updates live whenever a bill gets closed.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-[#ECE5DD] text-[#7A6B5E]">
              <tr>
                <th className="pb-4 font-medium">Bill</th>
                <th className="pb-4 font-medium">Guest</th>
                <th className="pb-4 font-medium">Method</th>
                <th className="pb-4 font-medium">Settled</th>
                <th className="pb-4 font-medium">Amount</th>
                <th className="pb-4 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EAE1] text-[#3A2C21]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-[#8A7C6D]">
                    Loading settlements...
                  </td>
                </tr>
              ) : board.recent_settlements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-[#8A7C6D]">
                    No settled bills yet.
                  </td>
                </tr>
              ) : (
                board.recent_settlements.map((order) => (
                  <tr key={order.id}>
                    <td className="py-5 pr-4 font-semibold text-[#9E6041]">
                      {order.bill_number || `#${order.id.slice(0, 8)}`}
                    </td>
                    <td className="py-5 pr-4">
                      {order.customer_name ||
                        (order.table_number ? `Table ${order.table_number}` : "Walk-in")}
                    </td>
                    <td className="py-5 pr-4">
                      {order.payment_method ? formatOrderStatus(order.payment_method) : "Not captured"}
                    </td>
                    <td className="py-5 pr-4 text-xs text-[#7A6B5E]">
                      {order.settled_at ? formatDateTime(order.settled_at) : getRelativeTime(order.updated_at)}
                    </td>
                    <td className="py-5 pr-4 font-serif text-base text-[#1F1A17]">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="py-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBill(order)}
                        className="rounded-full border border-[#DECFC0] bg-white px-4 py-2 text-xs font-semibold text-[#3A2C21] hover:bg-[#FBF6F0]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BillPreviewModal order={selectedBill} onClose={() => setSelectedBill(null)} />

      {settlementTarget && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] bg-white shadow-[0_30px_80px_rgba(34,22,14,0.25)]">
            <div className="flex items-center justify-between border-b border-[#EADFD1] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A76541]">
                  Settle Payment
                </p>
                <h2 className="mt-2 text-2xl font-serif text-[#1F1A17]">
                  {settlementTarget.bill_number || `Order #${settlementTarget.id.slice(0, 8)}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSettlement}
                className="rounded-full bg-[#F0E6DB] p-2.5 text-[#6C5847] hover:bg-[#E7D9C9]"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-3xl bg-[#FBF6F0] px-5 py-4">
                <div className="flex items-center justify-between text-sm text-[#5F5144]">
                  <span>Guest / Table</span>
                  <span className="font-semibold text-[#1F1A17]">
                    {settlementTarget.customer_name ||
                      (settlementTarget.table_number
                        ? `Table ${settlementTarget.table_number}`
                        : "Walk-in")}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-[#5F5144]">
                  <span>Amount due</span>
                  <span className="font-serif text-2xl text-[#1F1A17]">
                    {formatCurrency(settlementTarget.total_amount)}
                  </span>
                </div>
              </div>

              <select
                value={settlementForm.paymentMethod}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>

              <input
                type="text"
                value={settlementForm.paymentReference}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    paymentReference: event.target.value,
                  }))
                }
                placeholder="Reference / UTR / last 4 digits (optional)"
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeSettlement}
                  className="flex-1 rounded-2xl border border-[#DCCDBE] px-4 py-3 text-sm font-semibold text-[#3A2C21] hover:bg-[#FBF6F0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={settleOrder}
                  disabled={busyOrderId === settlementTarget.id}
                  className="flex-1 rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60"
                >
                  {busyOrderId === settlementTarget.id ? "Settling..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, detail, icon, accent }) {
  const Icon = icon;

  return (
    <article className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${accent}`}>
        <Icon className="text-xl" />
      </div>
      <p className="mt-4 text-sm uppercase tracking-[0.16em] text-[#A76541]">{title}</p>
      <h2 className="mt-2 text-3xl font-serif text-[#21170F]">{value}</h2>
      <p className="mt-3 text-sm leading-6 text-[#655649]">{detail}</p>
    </article>
  );
}
