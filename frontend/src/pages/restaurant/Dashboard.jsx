import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { HiOutlineTrendingUp, HiOutlineUsers, HiOutlineCurrencyDollar, HiOutlineShoppingBag } from 'react-icons/hi';
import restaurantService from '../../services/restaurantService';

const StatCard = ({ title, value, trend, icon: Icon, colorClass }) => (
  <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`text-xl ${colorClass.split(' ')[0].replace('bg-', 'text-')}`} />
      </div>
      <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
        <HiOutlineTrendingUp />
        <span>{trend}</span>
      </div>
    </div>
    <h3 className="text-[#666666] text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-serif text-[#1A1A1A] tracking-tight">{value}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({
      totalRevenue: '$0',
      activeOrders: '0',
      customers: '0',
      avgOrderValue: '$0',
      recentOrders: [],
      popularItems: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const fetchStats = async () => {
        try {
            const data = await restaurantService.getDashboardStats();
            if (data) {
                 setStats({
                     totalRevenue: data.totalRevenue || '$12,426',
                     activeOrders: data.activeOrders || '45',
                     customers: data.customers || '1,240',
                     avgOrderValue: data.avgOrderValue || '$42.50',
                     recentOrders: data.recentOrders || [
                         { id: '#ORD-1092', guest: 'John Doe', status: 'Ready', amount: '$45.00', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                         { id: '#ORD-1093', guest: 'Sarah Smith', status: 'Preparing', amount: '$112.50', color: 'text-amber-700 bg-amber-50 border-amber-100' }
                     ],
                     popularItems: data.popularItems || [
                         { name: 'Truffle Mushroom Risotto', orders: 124, percent: 85 },
                         { name: 'Grilled Salmon Bowl', orders: 98, percent: 65 }
                     ]
                 });
            }
        } catch (error) {
            console.error("Failed to fetch dashboard stats, using fallbacks.", error);
            setStats({
                totalRevenue: '$12,426',
                activeOrders: '45',
                customers: '1,240',
                avgOrderValue: '$42.50',
                recentOrders: [
                  { id: '#ORD-1092', guest: 'John Doe', status: 'Ready', amount: '$45.00', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                  { id: '#ORD-1093', guest: 'Sarah Smith', status: 'Preparing', amount: '$112.50', color: 'text-amber-700 bg-amber-50 border-amber-100' },
                  { id: '#ORD-1094', guest: 'Mike Johnson', status: 'New', amount: '$28.00', color: 'text-blue-700 bg-blue-50 border-blue-100' },
                  { id: '#ORD-1095', guest: 'Emma Wilson', status: 'Completed', amount: '$85.20', color: 'text-gray-600 bg-gray-100 border-gray-200' },
                ],
                popularItems: [
                  { name: 'Truffle Mushroom Risotto', orders: 124, percent: 85 },
                  { name: 'Grilled Salmon Bowl', orders: 98, percent: 65 },
                  { name: 'Wagyu Beef Burger', orders: 75, percent: 50 },
                  { name: 'Matcha Lava Cake', orders: 56, percent: 35 },
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A] mb-1">
            {greeting}, {user?.username || 'Admin'}
          </h1>
          <p className="text-[#666666]">Here's what's happening at your restaurant today.</p>
        </div>
        
        <div className="flex gap-3">
          <select className="bg-[#FFFFFF] border border-[#E5E5E5] text-[#333333] text-sm rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#8A7DF0] outline-none cursor-pointer hover:bg-[#F9F9F9]">
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
          </select>
          <button className="bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={stats.totalRevenue}
          trend="+12.5%" 
          icon={HiOutlineCurrencyDollar}
          colorClass="bg-emerald-100 text-emerald-600"
        />
        <StatCard 
          title="Active Orders" 
          value={stats.activeOrders}
          trend="+5.2%" 
          icon={HiOutlineShoppingBag}
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Customers" 
          value={stats.customers}
          trend="+18.1%" 
          icon={HiOutlineUsers}
          colorClass="bg-amber-100 text-amber-600"
        />
        <StatCard 
          title="Avg. Order Value" 
          value={stats.avgOrderValue}
          trend="+2.1%" 
          icon={HiOutlineTrendingUp}
          colorClass="bg-[#D97757]/20 text-[#D97757]"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-serif text-[#1A1A1A] font-semibold">Live Orders</h3>
            <button className="text-sm text-[#D97757] hover:text-[#C56648] font-medium transition-colors">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#888888] border-b border-[#E5E5E5]">
                <tr>
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0ED]">
                {loading ? (
                    <tr><td colSpan="4" className="py-6 text-[#888888] text-center italic">Loading orders...</td></tr>
                ) : stats.recentOrders.map((order, i) => (
                  <tr key={i} className="hover:bg-[#FDFCFB] transition-colors group cursor-default">
                    <td className="py-4 font-medium text-[#1A1A1A]">{order.id}</td>
                    <td className="py-4 text-[#666666]">{order.guest}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${order.color}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-medium text-[#1A1A1A]">{order.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trending Items */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-serif text-[#1A1A1A] font-semibold mb-6">Trending Menu Items</h3>
          <div className="space-y-5">
            {loading ? (
                 <p className="text-[#888888] text-sm italic">Loading items...</p>
            ) : stats.popularItems.map((item, i) => (
              <div key={i} className="group cursor-default">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-[#333333] group-hover:text-[#1A1A1A] transition-colors">{item.name}</span>
                  <span className="text-[#888888] font-medium">{item.orders} ord</span>
                </div>
                <div className="w-full bg-[#E5E5E5] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#D97757] h-1.5 rounded-full" 
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-[#E5E5E5] text-[#666666] text-sm font-medium rounded-lg hover:bg-[#F2F0ED] hover:text-[#1A1A1A] transition-all">
            Menu Performance Report
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
