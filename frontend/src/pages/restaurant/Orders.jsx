import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
  HiOutlineX,
  HiPlus,
} from "react-icons/hi";
import toast from "react-hot-toast";

import useRestaurantLiveUpdates from "../../hooks/useRestaurantLiveUpdates";
import restaurantService from "../../services/restaurantService";
import {
  formatCurrency,
  formatOrderSourceLabel,
  formatOrderStatus,
  getRelativeTime,
  orderStatusClasses,
} from "../../lib/restaurant";

const ORDER_TYPES = [
  { value: "dine_in", label: "Dine-In" },
  { value: "delivery", label: "Delivery" },
];

const emptyForm = () => ({
  orderType: "dine_in",
  tableId: "",
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  specialInstructions: "",
  searchTerm: "",
  cart: [],
});

const resolveMenuItemPrice = (item, orderType) => {
  if (orderType === "delivery" && item.delivery_price != null) {
    return Number(item.delivery_price || 0);
  }

  return Number(item.dine_in_price || 0);
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [form, setForm] = useState(emptyForm());

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [nextOrders, nextMenu, nextTables] = await Promise.all([
        restaurantService.getOrders({ limit: 150 }),
        restaurantService.getMenu(),
        restaurantService.getTables(),
      ]);
      setOrders(nextOrders || []);
      setMenuItems((nextMenu || []).filter((item) => item.is_available));
      setTables(nextTables || []);
    } catch (error) {
      console.error("Failed to load orders", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRestaurantLiveUpdates((event) => {
    if (event?.scopes?.some((scope) => ["orders", "tables", "kitchen", "service", "billing"].includes(scope))) {
      loadData({ silent: true });
    }
  });

  useEffect(() => {
    setForm((current) => {
      if (current.cart.length === 0) return current;

      return {
        ...current,
        cart: current.cart.map((entry) => {
          const menuItem = menuItems.find((item) => item.id === entry.menu_item_id);
          if (!menuItem) return entry;

          return {
            ...entry,
            unit_price: resolveMenuItemPrice(menuItem, current.orderType),
          };
        }),
      };
    });
  }, [menuItems, form.orderType]);

  const setFormField = (field, value) => {
    setForm((current) => {
      if (field !== "orderType") {
        return { ...current, [field]: value };
      }

      return {
        ...current,
        orderType: value,
        tableId: value === "dine_in" ? current.tableId : "",
        customerName: value === "delivery" ? current.customerName : "",
        customerPhone: value === "delivery" ? current.customerPhone : "",
        deliveryAddress: value === "delivery" ? current.deliveryAddress : "",
      };
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm());
  };

  const addToCart = (item) => {
    setForm((current) => {
      const existing = current.cart.find((entry) => entry.menu_item_id === item.id);
      if (existing) {
        return {
          ...current,
          cart: current.cart.map((entry) =>
            entry.menu_item_id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
          ),
        };
      }

      return {
        ...current,
        cart: [
          ...current.cart,
          {
            menu_item_id: item.id,
            item_name: item.name,
            quantity: 1,
            unit_price: resolveMenuItemPrice(item, current.orderType),
          },
        ],
      };
    });
  };

  const updateCartQuantity = (menuItemId, delta) => {
    setForm((current) => ({
      ...current,
      cart: current.cart.map((entry) =>
        entry.menu_item_id === menuItemId
          ? { ...entry, quantity: Math.max(1, entry.quantity + delta) }
          : entry
      ),
    }));
  };

  const removeFromCart = (menuItemId) => {
    setForm((current) => ({
      ...current,
      cart: current.cart.filter((entry) => entry.menu_item_id !== menuItemId),
    }));
  };

  const submitOrder = async () => {
    if (form.cart.length === 0) return toast.error("Add at least one menu item");
    if (form.orderType === "dine_in" && !form.tableId) {
      return toast.error("Select an available table");
    }
    if (form.orderType === "delivery" && !form.deliveryAddress.trim()) {
      return toast.error("Delivery address is required");
    }

    setSubmitting(true);
    try {
      await restaurantService.createOrder({
        order_type: form.orderType,
        table_id: form.orderType === "dine_in" ? form.tableId : null,
        customer_name: form.orderType === "delivery" ? form.customerName || null : null,
        customer_phone: form.orderType === "delivery" ? form.customerPhone || null : null,
        delivery_address: form.orderType === "delivery" ? form.deliveryAddress || null : null,
        special_instructions: form.specialInstructions || null,
        items: form.cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        })),
      });
      toast.success("Order created and sent live to kitchen");
      closeDrawer();
      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to create order", error);
      toast.error(error.response?.data?.detail || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      setBusyOrderId(orderId);
      await restaurantService.cancelOrder(orderId);
      toast.success("Order cancelled");
      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to cancel order", error);
      toast.error(error.response?.data?.detail || "Failed to cancel order");
    } finally {
      setBusyOrderId("");
    }
  };

  const filteredOrders = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.bill_number,
        order.customer_name,
        order.customer_phone,
        order.order_type,
        order.status,
        order.service_assignee,
        order.table_number ? `table ${order.table_number}` : "",
        ...(order.items || []).map((item) => item.item_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [orders, searchFilter]);

  const visibleMenu = menuItems.filter((item) =>
    `${item.name} ${item.description || ""}`
      .toLowerCase()
      .includes(form.searchTerm.trim().toLowerCase())
  );
  const selectableTables = tables.filter((table) => table.status === "available");
  const cartTotal = form.cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const summary = {
    active: orders.filter((order) =>
      ["new", "preparing", "ready", "out_for_service", "out_for_delivery", "served"].includes(
        order.status
      )
    ).length,
    ready: orders.filter((order) => order.status === "ready").length,
    awaitingPayment: orders.filter((order) => order.status === "served").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">Order Intake</h1>
          <p className="mt-1 text-[#666666]">
            Create new tickets and track every table, kitchen, service, and payment handoff in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => loadData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-full border border-[#D9CCC0] bg-white px-4 py-2.5 text-sm font-medium text-[#3A2C21] hover:bg-[#FBF6F0]"
          >
            <HiOutlineRefresh className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333333]"
          >
            <HiPlus className="text-lg" />
            Create Order
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Live tickets" value={summary.active} detail="Still moving through kitchen, service, or cashier." icon={HiOutlineClock} accent="bg-blue-50 text-blue-700" />
        <SummaryCard title="Ready for pickup" value={summary.ready} detail="Prepared in kitchen and waiting for the attender screen." icon={HiOutlineSparkles} accent="bg-indigo-50 text-indigo-700" />
        <SummaryCard title="Awaiting payment" value={summary.awaitingPayment} detail="Served already, but still pending settlement in Accountant." icon={HiOutlineShoppingBag} accent="bg-fuchsia-50 text-fuchsia-700" />
      </section>

      <div className="relative">
        <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
        <input
          type="text"
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          placeholder="Search by order, bill, table, customer, or item..."
          className="w-full rounded-full border border-[#DDCDBF] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[#ECE5DD] text-[#7A6B5E]">
            <tr>
              <th className="pb-4 font-medium">Order</th>
              <th className="pb-4 font-medium">Guest / Table</th>
              <th className="pb-4 font-medium">Items</th>
              <th className="pb-4 font-medium">Created</th>
              <th className="pb-4 font-medium">Total</th>
              <th className="pb-4 font-medium">Status</th>
              <th className="pb-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EAE1] text-[#3A2C21]">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-[#8A7C6D]">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-[#8A7C6D]">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-5 pr-4">
                    <div className="font-semibold uppercase tracking-[0.14em] text-[#9E6041]">
                      #{order.id.slice(0, 8)}
                    </div>
                    <div className="mt-2 text-xs text-[#7A6B5E]">
                      {order.bill_number || formatOrderSourceLabel(order.order_type)}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="font-medium text-[#1F1A17]">
                      {order.customer_name ||
                        (order.table_number ? `Table ${order.table_number}` : "Walk-in")}
                    </div>
                    <div className="mt-2 text-xs text-[#7A6B5E]">
                      {order.customer_phone ||
                        order.service_assignee ||
                        (order.table_number ? "Dine-in service" : "No contact captured")}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    {(order.items || []).slice(0, 3).map((item) => (
                      <div key={item.id} className="text-xs text-[#655649]">
                        {item.quantity}x {item.item_name}
                      </div>
                    ))}
                  </td>
                  <td className="py-5 pr-4 text-xs text-[#7A6B5E]">
                    {getRelativeTime(order.created_at)}
                  </td>
                  <td className="py-5 pr-4 font-serif text-base text-[#1F1A17]">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        orderStatusClasses[order.status] || orderStatusClasses.cancelled
                      }`}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                  </td>
                  <td className="py-5 text-right">
                    {order.status === "new" ? (
                      <button
                        type="button"
                        onClick={() => cancelOrder(order.id)}
                        disabled={busyOrderId === order.id}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        {busyOrderId === order.id ? "Cancelling..." : "Cancel"}
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-[#8A7C6D]">
                        Managed in {order.status === "served" ? "Accountant" : order.status.includes("delivery") || order.status === "ready" || order.status === "out_for_service" ? "Attender / Kitchen" : "Kitchen"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] bg-[#FDFCFB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-serif text-[#1A1A1A]">Create Order</h2>
                <p className="mt-1 text-sm text-[#666666]">
                  Only available tables can be used, and new tickets go live to kitchen instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            <div className="grid flex-1 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6 overflow-y-auto border-r border-[#EEE5DA] p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {ORDER_TYPES.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="orderType"
                        value={option.value}
                        checked={form.orderType === option.value}
                        onChange={(event) => setFormField("orderType", event.target.value)}
                        className="sr-only peer"
                      />
                      <div className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-center text-sm font-medium text-[#5F5144] peer-checked:border-[#1A1A1A] peer-checked:bg-[#1A1A1A] peer-checked:text-white">
                        {option.label}
                      </div>
                    </label>
                  ))}
                </div>

                {form.orderType === "dine_in" ? (
                  <div className="space-y-3">
                    <select
                      value={form.tableId}
                      onChange={(event) => setFormField("tableId", event.target.value)}
                      className="w-full rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                    >
                      <option value="">Select an available table</option>
                      {selectableTables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} | {table.capacity} seats
                        </option>
                      ))}
                    </select>
                    {selectableTables.length === 0 && (
                      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        No available tables right now. Occupied and reserved tables are locked from new dine-in orders.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        type="text"
                        value={form.customerName}
                        onChange={(event) => setFormField("customerName", event.target.value)}
                        placeholder="Customer name"
                        className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                      />
                      <input
                        type="text"
                        value={form.customerPhone}
                        onChange={(event) => setFormField("customerPhone", event.target.value)}
                        placeholder="Phone number"
                        className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                      />
                    </div>
                    <textarea
                      value={form.deliveryAddress}
                      onChange={(event) => setFormField("deliveryAddress", event.target.value)}
                      rows="3"
                      placeholder="Delivery address"
                      className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                    />
                  </div>
                )}

                <textarea
                  value={form.specialInstructions}
                  onChange={(event) => setFormField("specialInstructions", event.target.value)}
                  rows="3"
                  placeholder="Ticket instructions"
                  className="w-full rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                />

                <div className="relative">
                  <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
                  <input
                    type="text"
                    value={form.searchTerm}
                    onChange={(event) => setFormField("searchTerm", event.target.value)}
                    placeholder="Search menu..."
                    className="w-full rounded-full border border-[#E4D9CD] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none"
                  />
                </div>

                <div className="grid gap-3">
                  {visibleMenu.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToCart(item)}
                      className="flex items-center justify-between rounded-2xl border border-[#E9DFD4] bg-white px-4 py-4 text-left hover:border-[#1A1A1A] hover:bg-[#FCF8F2]"
                    >
                      <div>
                        <div className="font-medium text-[#1A1A1A]">{item.name}</div>
                        <div className="mt-1 text-xs text-[#7A6B5E]">
                          {item.description || `${item.prep_time_minutes} min prep`}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[#9E6041]">
                        {formatCurrency(resolveMenuItemPrice(item, form.orderType))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="flex flex-col bg-[#FFFCF8]">
                <div className="border-b border-[#EEE5DA] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#F2E9DE] p-3 text-[#A76541]">
                      <HiOutlineShoppingBag className="text-xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif text-[#1F1A17]">Current Cart</h3>
                      <p className="text-sm text-[#6A5B4C]">{form.cart.length} selected item(s)</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {form.cart.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-white px-6 py-10 text-center text-sm text-[#8A7C6D]">
                      Add items to build the order.
                    </div>
                  ) : (
                    form.cart.map((item) => (
                      <article
                        key={item.menu_item_id}
                        className="rounded-3xl border border-[#E6DDD4] bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-[#1A1A1A]">{item.item_name}</h4>
                            <p className="mt-1 text-sm text-[#7A6B5E]">
                              {formatCurrency(item.unit_price)} each
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.menu_item_id)}
                            className="rounded-full bg-[#F6EFE7] p-2 text-[#8A7C6D] hover:bg-[#EDE2D6]"
                          >
                            <HiOutlineX />
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-[#E6DDD4] bg-[#FBF6F0] px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.menu_item_id, -1)}
                              className="rounded-full px-3 py-1 text-sm font-semibold text-[#3A2C21] hover:bg-white"
                            >
                              -
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-[#1F1A17]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.menu_item_id, 1)}
                              className="rounded-full px-3 py-1 text-sm font-semibold text-[#3A2C21] hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-[#1F1A17]">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="border-t border-[#EEE5DA] px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6A5B4C]">Estimated total</span>
                    <span className="text-2xl font-serif text-[#1F1A17]">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={submitOrder}
                    disabled={
                      submitting || form.cart.length === 0 || (form.orderType === "dine_in" && selectableTables.length === 0)
                    }
                    className="mt-5 w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60"
                  >
                    {submitting ? "Placing order..." : "Place Order"}
                  </button>
                </div>
              </aside>
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
