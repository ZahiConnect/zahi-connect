import { useEffect, useState } from "react";
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineShoppingBag, HiOutlineX, HiPlus } from "react-icons/hi";
import toast from "react-hot-toast";

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
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [form, setForm] = useState(emptyForm());

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [nextOrders, nextMenu, nextTables] = await Promise.all([
        restaurantService.getOrders({
          status: statusFilter === "all" ? undefined : statusFilter,
          order_type: sourceFilter === "all" ? undefined : sourceFilter,
        }),
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
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, sourceFilter]);

  const setFormField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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
            unit_price: Number(item.dine_in_price || 0),
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
    if (form.orderType === "dine_in" && !form.tableId) return toast.error("Select a table");
    if (form.orderType === "delivery" && !form.deliveryAddress.trim()) {
      return toast.error("Delivery address is required");
    }

    setSubmitting(true);
    try {
      await restaurantService.createOrder({
        order_type: form.orderType,
        table_id: form.orderType === "dine_in" ? form.tableId : null,
        customer_name: form.customerName || null,
        customer_phone: form.customerPhone || null,
        delivery_address: form.orderType === "delivery" ? form.deliveryAddress || null : null,
        special_instructions: form.specialInstructions || null,
        items: form.cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity })),
      });
      toast.success("Order created");
      closeDrawer();
      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to create order", error);
      toast.error(error.response?.data?.detail || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (orderId, newStatus) => {
    try {
      setBusyOrderId(orderId);
      await restaurantService.updateOrderStatus(orderId, newStatus);
      toast.success("Order updated");
      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to update order", error);
      toast.error(error.response?.data?.detail || "Failed to update order");
    } finally {
      setBusyOrderId("");
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

  const filteredOrders = orders.filter((order) => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      order.id,
      order.customer_name,
      order.customer_phone,
      order.order_type,
      order.status,
      order.table_number ? `table ${order.table_number}` : "",
      ...(order.items || []).map((item) => item.item_name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const visibleMenu = menuItems.filter((item) =>
    `${item.name} ${item.description || ""}`.toLowerCase().includes(form.searchTerm.toLowerCase())
  );
  const availableTables = tables.filter((table) => table.status !== "occupied");
  const cartTotal = form.cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">Orders</h1>
          <p className="mt-1 text-[#666666]">Manage live tickets from creation to completion.</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            New Order
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-full border border-[#DDCDBF] bg-[#FBF6F0] px-4 py-3 text-sm text-[#3A2C21] outline-none">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-full border border-[#DDCDBF] bg-[#FBF6F0] px-4 py-3 text-sm text-[#3A2C21] outline-none">
          <option value="all">All sources</option>
          {ORDER_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="relative">
          <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search orders or items..."
            className="w-full rounded-full border border-[#DDCDBF] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-[#ECE5DD] text-[#7A6B5E]">
            <tr>
              <th className="pb-4 font-medium">Order</th>
              <th className="pb-4 font-medium">Guest / Table</th>
              <th className="pb-4 font-medium">Items</th>
              <th className="pb-4 font-medium">Created</th>
              <th className="pb-4 font-medium">Total</th>
              <th className="pb-4 font-medium">Status</th>
              <th className="pb-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EAE1] text-[#3A2C21]">
            {loading ? (
              <tr><td colSpan="7" className="py-10 text-center text-[#8A7C6D]">Loading orders...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="7" className="py-10 text-center text-[#8A7C6D]">No orders found.</td></tr>
            ) : filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="py-5 pr-4">
                  <div className="font-semibold uppercase tracking-[0.14em] text-[#9E6041]">#{order.id.slice(0, 8)}</div>
                  <div className="mt-2 text-xs text-[#7A6B5E]">{formatOrderSourceLabel(order.order_type)}</div>
                </td>
                <td className="py-5 pr-4">
                  <div className="font-medium text-[#1F1A17]">{order.customer_name || (order.table_number ? `Table ${order.table_number}` : "Walk-in")}</div>
                  <div className="mt-2 text-xs text-[#7A6B5E]">{order.customer_phone || "No phone captured"}</div>
                </td>
                <td className="py-5 pr-4">{(order.items || []).slice(0, 2).map((item) => <div key={item.id} className="text-xs text-[#655649]">{item.quantity}x {item.item_name}</div>)}</td>
                <td className="py-5 pr-4 text-xs text-[#7A6B5E]">{getRelativeTime(order.created_at)}</td>
                <td className="py-5 pr-4 font-serif text-base text-[#1F1A17]">{formatCurrency(order.total_amount)}</td>
                <td className="py-5 pr-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClasses[order.status] || orderStatusClasses.cancelled}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                </td>
                <td className="py-5 text-right">
                  <div className="flex justify-end gap-2">
                    {order.status === "new" && (
                      <>
                        <button type="button" onClick={() => changeStatus(order.id, "preparing")} disabled={busyOrderId === order.id} className="rounded-full bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">To Kitchen</button>
                        <button type="button" onClick={() => cancelOrder(order.id)} disabled={busyOrderId === order.id} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60">Cancel</button>
                      </>
                    )}
                    {order.status === "preparing" && <button type="button" onClick={() => changeStatus(order.id, "ready")} disabled={busyOrderId === order.id} className="rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Mark Ready</button>}
                    {order.status === "ready" && <button type="button" onClick={() => changeStatus(order.id, "completed")} disabled={busyOrderId === order.id} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Complete</button>}
                    {["completed", "cancelled"].includes(order.status) && <span className="text-xs font-medium text-[#8A7C6D]">Closed</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] bg-[#FDFCFB] px-6 py-5">
              <div>
                <h2 className="text-2xl font-serif text-[#1A1A1A]">Create Order</h2>
                <p className="mt-1 text-sm text-[#666666]">Menu pricing is verified from the backend.</p>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"><HiOutlineX className="text-lg" /></button>
            </div>

            <div className="grid flex-1 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6 overflow-y-auto border-r border-[#EEE5DA] p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {ORDER_TYPES.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input type="radio" name="orderType" value={option.value} checked={form.orderType === option.value} onChange={(event) => setFormField("orderType", event.target.value)} className="sr-only peer" />
                      <div className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-center text-sm font-medium text-[#5F5144] peer-checked:border-[#1A1A1A] peer-checked:bg-[#1A1A1A] peer-checked:text-white">{option.label}</div>
                    </label>
                  ))}
                </div>

                {form.orderType === "dine_in" ? (
                  <select value={form.tableId} onChange={(event) => setFormField("tableId", event.target.value)} className="w-full rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none">
                    <option value="">Select a table</option>
                    {availableTables.map((table) => <option key={table.id} value={table.id}>Table {table.table_number} | {table.capacity} seats | {table.status}</option>)}
                  </select>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input type="text" value={form.customerName} onChange={(event) => setFormField("customerName", event.target.value)} placeholder="Customer name" className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none" />
                      <input type="text" value={form.customerPhone} onChange={(event) => setFormField("customerPhone", event.target.value)} placeholder="Phone number" className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none" />
                    </div>
                    {form.orderType === "delivery" && <textarea value={form.deliveryAddress} onChange={(event) => setFormField("deliveryAddress", event.target.value)} rows="3" placeholder="Delivery address" className="rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none" />}
                  </div>
                )}

                <textarea value={form.specialInstructions} onChange={(event) => setFormField("specialInstructions", event.target.value)} rows="3" placeholder="Ticket instructions" className="w-full rounded-2xl border border-[#E4D9CD] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none" />

                <div className="relative">
                  <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
                  <input type="text" value={form.searchTerm} onChange={(event) => setFormField("searchTerm", event.target.value)} placeholder="Search menu..." className="w-full rounded-full border border-[#E4D9CD] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none" />
                </div>

                <div className="grid gap-3">
                  {visibleMenu.map((item) => (
                    <button key={item.id} type="button" onClick={() => addToCart(item)} className="flex items-center justify-between rounded-2xl border border-[#E9DFD4] bg-white px-4 py-4 text-left hover:border-[#1A1A1A] hover:bg-[#FCF8F2]">
                      <div>
                        <div className="font-medium text-[#1A1A1A]">{item.name}</div>
                        <div className="mt-1 text-xs text-[#7A6B5E]">{item.description || `${item.prep_time_minutes} min prep`}</div>
                      </div>
                      <div className="text-sm font-semibold text-[#9E6041]">{formatCurrency(item.dine_in_price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="flex flex-col bg-[#FFFCF8]">
                <div className="border-b border-[#EEE5DA] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#F2E9DE] p-3 text-[#A76541]"><HiOutlineShoppingBag className="text-xl" /></div>
                    <div>
                      <h3 className="text-xl font-serif text-[#1F1A17]">Current Cart</h3>
                      <p className="text-sm text-[#6A5B4C]">{form.cart.length} selected item(s)</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {form.cart.length === 0 ? <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-white px-6 py-10 text-center text-sm text-[#8A7C6D]">Add items to build the order.</div> : form.cart.map((item) => (
                    <article key={item.menu_item_id} className="rounded-3xl border border-[#E6DDD4] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-[#1A1A1A]">{item.item_name}</h4>
                          <p className="mt-1 text-sm text-[#7A6B5E]">{formatCurrency(item.unit_price)} each</p>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.menu_item_id)} className="rounded-full bg-[#F6EFE7] p-2 text-[#8A7C6D] hover:bg-[#EDE2D6]"><HiOutlineX /></button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-[#E6DDD4] bg-[#FBF6F0] px-2 py-1">
                          <button type="button" onClick={() => updateCartQuantity(item.menu_item_id, -1)} className="rounded-full px-3 py-1 text-sm font-semibold text-[#3A2C21] hover:bg-white">-</button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-[#1F1A17]">{item.quantity}</span>
                          <button type="button" onClick={() => updateCartQuantity(item.menu_item_id, 1)} className="rounded-full px-3 py-1 text-sm font-semibold text-[#3A2C21] hover:bg-white">+</button>
                        </div>
                        <span className="text-sm font-semibold text-[#1F1A17]">{formatCurrency(item.unit_price * item.quantity)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="border-t border-[#EEE5DA] px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6A5B4C]">Estimated total</span>
                    <span className="text-2xl font-serif text-[#1F1A17]">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button type="button" onClick={submitOrder} disabled={submitting || form.cart.length === 0} className="mt-5 w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60">
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
