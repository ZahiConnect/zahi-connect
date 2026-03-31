import { useEffect, useRef, useState } from "react";
import {
  HiOutlinePencilAlt,
  HiOutlinePhotograph,
  HiOutlineSearch,
  HiOutlineTrash,
  HiPlus,
  HiX,
} from "react-icons/hi";
import toast from "react-hot-toast";

import restaurantService from "../../services/restaurantService";
import { formatCurrency, getFoodTypeLabel } from "../../lib/restaurant";

const initialForm = {
  name: "",
  description: "",
  dine_in_price: "",
  delivery_price: "",
  prep_time_minutes: 15,
  category_id: "",
  food_type: "veg",
  is_available: true,
  imageFile: null,
  imagePreview: null,
};

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [form, setForm] = useState(initialForm);
  const fileInputRef = useRef(null);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const [nextCategories, nextItems] = await Promise.all([
        restaurantService.getMenuCategories(),
        restaurantService.getMenu(),
      ]);
      setCategories(nextCategories || []);
      setItems(nextItems || []);
    } catch (error) {
      console.error("Failed to load menu", error);
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      ...initialForm,
      category_id: categories[0]?.id || "",
    });
  };

  const openItemModal = (item = null) => {
    if (!item && categories.length === 0) {
      toast.error("Create a category first");
      return;
    }

    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        description: item.description || "",
        dine_in_price: item.dine_in_price,
        delivery_price: item.delivery_price || "",
        prep_time_minutes: item.prep_time_minutes || 15,
        category_id: item.category_id,
        food_type: item.food_type,
        is_available: item.is_available,
        imageFile: null,
        imagePreview: item.image_url || null,
      });
    } else {
      resetForm();
    }

    setItemModalOpen(true);
  };

  const closeItemModal = () => {
    setItemModalOpen(false);
    resetForm();
  };

  const createCategory = async (event) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;

    setSavingCategory(true);
    try {
      await restaurantService.createMenuCategory({ name: newCategoryName.trim() });
      toast.success("Category created");
      setNewCategoryName("");
      setCategoryModalOpen(false);
      await loadMenu();
    } catch (error) {
      console.error("Failed to create category", error);
      toast.error(error.response?.data?.detail || "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  const saveItem = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        description: form.description,
        dine_in_price: Number(form.dine_in_price),
        delivery_price: form.delivery_price ? Number(form.delivery_price) : null,
        prep_time_minutes: Number(form.prep_time_minutes),
        category_id: form.category_id,
        food_type: form.food_type,
        is_available: form.is_available,
      };

      let savedItem;
      if (editingItem) savedItem = await restaurantService.updateMenuItem(editingItem.id, payload);
      else savedItem = await restaurantService.createMenuItem(payload);

      if (form.imageFile) {
        await restaurantService.uploadMenuItemImage(savedItem.id, form.imageFile);
      }

      toast.success(editingItem ? "Menu item updated" : "Menu item created");
      closeItemModal();
      await loadMenu();
    } catch (error) {
      console.error("Failed to save menu item", error);
      toast.error(error.response?.data?.detail || "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      await restaurantService.deleteMenuItem(itemId);
      toast.success("Menu item deleted");
      await loadMenu();
    } catch (error) {
      console.error("Failed to delete menu item", error);
      toast.error(error.response?.data?.detail || "Failed to delete menu item");
    }
  };

  const visibleItems = items.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
    const matchesSearch = `${item.name} ${item.description || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">Menu Management</h1>
          <p className="mt-1 text-[#666666]">Keep categories, pricing, and live availability in sync.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setCategoryModalOpen(true)} className="rounded-full border border-[#D9CCC0] bg-white px-4 py-2.5 text-sm font-medium text-[#3A2C21] hover:bg-[#FBF6F0]">
            Add Category
          </button>
          <button type="button" onClick={() => openItemModal()} className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333333]">
            <HiPlus className="text-lg" />
            Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveCategory("all")} className={`rounded-full px-4 py-2 text-sm font-medium ${activeCategory === "all" ? "bg-[#1A1A1A] text-white" : "border border-[#E5E5E5] bg-white text-[#666666]"}`}>
            All Items
          </button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} className={`rounded-full px-4 py-2 text-sm font-medium ${activeCategory === category.id ? "bg-[#1A1A1A] text-white" : "border border-[#E5E5E5] bg-white text-[#666666]"}`}>
              {category.name}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8A7B]" />
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search menu items..." className="w-full rounded-full border border-[#DDCDBF] bg-[#FBF6F0] py-3 pl-11 pr-4 text-sm text-[#3A2C21] outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, index) => <div key={index} className="h-72 animate-pulse rounded-3xl bg-white" />)}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const category = categories.find((entry) => entry.id === item.category_id);
            return (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-[#ECE5DD] bg-white shadow-sm">
                <div className="relative h-44 border-b border-[#ECE5DD] bg-[#F3ECE4]">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><HiOutlinePhotograph className="text-5xl text-[#C9BDB0]" /></div>}
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#3A2C21]">{getFoodTypeLabel(item.food_type)}</div>
                  <div className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${item.is_available ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {item.is_available ? "Available" : "Out of Stock"}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-serif text-[#1F1A17]">{item.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#655649]">{item.description || "No description added yet."}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-serif text-[#1F1A17]">{formatCurrency(item.dine_in_price)}</div>
                      <div className="mt-1 text-xs text-[#8A7C6D]">{item.prep_time_minutes} min</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1E8DE] pt-4 text-xs uppercase tracking-[0.16em] text-[#9A8A7B]">
                    <span>{category?.name || "Uncategorized"}</span>
                    <span>{item.delivery_price ? `Delivery ${formatCurrency(item.delivery_price)}` : "Same delivery price"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => openItemModal(item)} className="inline-flex items-center gap-2 text-sm font-medium text-[#9E6041] hover:text-[#7E4A2D]">
                      <HiOutlinePencilAlt />
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteItem(item.id)} className="inline-flex items-center gap-2 text-sm font-medium text-rose-700 hover:text-rose-900">
                      <HiOutlineTrash />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {!loading && visibleItems.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-white px-6 py-10 text-center text-sm text-[#8A7C6D]">
              No menu items match the current filters.
            </div>
          )}
        </div>
      )}

      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
              <h2 className="text-2xl font-serif text-[#1A1A1A]">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
              <button type="button" onClick={closeItemModal} className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"><HiX className="text-lg" /></button>
            </div>

            <form onSubmit={saveItem} className="space-y-4 px-6 py-6">
              <div onClick={() => fileInputRef.current?.click()} className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#E4D9CD] bg-[#FBF6F0]">
                {form.imagePreview ? <img src={form.imagePreview} alt="Preview" className="h-full w-full rounded-3xl object-cover" /> : <><HiOutlinePhotograph className="text-4xl text-[#C9BDB0]" /><span className="mt-3 text-sm text-[#6A5B4C]">Click to upload item image</span></>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setForm((current) => ({ ...current, imageFile: file, imagePreview: URL.createObjectURL(file) }));
              }} />

              <input type="text" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Item name" className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="3" placeholder="Description" className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />

              <div className="grid gap-4 sm:grid-cols-2">
                <select required value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))} className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none">
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input type="number" step="0.01" min="0" required value={form.dine_in_price} onChange={(event) => setForm((current) => ({ ...current, dine_in_price: event.target.value }))} placeholder="Dine-in price" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" step="0.01" min="0" value={form.delivery_price} onChange={(event) => setForm((current) => ({ ...current, delivery_price: event.target.value }))} placeholder="Delivery price (optional)" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
                <input type="number" min="1" value={form.prep_time_minutes} onChange={(event) => setForm((current) => ({ ...current, prep_time_minutes: event.target.value }))} placeholder="Prep time in minutes" className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <select value={form.food_type} onChange={(event) => setForm((current) => ({ ...current, food_type: event.target.value }))} className="rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none">
                  <option value="veg">Veg</option>
                  <option value="non_veg">Non-Veg</option>
                </select>
                <label className="flex items-center justify-between rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm text-[#3A2C21]">
                  <span>{form.is_available ? "Available" : "Out of Stock"}</span>
                  <input type="checkbox" checked={form.is_available} onChange={(event) => setForm((current) => ({ ...current, is_available: event.target.checked }))} />
                </label>
              </div>

              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60">
                {saving ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
              <h2 className="text-2xl font-serif text-[#1A1A1A]">New Category</h2>
              <button type="button" onClick={() => setCategoryModalOpen(false)} className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"><HiX className="text-lg" /></button>
            </div>
            <form onSubmit={createCategory} className="space-y-4 px-6 py-6">
              <input type="text" required value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Category name" className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none" />
              <button type="submit" disabled={savingCategory} className="w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60">
                {savingCategory ? "Saving..." : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
