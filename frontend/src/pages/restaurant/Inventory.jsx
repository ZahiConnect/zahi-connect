import React, { useState, useEffect } from 'react';
import { HiOutlineExclamationCircle, HiOutlineCube, HiPlus, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';

export default function Inventory() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        quantity: '',
        unit: 'kg',
        low_stock_threshold: '',
        unit_cost: '',
        supplier: ''
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const data = await restaurantService.getInventory();
            setInventory(data || []);
        } catch (error) {
            console.error("Failed to load inventory from backend", error);
            toast.error("Failed to load inventory.");
            setInventory([]);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                low_stock_threshold: item.low_stock_threshold,
                unit_cost: item.unit_cost || 0,
                supplier: item.supplier || ''
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                category: '',
                quantity: '',
                unit: 'kg',
                low_stock_threshold: '',
                unit_cost: '',
                supplier: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            name: formData.name,
            category: formData.category,
            quantity: parseFloat(formData.quantity),
            unit: formData.unit,
            low_stock_threshold: parseFloat(formData.low_stock_threshold || 0),
            unit_cost: parseFloat(formData.unit_cost || 0),
            supplier: formData.supplier || null
        };

        try {
            if (editingItem) {
                await restaurantService.updateInventoryItem(editingItem.id, payload);
                toast.success('Inventory item updated');
            } else {
                await restaurantService.createInventoryItem(payload);
                toast.success('Inventory item created');
            }
            setIsModalOpen(false);
            fetchInventory();
        } catch (error) {
            console.error("Save error:", error);
            toast.error(editingItem ? 'Failed to update item' : 'Failed to create item');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
        try {
            await restaurantService.deleteInventoryItem(id);
            toast.success("Item deleted");
            fetchInventory();
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    // Calculate low stock dynamically
    const lowStockItems = inventory.filter(item => item.quantity <= item.low_stock_threshold);
    
    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusInfo = (item) => {
        if (item.quantity === 0) return { label: 'CRITICAL', classes: 'bg-red-50 text-red-700 border-red-200' };
        if (item.quantity <= item.low_stock_threshold) return { label: 'LOW STOCK', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
        return { label: 'GOOD', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">Inventory Management</h1>
                    <p className="text-[#666666]">Track ingredients, stock levels, and automated purchase alerts.</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <HiPlus className="text-lg" />
                    Receive Stock
                </button>
            </div>

            {/* Critical Alerts Banner */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-lg shrink-0 mt-0.5">
                        <HiOutlineExclamationCircle className="text-xl text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-red-800 font-medium font-serif text-lg mb-1">Attention Required: Low Stock</h3>
                        <p className="text-red-700 text-sm mb-3">
                            You have {lowStockItems.length} items running dangerously low. Please reorder immediately to avoid shortages.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Inventory Card */}
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center bg-[#FDFCFB] flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#F2F0ED] rounded-lg">
                            <HiOutlineCube className="text-xl text-[#333333]" />
                        </div>
                        <h2 className="text-lg font-serif font-semibold text-[#1A1A1A]">Master Stock List</h2>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Search ingredients..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#FFFFFF] border border-[#E5E5E5] text-sm text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none placeholder-[#A0A0B0] w-64"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F9F9F9] text-[#666666] border-b border-[#E5E5E5]">
                            <tr>
                                <th className="p-4 font-medium">Item Name</th>
                                <th className="p-4 font-medium">Category</th>
                                <th className="p-4 font-medium">Supplier</th>
                                <th className="p-4 font-medium">Stock Level</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F0ED] text-[#333333]">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#888888] italic">Loading inventory...</td>
                                </tr>
                            ) : filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#888888]">
                                        {searchTerm ? 'No items match your search.' : 'Inventory is empty. Add your first item!'}
                                    </td>
                                </tr>
                            ) : filteredInventory.map(item => {
                                const statusInfo = getStatusInfo(item);
                                return (
                                    <tr key={item.id} className="hover:bg-[#FDFCFB] transition-colors group cursor-default">
                                        <td className="p-4 font-medium text-[#1A1A1A]">
                                            {item.name}
                                            <div className="text-xs text-[#888888] font-normal leading-tight mt-0.5">₹{parseFloat(item.unit_cost).toFixed(2)} / {item.unit}</div>    
                                        </td>
                                        <td className="p-4">{item.category}</td>
                                        <td className="p-4 text-[#666666] text-xs font-medium">{item.supplier || '-'}</td>
                                        <td className="p-4 font-serif font-bold text-lg text-[#1A1A1A]">
                                            {item.quantity} <span className="text-xs font-sans font-normal text-[#888888]">{item.unit}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border tracking-wider ${statusInfo.classes}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => openModal(item)} className="text-[#666666] hover:text-[#1A1A1A] font-medium transition-colors">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-[#D97757] hover:text-red-700 font-medium transition-colors">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-[#E5E5E5] bg-[#FDFCFB] flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">
                                {editingItem ? 'Edit Item' : 'Receive New Stock'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#A0A0B0] hover:text-[#1A1A1A] bg-[#F9F9F9] hover:bg-[#F2F0ED] p-2 rounded-md transition-colors">
                                <HiOutlineX className="text-lg" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <form id="inventory-form" onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Item Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        placeholder="e.g. Basmati Rice"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Category *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                            placeholder="Grains"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Supplier</label>
                                        <input 
                                            type="text" 
                                            value={formData.supplier}
                                            onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                            placeholder="Supplier Name"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Quantity / Stock *</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Unit of Measure *</label>
                                        <select 
                                            required
                                            value={formData.unit}
                                            onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        >
                                            <option value="kg">kilograms (kg)</option>
                                            <option value="g">grams (g)</option>
                                            <option value="L">Liters (L)</option>
                                            <option value="ml">Milliliters (ml)</option>
                                            <option value="pieces">Pieces</option>
                                            <option value="boxes">Boxes</option>
                                            <option value="bottles">Bottles</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Cost per Unit (₹)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            value={formData.unit_cost}
                                            onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Low Stock Threshold</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.low_stock_threshold}
                                            onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-[#E5E5E5] bg-[#FDFCFB] shrink-0">
                            <button 
                                form="inventory-form"
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-3 rounded-xl text-white font-medium bg-[#1A1A1A] hover:bg-[#333333] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add to Inventory')}
                            </button>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
}
