import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineRefresh, HiOutlineTrash, HiOutlineUserGroup, HiOutlineX, HiPlus } from "react-icons/hi";
import toast from "react-hot-toast";

import useRestaurantLiveUpdates from "../../hooks/useRestaurantLiveUpdates";
import restaurantService from "../../services/restaurantService";
import { tableStatusClasses } from "../../lib/restaurant";

const createEmptyForm = () => ({
  table_number: "",
  capacity: 4,
  status: "available",
  assigned_staff: "",
});

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const loadTables = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const data = await restaurantService.getTables();
      setTables(data || []);
    } catch (error) {
      console.error("Failed to load tables", error);
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useRestaurantLiveUpdates((event) => {
    if (event?.scopes?.some((scope) => ["tables", "orders", "billing"].includes(scope))) {
      loadTables({ silent: true });
    }
  });

  const openModal = (table = null) => {
    setEditingTable(table);
    setForm(
      table
        ? {
            table_number: table.table_number,
            capacity: table.capacity,
            status: table.status,
            assigned_staff: table.assigned_staff || "",
          }
        : createEmptyForm()
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingTable(null);
    setForm(createEmptyForm());
    setModalOpen(false);
  };

  const saveTable = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        table_number: Number(form.table_number),
        capacity: Number(form.capacity),
        status: form.status,
        assigned_staff: form.assigned_staff || null,
      };

      if (editingTable) await restaurantService.updateTable(editingTable.id, payload);
      else await restaurantService.createTable(payload);

      toast.success(editingTable ? "Table updated" : "Table created");
      closeModal();
      await loadTables({ silent: true });
    } catch (error) {
      console.error("Failed to save table", error);
      toast.error(error.response?.data?.detail || "Failed to save table");
    } finally {
      setSaving(false);
    }
  };

  const quickStatusUpdate = async (tableId, status) => {
    try {
      await restaurantService.updateTableStatus(tableId, { status });
      toast.success("Table status updated");
      await loadTables({ silent: true });
    } catch (error) {
      console.error("Failed to update table status", error);
      toast.error(error.response?.data?.detail || "Failed to update table status");
    }
  };

  const deleteTable = async (tableId) => {
    if (!window.confirm("Delete this table?")) return;

    try {
      await restaurantService.deleteTable(tableId);
      toast.success("Table deleted");
      await loadTables({ silent: true });
    } catch (error) {
      console.error("Failed to delete table", error);
      toast.error(error.response?.data?.detail || "Failed to delete table");
    }
  };

  const counts = useMemo(
    () => ({
      available: tables.filter((table) => table.status === "available").length,
      occupied: tables.filter((table) => table.status === "occupied").length,
      reserved: tables.filter((table) => table.status === "reserved").length,
    }),
    [tables]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">Tables</h1>
          <p className="mt-1 text-[#666666]">
            Manage reservations and floor availability. Dine-in orders automatically lock a table as occupied.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => loadTables({ silent: true })}
            className="inline-flex items-center gap-2 rounded-full border border-[#D9CCC0] bg-white px-4 py-2.5 text-sm font-medium text-[#3A2C21] hover:bg-[#FBF6F0]"
          >
            <HiOutlineRefresh className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333333]"
          >
            <HiPlus className="text-lg" />
            Add Table
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">{status}</p>
            <h2 className="mt-3 text-3xl font-serif text-[#21170F]">{count}</h2>
            <p className="mt-2 text-sm text-[#655649]">Tables currently marked {status}.</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[#E7DCCF] bg-[#FBF6F0] px-5 py-4 text-sm text-[#5F5144]">
        Reserved and occupied tables are blocked from new dine-in orders. If a table has an active dine-in bill, the backend will prevent it from being marked available until payment is settled.
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DDD2C5] bg-white px-6 py-10 text-center text-sm text-[#8A7C6D]">
          No tables found yet. Add your first table to start taking dine-in orders.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <article key={table.id} className="rounded-3xl border border-[#ECE5DD] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-serif text-[#1F1A17]">T-{table.table_number}</h2>
                  <p className="mt-2 text-sm text-[#655649]">Seats {table.capacity}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    tableStatusClasses[table.status] || tableStatusClasses.available
                  }`}
                >
                  {table.status}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#FBF6F0] px-4 py-3 text-sm text-[#5F5144]">
                <div className="flex items-center gap-2">
                  <HiOutlineUserGroup />
                  <span>{table.assigned_staff || "No staff assigned"}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {["available", "occupied", "reserved"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => quickStatusUpdate(table.id, status)}
                    className={`rounded-2xl px-3 py-2 text-xs font-semibold capitalize ${
                      table.status === status
                        ? "bg-[#1A1A1A] text-white"
                        : "border border-[#E4D9CD] bg-white text-[#5F5144] hover:bg-[#FBF6F0]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openModal(table)}
                  className="text-sm font-medium text-[#9E6041] hover:text-[#7E4A2D]"
                >
                  Edit table
                </button>
                <button
                  type="button"
                  onClick={() => deleteTable(table.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:text-rose-900"
                >
                  <HiOutlineTrash />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
              <div>
                <h2 className="text-2xl font-serif text-[#1A1A1A]">
                  {editingTable ? "Edit Table" : "Add Table"}
                </h2>
                <p className="mt-1 text-sm text-[#666666]">Keep the floor plan clean and accurate.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-[#F4EFE8] p-2 text-[#6A5B4C] hover:bg-[#ECE3D8]"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            <form onSubmit={saveTable} className="space-y-4 px-6 py-6">
              <input
                type="number"
                min="1"
                required
                value={form.table_number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, table_number: event.target.value }))
                }
                placeholder="Table number"
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              />
              <select
                value={form.capacity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, capacity: event.target.value }))
                }
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              >
                {[2, 4, 6, 8, 10, 12].map((capacity) => (
                  <option key={capacity} value={capacity}>
                    {capacity} seats
                  </option>
                ))}
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>
              <input
                type="text"
                value={form.assigned_staff}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assigned_staff: event.target.value }))
                }
                placeholder="Assigned staff (optional)"
                className="w-full rounded-2xl border border-[#E4D9CD] px-4 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-60"
              >
                {saving ? "Saving..." : editingTable ? "Save Changes" : "Create Table"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
