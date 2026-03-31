import React, { useState, useEffect, useRef } from 'react';
import { HiPlus, HiOutlinePencilAlt, HiOutlineTrash, HiOutlinePhotograph, HiOutlineSearch, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';

export default function Menu() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dine_in_price: '',
        category_id: '',
        food_type: 'veg',
        is_available: true,
        imageFile: null,
        imagePreview: null
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [cats, items] = await Promise.all([
                restaurantService.getMenuCategories(),
                restaurantService.getMenu()
            ]);
            setCategories(cats || []);
            setMenuItems(items || []);
        } catch (error) {
            console.error("Error fetching menu data", error);
            toast.error("Failed to load menu. Setup initial data or check connection.");
            
            // Allow creating categories even if fetch failed (maybe empty db)
            if (error.response?.status === 404 || categories.length === 0) {
                // Ignore, we will allow creating items next
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) {
            toast.error("Category name is required");
            return;
        }
        setIsSavingCategory(true);
        try {
            await restaurantService.createMenuCategory({ name: newCategoryName });
            toast.success(`Category '${newCategoryName}' created!`);
            setNewCategoryName('');
            setIsCategoryModalOpen(false);
            fetchInitialData();
        } catch (err) {
            toast.error("Failed to create category");
        } finally {
            setIsSavingCategory(false);
        }
    };

    const openModal = (item = null) => {
        if (categories.length === 0 && !item) {
            toast.error("Please create a category first!");
            return;
        }

        setEditingItem(item);
        if (item) {
            setFormData({
                name: item.name,
                description: item.description || '',
                dine_in_price: item.dine_in_price,
                category_id: item.category_id,
                food_type: item.food_type,
                is_available: item.is_available,
                imageFile: null,
                imagePreview: item.image_url || null
            });
        } else {
            setFormData({
                name: '',
                description: '',
                dine_in_price: '',
                category_id: categories[0]?.id || '',
                food_type: 'veg',
                is_available: true,
                imageFile: null,
                imagePreview: null
            });
        }
        setIsModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                imageFile: file,
                imagePreview: URL.createObjectURL(file)
            }));
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this item?")) {
            try {
                await restaurantService.deleteMenuItem(id);
                toast.success("Menu item deleted");
                setMenuItems(prev => prev.filter(i => i.id !== id));
            } catch (err) {
                toast.error("Failed to delete item");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                dine_in_price: parseFloat(formData.dine_in_price),
                category_id: formData.category_id,
                food_type: formData.food_type,
                is_available: formData.is_available
            };

            let savedItem;
            if (editingItem) {
                savedItem = await restaurantService.updateMenuItem(editingItem.id, payload);
                toast.success("Item updated successfully");
            } else {
                savedItem = await restaurantService.createMenuItem(payload);
                toast.success("Item created successfully");
            }

            // Image Upload
            if (formData.imageFile) {
                toast.loading("Uploading image...", { id: "upload" });
                const updatedWithImage = await restaurantService.uploadMenuItemImage(savedItem.id, formData.imageFile);
                savedItem = updatedWithImage;
                toast.success("Image uploaded successfully", { id: "upload" });
            }

            setIsModalOpen(false);
            fetchInitialData(); // Refresh list
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMenu = activeTab === 'all' 
        ? menuItems 
        : menuItems.filter(item => {
            const cat = categories.find(c => c.id === item.category_id);
            return cat && cat.id === activeTab;
        });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">Menu Management</h1>
                    <p className="text-[#666666]">Customize your offerings, pricing, and availability.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsCategoryModalOpen(true)} className="bg-[#FFFFFF] hover:bg-[#F9F9F9] border border-[#E5E5E5] text-[#333333] px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        Add Category
                    </button>
                    <button onClick={() => openModal()} className="bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                        <HiPlus className="text-lg" />
                        Add New Item
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 py-2">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                            activeTab === 'all' 
                            ? 'bg-[#1A1A1A] text-white' 
                            : 'bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
                        }`}
                    >
                        All Items
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                                activeTab === cat.id 
                                ? 'bg-[#1A1A1A] text-white' 
                                : 'bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="relative w-full lg:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A0A0B0]">
                        <HiOutlineSearch />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search menu items..." 
                        className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-[#8A7DF0] outline-none placeholder-[#A0A0B0]"
                    />
                </div>
            </div>

            {/* Menu Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMenu.map(item => {
                        const cat = categories.find(c => c.id === item.category_id);
                        return (
                            <div key={item.id} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                {/* Image Placeholder */}
                                <div className="h-40 bg-[#F2F0ED] relative flex items-center justify-center border-b border-[#E5E5E5]">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <HiOutlinePhotograph className="text-4xl text-[#D1CEC7]" />
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border bg-[#FFFFFF] text-[#333333] border-[#E5E5E5] shadow-sm`}>
                                            {item.food_type === 'veg' ? '🥦 Veg' : '🍗 Non-Veg'}
                                        </span>
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                                            item.is_available 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-[#F9F9F9] text-[#888888] border-[#E5E5E5]'
                                        }`}>
                                            {item.is_available ? 'Available' : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-serif font-semibold text-[#1A1A1A] leading-tight pr-4">{item.name}</h3>
                                        <span className="font-serif font-semibold text-[#1A1A1A]">${parseFloat(item.dine_in_price).toFixed(2)}</span>
                                    </div>
                                    <p className="text-[#666666] text-sm line-clamp-2 h-10 mb-4">
                                        {item.description}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex justify-between items-center pt-4 border-t border-[#F2F0ED]">
                                        <span className="text-xs font-semibold text-[#A0A0B0] uppercase tracking-wider">{cat ? cat.name : 'Unknown Category'}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal(item)} className="p-1.5 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F2F0ED] rounded border border-transparent transition-colors">
                                                <HiOutlinePencilAlt className="text-lg" />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-[#666666] hover:text-red-600 hover:bg-red-50 rounded border border-transparent transition-colors">
                                                <HiOutlineTrash className="text-lg" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    
                    {/* Add New Card Slot */}
                    <div onClick={() => openModal()} className="border-2 border-dashed border-[#E5E5E5] rounded-xl flex flex-col items-center justify-center p-8 gap-4 hover:border-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors cursor-pointer text-[#666666] hover:text-[#1A1A1A] min-h-[200px]">
                        <div className="w-10 h-10 bg-[#F2F0ED] rounded-full flex items-center justify-center">
                            <HiPlus className="text-xl" />
                        </div>
                        <span className="font-medium text-sm">Add New Item</span>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-[#E5E5E5] flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">{editingItem ? 'Edit Item' : 'Create Item'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#A0A0B0] hover:text-[#1A1A1A] bg-[#F9F9F9] hover:bg-[#F2F0ED] p-1.5 rounded-md transition-colors">
                                <HiX className="text-lg" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="menu-form" onSubmit={handleSubmit} className="space-y-5">
                                
                                {/* Image Upload Component */}
                                <div className="flex flex-col items-center gap-3">
                                    <div 
                                        onClick={triggerFileInput}
                                        className="w-full h-40 border-2 border-dashed border-[#E5E5E5] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#8A7DF0] transition-colors overflow-hidden relative group bg-[#F9F9F9]"
                                    >
                                        {formData.imagePreview ? (
                                            <>
                                                <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 text-black px-4 py-2 rounded-md font-semibold shadow-sm text-sm">Change Image</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlinePhotograph className="text-4xl text-[#D1CEC7] mb-2" />
                                                <span className="text-sm font-medium text-[#666666]">Click to upload product image</span>
                                            </>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/jpeg, image/png, image/webp" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                    />
                                    {formData.imagePreview && (
                                        <button type="button" onClick={() => setFormData(prev => ({...prev, imageFile: null, imagePreview: null}))} className="text-sm text-red-600 font-medium hover:underline">
                                            Remove Image
                                        </button>
                                    )}
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Item Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none transition-shadow"
                                            placeholder="e.g. Classic Margherita Pizza"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Category *</label>
                                        <select 
                                            required
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        >
                                            <option value="" disabled>Select category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Price ($) *</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.dine_in_price}
                                            onChange={(e) => setFormData({...formData, dine_in_price: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none transition-shadow"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Description</label>
                                        <textarea 
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none transition-shadow min-h-[80px]"
                                            placeholder="Briefly describe the dish..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Food Type</label>
                                        <div className="flex gap-4 items-center h-10">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="food_type" value="veg" checked={formData.food_type === 'veg'} onChange={() => setFormData({...formData, food_type: 'veg'})} className="text-[#8A7DF0] focus:ring-[#8A7DF0]" />
                                                <span className="text-sm text-[#333333]">Veg</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="food_type" value="non_veg" checked={formData.food_type === 'non_veg'} onChange={() => setFormData({...formData, food_type: 'non_veg'})} className="text-[#8A7DF0] focus:ring-[#8A7DF0]" />
                                                <span className="text-sm text-[#333333]">Non-Veg</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Availability</label>
                                        <label className="flex items-center gap-3 cursor-pointer h-10">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only peer" checked={formData.is_available} onChange={(e) => setFormData({...formData, is_available: e.target.checked})} />
                                                <div className="w-11 h-6 bg-[#E5E5E5] rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                            </div>
                                            <span className="text-sm font-medium text-[#333333]">{formData.is_available ? 'Available' : 'Out of Stock'}</span>
                                        </label>
                                    </div>

                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-[#E5E5E5] bg-[#FDFCFB] flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#666666] hover:bg-[#F2F0ED] transition-colors border border-transparent hover:border-[#E5E5E5]">
                                Cancel
                            </button>
                            <button form="menu-form" type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSaving ? 'Saving...' : (editingItem ? 'Update Item' : 'Create Item')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#E5E5E5] flex justify-between items-center bg-[#FDFCFB]">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">New Category</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#A0A0B0] hover:text-[#1A1A1A] bg-[#F9F9F9] hover:bg-[#F2F0ED] p-1.5 rounded-md transition-colors">
                                <HiX className="text-lg" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form id="category-form" onSubmit={handleCreateCategory}>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Category Name *</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    required
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none transition-shadow"
                                    placeholder="e.g. Starters, Beverages"
                                />
                            </form>
                        </div>
                        <div className="p-4 border-t border-[#E5E5E5] bg-[#FDFCFB] flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#666666] hover:bg-[#F2F0ED] transition-colors border border-transparent hover:border-[#E5E5E5]">
                                Cancel
                            </button>
                            <button form="category-form" type="submit" disabled={isSavingCategory} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSavingCategory ? 'Saving...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
