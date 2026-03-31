import { useEffect, useState } from "react";
import { HiOutlineCube, HiOutlineExclamationCircle, HiOutlineX, HiPlus } from "react-icons/hi";
import toast from "react-hot-toast";

import restaurantService from "../../services/restaurantService";
import { formatCurrency } from "../../lib/restaurant";

const initialForm = {
  name: "",
  category: "General",
  supplier: "",
  quantity: "",
  unit: "kg",
  low_stock_threshold: "",
  unit_cost: "",
};

const unitOptions = ["kg", "grams", "litres", "ml", "pieces", "boxes", "bottles"];

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await restaurantService.getInventory();
      setItems(data || []);
    } catch (error) {
      console.error("Failed to load inventory", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openModal = (item = null) => {
    setEditingItem(item);
    setForm(
      item
        ? {
            name: item.name,
            category: item.category || "General",
            supplier: item.supplier || "",
            quantity: item.quantity,
            unit: item.unit,
            low_stock_threshold: item.low_stock_threshold,
            unit_cost: item.unit_cost || "",
          }
        : initialForm
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setForm(initialForm);
    setModalOpen(false);
  };

  const saveItem = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        category: form.category || "General",
        supplier: form.supplier || null,
        quantity: Number(form.quantity),
        unit: form.unit,
        low_stock_threshold: Number(form.low_stock_threshold || 0),
        unit_cost: Number(form.unit_cost || 0),
      };

      if (editingItem) await restaurantService.updateInventoryItem(editingItem.id, payload);
      else await restaurantService.createInventoryItem(payload);

      toast.success(editingItem ? "Inventory item updated" : "Inventory item created");
      closeModal();
      await loadInventory();
    } catch (error) {
      console.error("Failed to save inventory item", error);
      toast.error(error.response?.data?.detail || "Failed to save inventory item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Delete this inventory item?")) return;

    try {
      await restaurantService.deleteInventoryItem(itemId);
      toast.success("Inventory item deleted");
      await loadInventory();
    } catch (error) {
      console.error("Failed to delete inventory item", error);
      toast.error(error.response?.data?.detail || "Failed to delete inventory item");
    }
  };

  const filteredItems = items.filter((item) =>
    `${item.name} ${item.category || ""} ${item.supplier || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const lowStockItems = items.filter((item) => item.is_low_stock);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">Inventory</h1>
          <p className="mt-1 text-[#666666]">Track ingredients, suppliers, and low-stock risk in one place.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333333]">
          <HiPlus className="text-lg" />
          Add Stock Item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
            <HiOutlineExclamationCircle className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-rose-900">Low stock attention needed</h2>
            <p className="mt-2 text-sm text-rose-700">
              {lowStockItems.length} inventory item(s) are already at or below their threshold.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#F2E9DE] p-3 text-[#A76541]">
              <HiOutlineCube className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-[#1F1A17]">Stock Register</h2>
              <p className="text-sm text-[#6A5B4C]">{items.length} tracked item(s)</p>
            </div>
          </div>
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search inventory..." className="w-full max-w-sm rounded-full border border-[#DDCDBF] bg-[#FBF6F0] px-4 py-3 text-sm text-[#3A2C21] outline-none" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-[#ECE5DD] text-[#7A6B5E]">
              <tr>
                <th className="pb-4 font-medium">Item</th>
                <th className="pb-4 font-medium">Category</th>
                <th className="pb-4 font-medium">Supplier</th>
                <th className="pb-4 font-medium">Stock</th>
                <th className="pb-4 font-medium">Threshold</th>
                <th className="pb-4 font-medium">Cost</th>
                <th className="pb-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EAE1] text-[#3A2C21]">
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center text-[#8A7C6D]">Loading inventory...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-[#8A7C6D]">No inventory items found.</td></tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-5 pr-4">
                    <div className="font-medium text-[#1F1A17]">{item.name}</div>
                    <div className="mt-2 text-xs text-[#7A6B5E]">{item.is_low_stock ? "Low stock" : "Healthy stock"}</div>
                  </td>
                  <td className="py-5 pr-4">{item.category || "General"}</td>
                  <td className="py-5 pr-4">{item.supplier || "-"}</td>
                  <td className="py-5 pr-4 font-serif text-base text-[#1F1A17]">{item.quantity} <span className="text-xs font-sans text-[#7A6B5E]">{item.unit}</span></td>
                  <td className="py-5 pr-4">{item.low_stock_threshold} {item.unit}</td>
                  <td className="py-5 pr-4">{formatCurrency(item.unit_cost)}</td>
                  <td className="py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => openModal(item)} className="text-sm font-medium text-[#9E6041] hover:text-[#7E4A2D]">Edit</button>
                      <button type="button" onClick={() => deleteItem(item.id)} className="text-sm font-medium text-rose-700 hover:text-rose-900">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
              <h2 className="text-2xl font-serif text-[#1A1A1A]">{editingItem ? "Edit Stock Item" : "Add Stock Item"}</h2>
              <button type="button" onClick={closeModal} className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"><HiOutlineX className="text-lg" /></button>
            </div>

            <form onSubmit={saveItem} className="space-y-4 px-6 py-6">
              <input type="text" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Item name" className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
                <input type="text" value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="Supplier (optional)" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" step="0.01" min="0" required value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
                <select value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none">
                  {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" step="0.01" min="0" required value={form.low_stock_threshold} onChange={(event) => setForm((current) => ({ ...current, low_stock_threshold: event.target.value }))} placeholder="Low stock threshold" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
                <input type="number" step="0.01" min="0" value={form.unit_cost} onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))} placeholder="Unit cost" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60">
                {saving ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
