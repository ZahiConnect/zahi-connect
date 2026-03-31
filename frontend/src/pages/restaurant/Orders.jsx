import React, { useState, useEffect } from 'react';
import { HiPlus, HiOutlineShoppingBag, HiOutlineX, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [orderType, setOrderType] = useState('dine_in');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedOrders, fetchedMenu] = await Promise.all([
                restaurantService.getOrders(),
                restaurantService.getMenu()
            ]);
            setOrders(fetchedOrders || []);
            setMenuItems(fetchedMenu || []);
        } catch (error) {
            console.error("Fetch error", error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(cartItem => cartItem.menu_item_id === item.id);
            if (existing) {
                return prev.map(cartItem => 
                    cartItem.menu_item_id === item.id 
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
                );
            }
            return [...prev, {
                menu_item_id: item.id,
                item_name: item.name,
                unit_price: item.dine_in_price,
                quantity: 1
            }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(c => c.menu_item_id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(c => {
            if (c.menu_item_id === id) {
                const newQ = c.quantity + delta;
                return { ...c, quantity: newQ > 0 ? newQ : 1 };
            }
            return c;
        }));
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            toast.error("Please add items to the order");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                order_type: orderType,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                items: cart
            };
            
            await restaurantService.createOrder(payload);
            toast.success("Order created successfully!");
            
            // Reset form
            setIsNewOrderModalOpen(false);
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setOrderType('dine_in');
            setSearchTerm('');
            
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create order");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await restaurantService.updateOrderStatus(orderId, newStatus);
            toast.success("Status updated");
            fetchData();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">Orders</h1>
                    <p className="text-[#666666]">Manage active orders and dispatch.</p>
                </div>
                <button 
                    onClick={() => setIsNewOrderModalOpen(true)}
                    className="bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <HiPlus className="text-lg" />
                    New Order
                </button>
            </div>

            {/* Orders Table */}
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#E5E5E5] bg-[#FDFCFB] flex items-center gap-3">
                    <div className="p-2 bg-[#F2F0ED] rounded-lg">
                        <HiOutlineShoppingBag className="text-xl text-[#333333]" />
                    </div>
                    <h2 className="text-lg font-serif font-semibold text-[#1A1A1A]">Active Orders</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F9F9F9] text-[#666666] border-b border-[#E5E5E5]">
                            <tr>
                                <th className="p-4 font-medium">Order ID</th>
                                <th className="p-4 font-medium">Type / Customer</th>
                                <th className="p-4 font-medium">Items</th>
                                <th className="p-4 font-medium">Total</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F0ED] text-[#333333]">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#888888] italic">Loading orders...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#888888]">No orders found. Create a new one!</td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-[#FDFCFB] transition-colors group">
                                        <td className="p-4 font-bold text-[#1A1A1A] uppercase text-xs">
                                            #{order.id.split('-')[0]}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold">{order.order_type.replace('_', ' ').toUpperCase()}</div>
                                            {(order.customer_name || order.customer_phone) && (
                                                <div className="text-xs text-[#666666] mt-0.5">{order.customer_name} {order.customer_phone}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-[#666666]">
                                            {order.items.length} items
                                        </td>
                                        <td className="p-4 font-serif font-semibold">
                                            ₹{parseFloat(order.total_amount).toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                                                order.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                order.status === 'preparing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                order.status === 'ready' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                                {order.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {order.status === 'new' && (
                                                <button onClick={() => updateStatus(order.id, 'preparing')} className="text-amber-600 hover:text-amber-800 text-sm font-medium">To Kitchen</button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button onClick={() => updateStatus(order.id, 'ready')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Mark Ready</button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button onClick={() => updateStatus(order.id, 'completed')} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">Complete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Order Modal / Drawer */}
            {isNewOrderModalOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="px-6 py-5 border-b border-[#E5E5E5] bg-[#FDFCFB] flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Create Custom Order</h2>
                            <button onClick={() => setIsNewOrderModalOpen(false)} className="text-[#A0A0B0] hover:text-[#1A1A1A] bg-[#F9F9F9] hover:bg-[#F2F0ED] p-2 rounded-md transition-colors">
                                <HiOutlineX className="text-lg" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                            
                            {/* Order Details Form */}
                            <section>
                                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4 border-b border-[#E5E5E5] pb-2">1. Order Details</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <input type="radio" name="order_type" value="dine_in" checked={orderType === 'dine_in'} onChange={(e) => setOrderType(e.target.value)} className="sr-only peer" />
                                            <div className="p-3 border rounded-lg text-center font-medium text-sm peer-checked:bg-[#1A1A1A] peer-checked:text-white peer-checked:border-[#1A1A1A] text-[#666666] border-[#E5E5E5] transition-colors">
                                                Dine-In
                                            </div>
                                        </label>
                                        <label className="flex-1 cursor-pointer">
                                            <input type="radio" name="order_type" value="delivery" checked={orderType === 'delivery'} onChange={(e) => setOrderType(e.target.value)} className="sr-only peer" />
                                            <div className="p-3 border rounded-lg text-center font-medium text-sm peer-checked:bg-[#1A1A1A] peer-checked:text-white peer-checked:border-[#1A1A1A] text-[#666666] border-[#E5E5E5] transition-colors">
                                                Delivery
                                            </div>
                                        </label>
                                    </div>
                                    
                                    {orderType === 'delivery' && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-medium text-[#666666] mb-1">Customer Name</label>
                                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#8A7DF0] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-[#666666] mb-1">Phone Number</label>
                                                <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#8A7DF0] outline-none" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Menu Selection */}
                            <section>
                                <div className="flex justify-between items-center mb-4 border-b border-[#E5E5E5] pb-2">
                                    <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">2. Add Items</h3>
                                    <div className="relative w-48">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#A0A0B0]">
                                            <HiOutlineSearch className="text-sm" />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Search items..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#F9F9F9] border border-[#E5E5E5] text-[#333333] rounded-md pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-[#8A7DF0] outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {menuItems
                                        .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(item => (
                                        <div key={item.id} onClick={() => addToCart(item)} className="p-3 border border-[#E5E5E5] rounded-lg cursor-pointer hover:border-[#1A1A1A] hover:bg-[#FDFCFB] transition-all group bg-white flex justify-between items-center">
                                            <div className="font-medium text-[#1A1A1A] text-sm group-hover:text-[#8A7DF0] transition-colors">{item.name}</div>
                                            <div className="text-xs font-semibold text-[#666666]">₹{parseFloat(item.dine_in_price).toFixed(2)}</div>
                                        </div>
                                    ))}
                                    {menuItems.length > 0 && menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <div className="text-sm text-[#888888] italic text-center py-4">No matches found.</div>
                                    )}
                                    {menuItems.length === 0 && <span className="text-sm text-[#888888] italic">No items available in menu.</span>}
                                </div>
                            </section>

                            {/* Cart Summary */}
                            <section className="flex-1 flex flex-col">
                                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4 border-b border-[#E5E5E5] pb-2">3. Current Order</h3>
                                {cart.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-[#A0A0B0] text-sm italic">
                                        Tap items above to add them to the order.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {cart.map(c => (
                                            <div key={c.menu_item_id} className="flex items-center justify-between p-3 bg-[#F9F9F9] rounded-lg border border-[#E5E5E5]">
                                                <div>
                                                    <div className="text-sm font-medium text-[#1A1A1A]">{c.item_name}</div>
                                                    <div className="text-xs text-[#666666]">₹{parseFloat(c.unit_price).toFixed(2)}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-white border border-[#E5E5E5] rounded py-1 px-2 shrink-0">
                                                        <button type="button" onClick={() => updateQuantity(c.menu_item_id, -1)} className="text-[#666666] hover:text-[#1A1A1A] px-1 font-bold">-</button>
                                                        <span className="text-xs font-semibold w-6 text-center text-[#1A1A1A]">{c.quantity}</span>
                                                        <button type="button" onClick={() => updateQuantity(c.menu_item_id, 1)} className="text-[#666666] hover:text-[#1A1A1A] px-1 font-bold">+</button>
                                                    </div>
                                                    <button onClick={() => removeFromCart(c.menu_item_id)} className="text-[#A0A0B0] hover:text-red-500 transition-colors p-1">
                                                        <HiOutlineX />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                        </div>

                        {/* Footer Action */}
                        <div className="p-6 border-t border-[#E5E5E5] bg-[#FDFCFB] shrink-0">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-[#666666] text-sm">Total Amount</span>
                                <span className="text-2xl font-serif font-bold text-[#1A1A1A]">₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <button 
                                onClick={handleCreateOrder} 
                                disabled={isSubmitting || cart.length === 0}
                                className="w-full py-3.5 rounded-xl text-white font-medium bg-[#1A1A1A] hover:bg-[#333333] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Processing...' : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
