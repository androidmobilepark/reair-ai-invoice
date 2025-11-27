
import React from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Activity, AlertTriangle, CheckCircle, DollarSign, Lock, TrendingUp, TrendingDown, 
  Clock, Package, Users, ArrowUpRight, Plus, FileText, ShoppingBag, CreditCard 
} from 'lucide-react';
import { UserRole, ViewState } from '../types';

interface DashboardProps {
    userRole?: UserRole;
    onNavigate?: (view: ViewState) => void; 
}

// --- Mock Data ---

const revenueData = [
  { name: 'Mon', revenue: 45000, cost: 20000 },
  { name: 'Tue', revenue: 52000, cost: 22000 },
  { name: 'Wed', revenue: 38000, cost: 18000 },
  { name: 'Thu', revenue: 65000, cost: 25000 },
  { name: 'Fri', revenue: 78000, cost: 30000 },
  { name: 'Sat', revenue: 95000, cost: 35000 },
  { name: 'Sun', revenue: 88000, cost: 32000 },
];

const repairStatusData = [
  { name: 'Diagnosis', count: 8, color: '#3b82f6' },
  { name: 'Waiting Parts', count: 12, color: '#f59e0b' },
  { name: 'In Progress', count: 15, color: '#6366f1' },
  { name: 'Testing', count: 6, color: '#8b5cf6' },
  { name: 'Ready', count: 9, color: '#10b981' },
];

const brandData = [
  { name: 'Apple', value: 45 },
  { name: 'Samsung', value: 30 },
  { name: 'Google', value: 10 },
  { name: 'Other', value: 15 },
];

const techPerformanceData = [
  { name: 'John', repairs: 24, rating: 4.8 },
  { name: 'Sarah', repairs: 32, rating: 4.9 },
  { name: 'Mike', repairs: 18, rating: 4.5 },
  { name: 'Emma', repairs: 28, rating: 4.7 },
];

const recentActivities = [
  { id: 1, type: 'repair', title: 'iPhone 13 Screen Replacement', status: 'Completed', time: '10 mins ago', user: 'Sarah Connor' },
  { id: 2, type: 'invoice', title: 'Invoice #INV-20231024-X9Z', status: 'Paid', time: '35 mins ago', user: 'Emma Watson' },
  { id: 3, type: 'stock', title: 'Low Stock Alert: Galaxy S23 Battery', status: 'Critical', time: '1 hour ago', user: 'System' },
  { id: 4, type: 'customer', title: 'New Customer: David Miller', status: 'Registered', time: '2 hours ago', user: 'John Doe' },
  { id: 5, type: 'repair', title: 'MacBook Pro Water Damage', status: 'In Progress', time: '3 hours ago', user: 'Sarah Connor' },
];

const BRAND_COLORS = ['#000000', '#1428a0', '#4285F4', '#64748b'];

// --- Helper Components ---

const KPICard: React.FC<{ 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
  trend?: number; 
  trendLabel?: string;
  hidden?: boolean;
}> = ({ title, value, icon, color, trend, trendLabel, hidden }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
        {hidden ? <Lock size={20} /> : icon}
      </div>
      {trend !== undefined && !hidden && (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      {hidden ? (
        <div className="h-8 flex items-center">
            <span className="text-2xl font-bold text-slate-300 blur-sm select-none">₹XXX,XXX</span>
            <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">Restricted</span>
        </div>
      ) : (
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
      )}
      {trendLabel && !hidden && (
        <p className="text-xs text-slate-400 mt-2">{trendLabel}</p>
      )}
    </div>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; color: string; onClick?: () => void }> = ({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 p-4 rounded-xl shadow-sm transition-all group w-full"
  >
    <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <span className="font-semibold text-slate-700 text-sm">{label}</span>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  const showFinancials = userRole === 'Admin' || userRole === 'Sales';

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1 text-sm">Welcome back. Here's what's happening in your store today.</p>
        </div>
        <div className="flex items-center space-x-3 text-sm bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-slate-500 px-2">Last 30 Days</span>
          <div className="h-4 w-px bg-slate-300"></div>
          <button 
            onClick={() => onNavigate && onNavigate(ViewState.REPORTS)}
            className="text-blue-600 font-semibold px-2 hover:bg-blue-50 rounded"
          >
            Download Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Revenue" 
          value="₹9,96,000" 
          icon={<DollarSign size={24} className="text-emerald-600" />} 
          color="bg-emerald-100" 
          trend={12.5}
          trendLabel="vs last month"
          hidden={!showFinancials}
        />
        <KPICard 
          title="Active Repairs" 
          value="42" 
          icon={<Activity size={24} className="text-blue-600" />} 
          color="bg-blue-100" 
          trend={8.2}
          trendLabel="Currently in progress"
        />
        <KPICard 
          title="Pending Payments" 
          value="₹45,200" 
          icon={<CreditCard size={24} className="text-orange-600" />} 
          color="bg-orange-100" 
          trend={-2.4}
          trendLabel="Outstanding invoices"
          hidden={!showFinancials}
        />
        <KPICard 
          title="Avg Repair Time" 
          value="4.2 Hrs" 
          icon={<Clock size={24} className="text-violet-600" />} 
          color="bg-violet-100" 
          trend={-15}
          trendLabel="Faster than average"
        />
        <KPICard 
          title="Stock Value" 
          value="₹12.5L" 
          icon={<Package size={24} className="text-indigo-600" />} 
          color="bg-indigo-100" 
          hidden={!showFinancials}
        />
        <KPICard 
          title="Customer Satisfaction" 
          value="4.8/5.0" 
          icon={<Users size={24} className="text-pink-600" />} 
          color="bg-pink-100" 
          trend={1.2}
          trendLabel="Based on 54 reviews"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActionButton icon={<Plus size={20} />} label="New Repair Order" color="blue" onClick={() => onNavigate && onNavigate(ViewState.REPAIRS)} />
        <ActionButton icon={<FileText size={20} />} label="Create Invoice" color="emerald" onClick={() => onNavigate && onNavigate(ViewState.INVOICE)} />
        <ActionButton icon={<ShoppingBag size={20} />} label="Check Inventory" color="purple" onClick={() => onNavigate && onNavigate(ViewState.INVENTORY)} />
        <ActionButton icon={<CreditCard size={20} />} label="Pending Payments" color="orange" onClick={() => onNavigate && onNavigate(ViewState.CRM)} />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="text-lg font-bold text-slate-800">Revenue Analytics</h3>
                <p className="text-xs text-slate-500">Income vs Cost trends over the week</p>
             </div>
          </div>
          
          {!showFinancials && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-400">
                <Lock size={32} className="mb-2"/>
                <p className="font-medium">Financial Data Restricted</p>
             </div>
          )}

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontSize: '12px', fontWeight: 600}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="cost" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Est. Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repair Throughput (Pie/Donut) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
           <h3 className="text-lg font-bold text-slate-800 mb-2">Repair Status</h3>
           <p className="text-xs text-slate-500 mb-6">Current breakdown of active jobs</p>
           
           <div className="flex-1 min-h-[250px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={repairStatusData} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}}/>
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {repairStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Secondary Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Revenue by Brand (Donut) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-800 mb-6">Devices by Brand</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie 
                        data={brandData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {brandData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Tech Performance */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Top Technicians</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={techPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}} />
                      <Bar dataKey="repairs" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                   </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                <button className="text-xs text-blue-600 font-semibold hover:text-blue-800">View All</button>
             </div>
             
             <div className="space-y-6 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {recentActivities.map((activity) => (
                   <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                          activity.type === 'repair' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'invoice' ? 'bg-green-100 text-green-600' :
                          activity.type === 'stock' ? 'bg-red-100 text-red-600' :
                          'bg-purple-100 text-purple-600'
                      }`}>
                          {activity.type === 'repair' && <Activity size={14} />}
                          {activity.type === 'invoice' && <DollarSign size={14} />}
                          {activity.type === 'stock' && <AlertTriangle size={14} />}
                          {activity.type === 'customer' && <Users size={14} />}
                      </div>
                      <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{activity.title}</p>
                          <div className="flex justify-between items-center mt-1">
                             <span className="text-xs text-slate-500">{activity.user}</span>
                             <span className="text-xs text-slate-400 flex items-center">
                                <Clock size={10} className="mr-1"/> {activity.time}
                             </span>
                          </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

      </div>
    </div>
  );
};

export default Dashboard;
