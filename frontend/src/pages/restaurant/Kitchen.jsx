import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineRefresh,
} from "react-icons/hi";
import toast from "react-hot-toast";

import useRestaurantLiveUpdates from "../../hooks/useRestaurantLiveUpdates";
import restaurantService from "../../services/restaurantService";
import {
  formatCurrency,
  formatOrderSourceLabel,
  getRelativeTime,
  orderStatusClasses,
} from "../../lib/restaurant";

const columns = [
  {
    id: "new",
    title: "New Orders",
    icon: HiOutlineClock,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    buttonLabel: "Start Preparing",
    nextStatus: "preparing",
    buttonClass: "bg-[#1A1A1A] hover:bg-[#333333] text-white",
    emptyCopy: "Fresh tickets appear here as soon as someone creates an order.",
  },
  {
    id: "preparing",
    title: "Preparing",
    icon: HiOutlineFire,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    buttonLabel: "Mark Ready",
    nextStatus: "ready",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    emptyCopy: "Nothing is being cooked right now.",
  },
  {
    id: "ready",
    title: "Ready for Attender",
    icon: HiOutlineCheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    buttonLabel: null,
    nextStatus: null,
    buttonClass: "",
    emptyCopy: "Completed dishes will wait here until the attender screen claims them.",
  },
];

const initialBoard = {
  new: [],
  preparing: [],
  ready: [],
};

export default function Kitchen() {
  const [board, setBoard] = useState(initialBoard);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  const fetchBoard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setSyncing(true);
    else setLoading(true);

    try {
      const data = await restaurantService.getKitchenBoard();
      setBoard({
        new: data?.new || [],
        preparing: data?.preparing || [],
        ready: data?.ready || [],
      });
    } catch (error) {
      console.error("Failed to load kitchen board", error);
      if (!silent) toast.error("Failed to load kitchen board");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const { connectionState } = useRestaurantLiveUpdates((event) => {
    if (event?.scopes?.some((scope) => ["kitchen", "orders", "service"].includes(scope))) {
      fetchBoard({ silent: true });
    }
  });

  const moveOrder = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await restaurantService.updateOrderStatus(orderId, newStatus);
      toast.success(newStatus === "preparing" ? "Moved into prep" : "Marked ready for attender");
      await fetchBoard({ silent: true });
    } catch (error) {
      console.error("Failed to move order", error);
      toast.error(error.response?.data?.detail || "Failed to update order");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const totals = useMemo(
    () => ({
      all: (board.new?.length || 0) + (board.preparing?.length || 0) + (board.ready?.length || 0),
      ready: board.ready?.length || 0,
    }),
    [board]
  );

  const liveStateCopy =
    connectionState === "live"
      ? "Live websocket connected"
      : connectionState === "reconnecting"
        ? "Reconnecting kitchen feed..."
        : "Connecting kitchen feed...";

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-6 animate-in fade-in duration-500">
      <div className="shrink-0 border-b border-[#E5E5E5] pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-serif text-[#1A1A1A]">Kitchen Display</h1>
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionState === "live"
                    ? "bg-emerald-500"
                    : syncing || loading
                      ? "animate-pulse bg-amber-500"
                      : "bg-rose-500"
                }`}
              />
              <span className="text-sm font-medium text-[#666666]">{liveStateCopy}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-[#FBF1E7] px-4 py-2 text-sm font-semibold text-[#A76541]">
              {totals.all} live ticket(s)
            </div>
            <div className="rounded-full bg-[#EEF7F1] px-4 py-2 text-sm font-semibold text-emerald-700">
              {totals.ready} waiting for attender
            </div>
            <button
              type="button"
              onClick={() => fetchBoard({ silent: true })}
              className="inline-flex items-center gap-2 rounded-full border border-[#DDCDBF] bg-white px-4 py-2 text-sm font-medium text-[#3A2C21] transition-colors hover:bg-[#FBF6F0]"
            >
              <HiOutlineRefresh className={syncing ? "animate-spin" : ""} />
              Refresh now
            </button>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => {
          const orders = board[column.id] || [];

          return (
            <section
              key={column.id}
              className="flex min-h-[22rem] flex-col overflow-hidden rounded-3xl border border-[#E6DDD4] bg-[#F9F7F3]"
            >
              <div className="flex items-center justify-between border-b border-[#E6DDD4] bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${column.bg} ${column.color}`}>
                    <column.icon className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-[#1F1A17]">{column.title}</h2>
                    <p className="text-sm text-[#6A5B4C]">{orders.length} active ticket(s)</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${column.bg} ${column.color} ${column.border}`}
                >
                  {orders.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {loading ? (
                  [...Array(3)].map((_, index) => (
                    <div key={index} className="h-48 animate-pulse rounded-3xl bg-white" />
                  ))
                ) : orders.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-[#DDD2C5] bg-white px-6 py-10 text-center text-[#8A7C6D]">
                    <column.icon className="mb-3 text-4xl opacity-50" />
                    <p className="text-sm font-medium">{column.emptyCopy}</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-[#E6DDD4] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-[#1A1A1A]">
                              #{order.id.slice(0, 8)}
                            </h3>
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                orderStatusClasses[order.status] || orderStatusClasses.ready
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-[#666666]">
                            {formatOrderSourceLabel(order.order_type)}
                            {order.table_number ? ` | Table ${order.table_number}` : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#1F1A17]">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8C7A6A]">
                            {getRelativeTime(order.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3 rounded-2xl border border-[#F0E7DE] bg-[#FFFCF8] p-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFE5DB] text-xs font-bold text-[#1F1A17]">
                              {item.quantity}x
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1F1A17]">{item.item_name}</p>
                              {item.special_instructions && (
                                <p className="mt-1 text-xs font-medium italic text-[#B45309]">
                                  Note: {item.special_instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {order.special_instructions && (
                          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Ticket note: {order.special_instructions}
                          </div>
                        )}
                      </div>

                      {column.buttonLabel ? (
                        <button
                          type="button"
                          onClick={() => moveOrder(order.id, column.nextStatus)}
                          disabled={updatingOrderId === order.id}
                          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${column.buttonClass}`}
                        >
                          {updatingOrderId === order.id ? "Updating..." : column.buttonLabel}
                        </button>
                      ) : (
                        <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                          Waiting for the attender screen to take this order.
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
