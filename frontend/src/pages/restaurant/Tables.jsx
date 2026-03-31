import React, { useState, useEffect } from 'react';
import { HiPlus, HiOutlineUserGroup, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'available': return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300';
        case 'occupied': return 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300';
        case 'reserved': return 'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300';
        default: return 'bg-[#F9F9F9] border-[#E5E5E5] text-[#888888]';
    }
};

export default function Tables() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for adding a table
    const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState('4');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const data = await restaurantService.getTables();
            setTables(data || []);
        } catch (error) {
            console.error("Error fetching tables", error);
            // Don't inject mock data anymore to avoid confusion, show empty instead
            toast.error("Failed to load tables from server");
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTable = async (e) => {
        e.preventDefault();
        
        if (!newTableNumber || !newTableCapacity) {
            toast.error("Please fill all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await restaurantService.createTable({
                table_number: parseInt(newTableNumber),
                capacity: parseInt(newTableCapacity),
                status: 'available'
            });
            toast.success("Table added successfully!");
            setIsAddTableModalOpen(false);
            setNewTableNumber('');
            setNewTableCapacity('4');
            fetchTables();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add table");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusToggle = async (table) => {
        // Simple rotation: available -> occupied -> reserved -> available
        let nextStatus = 'available';
        if (table.status === 'available') nextStatus = 'occupied';
        else if (table.status === 'occupied') nextStatus = 'reserved';
        
        try {
            await restaurantService.updateTableStatus(table.id, nextStatus);
            toast.success(`Table ${table.table_number} marked as ${nextStatus}`);
            fetchTables();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">POS & Floor Plan</h1>
                    <p className="text-[#666666]">Manage table occupancies and layout.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsAddTableModalOpen(true)}
                        className="bg-[#FFFFFF] hover:bg-[#F9F9F9] border border-[#E5E5E5] text-[#333333] px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <HiPlus className="text-lg" />
                        Add Table
                    </button>
                    <button className="bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                        Refresh
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-6 items-center py-2 bg-white px-5 rounded-lg border border-[#E5E5E5] shadow-sm max-w-max">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-[#666666]">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm font-medium text-[#666666]">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-[#666666]">Reserved</span>
                </div>
            </div>

            {/* Floor Plan Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : tables.length === 0 ? (
                <div className="bg-white border text-center border-[#E5E5E5] rounded-xl p-10 flex flex-col items-center justify-center">
                    <p className="text-[#666666] mb-4">No tables found for this restaurant.</p>
                    <button onClick={() => setIsAddTableModalOpen(true)} className="text-[#8A7DF0] font-medium hover:underline">
                        Create your first table
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {tables.map(table => (
                        <div 
                            key={table.id} 
                            onClick={() => handleStatusToggle(table)}
                            className={`relative group cursor-pointer border rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 shadow-sm ${getStatusColor(table.status)}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-2xl font-serif font-semibold text-[#1A1A1A]">T-{table.table_number}</h3>
                                <div className="flex items-center gap-1 text-sm bg-white/60 px-2 py-1 rounded-md border border-black/5">
                                    <HiOutlineUserGroup className="text-[#666666]" />
                                    <span className="font-medium text-[#333333]">{table.capacity}</span>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <span className="uppercase text-xs font-bold tracking-wider">
                                    {table.status}
                                </span>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-white/90 rounded-xl opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity flex flex-col items-center justify-center gap-3 border border-[#E5E5E5] shadow-md z-10">
                                <span className="text-xs font-semibold text-[#666666] tracking-wider uppercase mb-1">Click to toggle</span>
                                <div className="flex gap-2 text-sm font-medium">
                                    {table.status === 'available' ? '→ Occupy' : table.status === 'occupied' ? '→ Reserve' : '→ Available'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Table Modal */}
            {isAddTableModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#E5E5E5] flex justify-between items-center bg-[#FDFCFB]">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">New Table</h2>
                            <button onClick={() => setIsAddTableModalOpen(false)} className="text-[#A0A0B0] hover:text-[#1A1A1A] bg-[#F9F9F9] hover:bg-[#F2F0ED] p-1.5 rounded-md transition-colors">
                                <HiOutlineX className="text-lg" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form id="table-form" onSubmit={handleAddTable} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Table Number *</label>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        required
                                        min="1"
                                        value={newTableNumber}
                                        onChange={(e) => setNewTableNumber(e.target.value)}
                                        className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none transition-shadow"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Seat Capacity *</label>
                                    <select
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(e.target.value)}
                                        className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                    >
                                        <option value="2">2 Seats</option>
                                        <option value="4">4 Seats</option>
                                        <option value="6">6 Seats</option>
                                        <option value="8">8 Seats</option>
                                        <option value="12">12 Seats (Large)</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-[#E5E5E5] bg-[#FDFCFB] flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAddTableModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#666666] hover:bg-[#F2F0ED] transition-colors border border-transparent hover:border-[#E5E5E5]">
                                Cancel
                            </button>
                            <button form="table-form" type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1A1A1A] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSubmitting ? 'Saving...' : 'Add Table'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
