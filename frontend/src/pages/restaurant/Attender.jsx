import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardCheck,
  HiOutlineCube,
  HiOutlineRefresh,
  HiOutlineTruck,
} from "react-icons/hi";
import toast from "react-hot-toast";

import BillPreviewModal from "../../components/restaurant/BillPreviewModal";
import useRestaurantLiveUpdates from "../../hooks/useRestaurantLiveUpdates";
import restaurantService from "../../services/restaurantService";
import {
  formatCurrency,
  formatOrderSourceLabel,
  formatOrderStatus,
  formatDateTime,
  getRelativeTime,
  orderStatusClasses,
} from "../../lib/restaurant";

const initialBoard = {
  ready_dine_in: [],
  ready_delivery: [],
  active_dine_in: [],
  active_delivery: [],
  recent_served: [],
};

const getErrorDetail = (error) => String(error.response?.data?.detail || error.message || "");

const isTransitionConflictError = (error) => {
  if (error.response?.status !== 400) return false;
  const detail = getErrorDetail(error);
  return (
    detail.startsWith("Cannot transition from") ||
    detail.startsWith("Cannot claim") ||
    detail.startsWith("Cannot mark")
  );
};

export default function Attender() {
  const [board, setBoard] = useState(initialBoard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const busyActionsRef = useRef(new Set());

  const loadBoard = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const data = await restaurantService.getServiceBoard();
      setBoard({
        ready_dine_in: data?.ready_dine_in || [],
        ready_delivery: data?.ready_delivery || [],
        active_dine_in: data?.active_dine_in || [],
        active_delivery: data?.active_delivery || [],
        recent_served: data?.recent_served || [],
      });
    } catch (error) {
      console.error("Failed to load service board", error);
      if (!silent) toast.error("Failed to load attender board");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const { connectionState } = useRestaurantLiveUpdates((event) => {
    if (event?.scopes?.some((scope) => ["service", "kitchen", "billing", "orders"].includes(scope))) {
      loadBoard({ silent: true });
    }
  });

  const claimOrder = async (orderId) => {
    const actionKey = `claim:${orderId}`;
    if (busyActionsRef.current.has(actionKey)) return;

    try {
      busyActionsRef.current.add(actionKey);
      setBusyOrderId(orderId);
      await restaurantService.claimServiceOrder(orderId);
      toast.success("Order claimed for service");
      await loadBoard({ silent: true });
    } catch (error) {
      console.error("Failed to claim order", error);
      if (isTransitionConflictError(error)) {
        await loadBoard({ silent: true });
        return;
      }
      toast.error(error.response?.data?.detail || "Failed to claim order");
    } finally {
      busyActionsRef.current.delete(actionKey);
      setBusyOrderId("");
    }
  };

  const markServed = async (orderId) => {
    const actionKey = `served:${orderId}`;
    if (busyActionsRef.current.has(actionKey)) return;

    try {
      busyActionsRef.current.add(actionKey);
      setBusyOrderId(orderId);
      const servedOrder = await restaurantService.markOrderServed(orderId);
      toast.success(`Sent to accounts as ${servedOrder.bill_number}`);
      setSelectedBill(servedOrder);
      await loadBoard({ silent: true });
    } catch (error) {
      console.error("Failed to mark order served", error);
      if (isTransitionConflictError(error)) {
        await loadBoard({ silent: true });
        return;
      }
      toast.error(error.response?.data?.detail || "Failed to mark order served");
    } finally {
      busyActionsRef.current.delete(actionKey);
      setBusyOrderId("");
    }
  };

  const summary = useMemo(
    () => ({
      ready: board.ready_dine_in.length + board.ready_delivery.length,
      active: board.active_dine_in.length + board.active_delivery.length,
      recentServed: board.recent_served.length,
    }),
    [board]
  );

  const liveBadge =
    connectionState === "live"
      ? "Live websocket connected"
      : connectionState === "reconnecting"
        ? "Reconnecting attender feed..."
        : "Connecting attender feed...";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FAF5EF_0%,#F3E7D7_55%,#EBD7C1_100%)] p-8 shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-[#D4B89D] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
              Attender Desk
            </span>
            <div>
              <h1 className="text-4xl font-serif text-[#21170F] sm:text-5xl">Live service and delivery handoff</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
                Ready orders arrive here from Kitchen instantly, attendants claim them, serve them, and send the bill forward to Accountant.
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
        <SummaryCard title="Ready to take" value={summary.ready} detail="Orders waiting for a staff member to pick them up from kitchen." icon={HiOutlineClipboardCheck} accent="bg-indigo-50 text-indigo-700" />
        <SummaryCard title="Active handoff" value={summary.active} detail="Orders already claimed and currently being served or delivered." icon={HiOutlineTruck} accent="bg-amber-50 text-amber-700" />
        <SummaryCard title="Recent bills" value={summary.recentServed} detail="Recently served orders with generated bill IDs ready for accounts." icon={HiOutlineCheckCircle} accent="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ServiceColumn
          title="Ready Dine-In Orders"
          description="Kitchen is done. Claim a table order and take it out."
          icon={HiOutlineClipboardCheck}
          orders={board.ready_dine_in}
          loading={loading}
          buttonLabel="Take to Table"
          onAction={claimOrder}
          busyOrderId={busyOrderId}
          emptyCopy="No dine-in plates are waiting right now."
        />
        <ServiceColumn
          title="Ready Delivery Orders"
          description="Prepared packets waiting for dispatch or pickup."
          icon={HiOutlineCube}
          orders={board.ready_delivery}
          loading={loading}
          buttonLabel="Take for Delivery"
          onAction={claimOrder}
          busyOrderId={busyOrderId}
          emptyCopy="No delivery packets are waiting right now."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ServiceColumn
          title="Active Dine-In Service"
          description="Claimed table orders that still need to be served."
          icon={HiOutlineCheckCircle}
          orders={board.active_dine_in}
          loading={loading}
          buttonLabel="Mark Served"
          onAction={markServed}
          busyOrderId={busyOrderId}
          emptyCopy="No dine-in orders are currently being served."
          showAssignee
        />
        <ServiceColumn
          title="Active Delivery Runs"
          description="Claimed delivery orders that still need a final handoff."
          icon={HiOutlineTruck}
          orders={board.active_delivery}
          loading={loading}
          buttonLabel="Mark Delivered"
          onAction={markServed}
          busyOrderId={busyOrderId}
          emptyCopy="No delivery orders are currently in handoff."
          showAssignee
        />
      </section>

      <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-[#1F1A17]">Recently Served</h2>
            <p className="mt-1 text-sm text-[#6A5B4C]">
              Bills created here can be reopened or printed before payment is settled.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {loading ? (
            [...Array(4)].map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-[#F7F1EA]" />
            ))
          ) : board.recent_served.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-[#FFFCF8] px-6 py-10 text-center text-sm text-[#8A7C6D] lg:col-span-2">
              No recently served orders yet.
            </div>
          ) : (
            board.recent_served.map((order) => (
              <article key={order.id} className="rounded-3xl border border-[#ECE5DD] bg-[#FFFEFC] p-5">
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
                      {formatOrderSourceLabel(order.order_type)} | {formatOrderStatus(order.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBill(order)}
                    className="rounded-full border border-[#DECFC0] bg-white px-4 py-2 text-sm font-semibold text-[#3A2C21] hover:bg-[#FBF6F0]"
                  >
                    Open Bill
                  </button>
                </div>
                <div className="mt-4 text-sm text-[#655649]">
                  Served {order.served_at ? formatDateTime(order.served_at) : getRelativeTime(order.updated_at)}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <BillPreviewModal order={selectedBill} onClose={() => setSelectedBill(null)} />
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

function ServiceColumn({
  title,
  description,
  icon,
  orders,
  loading,
  buttonLabel,
  onAction,
  busyOrderId,
  emptyCopy,
  showAssignee = false,
}) {
  const Icon = icon;

  return (
    <section className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#F2E9DE] p-3 text-[#A76541]">
          <Icon className="text-xl" />
        </div>
        <div>
          <h2 className="text-2xl font-serif text-[#1F1A17]">{title}</h2>
          <p className="text-sm text-[#6A5B4C]">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          [...Array(2)].map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-[#F7F1EA]" />
          ))
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-[#FFFCF8] px-6 py-10 text-center text-sm text-[#8A7C6D]">
            {emptyCopy}
          </div>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-[#ECE5DD] bg-[#FFFEFC] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#1A1A1A]">#{order.id.slice(0, 8)}</h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        orderStatusClasses[order.status] || orderStatusClasses.ready
                      }`}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#666666]">
                    {formatOrderSourceLabel(order.order_type)}
                    {order.table_number ? ` | Table ${order.table_number}` : ""}
                  </p>
                  {showAssignee && order.service_assignee && (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8C7A6A]">
                      Taken by {order.service_assignee}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1F1A17]">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8C7A6A]">
                    {getRelativeTime(order.updated_at)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-[#F0E7DE] bg-[#FFFCF8] p-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#1F1A17]">
                      {item.quantity}x {item.item_name}
                    </span>
                    <span className="font-semibold text-[#5F5144]">
                      {formatCurrency(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onAction(order.id)}
                disabled={busyOrderId === order.id}
                className="mt-5 w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60"
              >
                {busyOrderId === order.id ? "Updating..." : buttonLabel}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
