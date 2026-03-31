import React, { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineCheckCircle, HiOutlineFire } from 'react-icons/hi';
import toast from 'react-hot-toast';

// Dummy initial data for the Kanban board
const initialKOTs = [
    { id: '1092', table: 'T-04', type: 'Dine-In', time: '10 mins ago', status: 'pending', items: [
        { name: 'Truffle Mushroom Risotto', notes: 'No extra cheese', qty: 1 },
        { name: 'Crispy Calamari', notes: '', qty: 2 }
    ]},
    { id: '1093', table: 'Pickup', type: 'Takeaway', time: '5 mins ago', status: 'pending', items: [
        { name: 'Wagyu Beef Burger', notes: 'Medium Rare', qty: 2 },
        { name: 'Matcha Lava Cake', notes: '', qty: 1 }
    ]},
    { id: '1090', table: 'T-12', type: 'Dine-In', time: '18 mins ago', status: 'cooking', items: [
        { name: 'Grilled Salmon Bowl', notes: 'Sauce on side', qty: 1 }
    ]},
    { id: '1088', table: 'Delivery', type: 'Zomato', time: '25 mins ago', status: 'ready', items: [
        { name: 'Artisan Burrata', notes: '', qty: 3 }
    ]}
];

export default function Kitchen() {
    const [orders, setOrders] = useState(initialKOTs);
    const [isConnecting, setIsConnecting] = useState(false);

    // Placeholder for WebSocket Integration
    useEffect(() => {
        // In a real scenario, this connects to the Kitchen microservice via WebSocket
        // const ws = new WebSocket('ws://api.zahiconnect.com/ws/kitchen/tenant-id');
        setIsConnecting(true);
        const timer = setTimeout(() => {
            setIsConnecting(false);
            toast.success("Live Kitchen Display Connected");
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const moveOrder = (orderId, newStatus) => {
        setOrders(prev => prev.map(o => 
            o.id === orderId ? { ...o, status: newStatus } : o
        ));
        toast.success(`Order #${orderId} moved to ${newStatus}`);
    };

    const getColumnOrders = (status) => orders.filter(o => o.status === status);

    const columns = [
        { id: 'pending', title: 'New Orders', icon: HiOutlineClock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        { id: 'cooking', title: 'Cooking', icon: HiOutlineFire, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        { id: 'ready', title: 'Ready to Serve', icon: HiOutlineCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-10rem)] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center shrink-0 border-b border-[#E5E5E5] pb-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">Kitchen Display (KDS)</h1>
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-sm font-medium text-[#666666]">
                            {isConnecting ? 'Connecting to Kitchen WebSocket...' : 'Live Synced'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {columns.map(col => (
                    <div key={col.id} className="flex flex-col bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl overflow-hidden">
                        {/* Column Header */}
                        <div className={`p-4 border-b border-[#E5E5E5] bg-[#FFFFFF] flex justify-between items-center`}>
                            <div className="flex items-center gap-2">
                                <col.icon className={`text-xl ${col.color}`} />
                                <h2 className="font-serif font-semibold text-[#1A1A1A] text-lg">{col.title}</h2>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${col.bg} ${col.color} border ${col.border}`}>
                                {getColumnOrders(col.id).length}
                            </span>
                        </div>

                        {/* Order Cards container */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {getColumnOrders(col.id).map(order => (
                                <div key={order.id} className="bg-[#FFFFFF] rounded-xl border border-[#E5E5E5] p-5 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold font-mono text-[#1A1A1A]">#{order.id}</h3>
                                            <p className="text-sm font-medium text-[#666666]">{order.type} • {order.table}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-md bg-[#F2F0ED] text-[#666666]`}>
                                            {order.time}
                                        </span>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-3 mb-6 bg-[#FDFCFB] p-3 rounded-lg border border-[#F2F0ED]">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <div className="w-6 h-6 rounded bg-[#EAE7E1] text-[#1A1A1A] font-bold text-xs flex items-center justify-center shrink-0">
                                                    {item.qty}x
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1A1A1A] text-sm leading-tight">{item.name}</p>
                                                    {item.notes && (
                                                        <p className="text-xs text-red-600 font-medium italic mt-0.5">Note: {item.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {col.id === 'pending' && (
                                            <button 
                                                onClick={() => moveOrder(order.id, 'cooking')}
                                                className="w-full bg-[#1A1A1A] hover:bg-[#333333] text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Start Cooking
                                            </button>
                                        )}
                                        {col.id === 'cooking' && (
                                            <button 
                                                onClick={() => moveOrder(order.id, 'ready')}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Mark as Ready
                                            </button>
                                        )}
                                        {col.id === 'ready' && (
                                            <button 
                                                onClick={() => moveOrder(order.id, 'served')}
                                                className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] hover:bg-[#F2F0ED] py-2.5 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Mark Served / Cleared
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {getColumnOrders(col.id).length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-[#A0A0B0] py-10">
                                    <col.icon className="text-4xl mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No orders</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
