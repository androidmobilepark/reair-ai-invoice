
import React, { useState } from 'react';
import { RepairOrder, InventoryItem, PurchaseOrder, Customer, AppSettings } from '../types';
import { FileDown, Calendar, Filter, FileText, CheckCircle, AlertTriangle, User } from 'lucide-react';

interface ReportsViewProps {
  repairs: RepairOrder[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  settings: AppSettings;
}

type ReportType = 'Repairs' | 'Inventory' | 'Revenue' | 'Customers';

const ReportsView: React.FC<ReportsViewProps> = ({ repairs, inventory, purchaseOrders, customers, settings }) => {
  const [reportType, setReportType] = useState<ReportType>('Repairs');
  
  // Date Range State
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');

  // Helper to check date range
  const isWithinRange = (dateString: string) => {
    return dateString >= startDate && dateString <= endDate;
  };

  const generateCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `${reportType}_Report_${startDate}_to_${endDate}.csv`;

    if (reportType === 'Repairs') {
      headers = ['ID', 'Date Created', 'Customer', 'Device', 'Status', 'Technician', 'Total Cost', 'Notes'];
      const filtered = repairs.filter(r => {
        const inDate = isWithinRange(r.dateCreated);
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        const matchBrand = brandFilter === 'All' || r.deviceModel.toLowerCase().includes(brandFilter.toLowerCase());
        return inDate && matchStatus && matchBrand;
      });
      
      rows = filtered.map(r => [
        r.id, 
        r.dateCreated, 
        r.customerName, 
        r.deviceModel, 
        r.status, 
        r.technicianName || 'Unassigned',
        (r.partsUsed.reduce((acc, p) => acc + p.cost, 0) + r.laborCost).toFixed(2),
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ]);

    } else if (reportType === 'Inventory') {
      filename = `Inventory_Report_${today}.csv`; // Inventory is snapshot, date range less relevant usually, but we can filter by 'low stock' etc
      headers = ['SKU', 'Name', 'Brand', 'Model', 'Category', 'Stock', 'Cost', 'Supplier', 'Status'];
      
      let filtered = inventory;
      if (brandFilter !== 'All') {
          filtered = filtered.filter(i => (i.brand || 'Other') === brandFilter);
      }
      if (statusFilter === 'Low Stock') {
          filtered = filtered.filter(i => i.currentStock <= i.reorderPoint && i.currentStock > 0);
      } else if (statusFilter === 'Out of Stock') {
          filtered = filtered.filter(i => i.currentStock <= 0);
      }

      rows = filtered.map(i => [
        i.sku,
        `"${i.name.replace(/"/g, '""')}"`,
        i.brand || '-',
        i.model || '-',
        i.category,
        i.currentStock,
        i.price.toFixed(2),
        i.supplierName || '-',
        i.currentStock <= 0 ? 'Out of Stock' : (i.currentStock <= i.reorderPoint ? 'Low Stock' : 'In Stock')
      ]);

    } else if (reportType === 'Revenue') {
      // Revenue based on Customers History (Repairs & Purchases) + Purchase Orders (Expenses)
      headers = ['Date', 'Type', 'Description', 'Income', 'Expense', 'Profit/Loss'];
      
      const incomeEntries = customers.flatMap(c => c.history.map(h => ({
          date: h.date,
          type: 'Income',
          desc: `${c.name} - ${h.description}`,
          amount: h.amount || 0
      }))).filter(i => isWithinRange(i.date));

      const expenseEntries = purchaseOrders.map(po => ({
          date: po.date,
          type: 'Expense',
          desc: `PO #${po.id} - ${po.supplierName}`,
          amount: po.totalAmount
      })).filter(e => isWithinRange(e.date));

      const allEntries = [...incomeEntries, ...expenseEntries].sort((a,b) => a.date.localeCompare(b.date));

      rows = allEntries.map(e => [
          e.date,
          e.type,
          `"${e.desc}"`,
          e.type === 'Income' ? e.amount.toFixed(2) : '0.00',
          e.type === 'Expense' ? e.amount.toFixed(2) : '0.00',
          (e.type === 'Income' ? e.amount : -e.amount).toFixed(2)
      ]);
      
      // Add Totals Row
      const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
      const totalExpense = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
      rows.push(['TOTAL', '', '', totalIncome.toFixed(2), totalExpense.toFixed(2), (totalIncome - totalExpense).toFixed(2)]);

    } else if (reportType === 'Customers') {
      headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'Join Date', 'Total Spent', 'Active Repairs', 'Tags', 'Notes'];
      
      const filtered = customers.filter(c => {
          const inDate = isWithinRange(c.joinDate);
          const matchTag = statusFilter === 'All' || c.tags.includes(statusFilter);
          return inDate && matchTag;
      });

      rows = filtered.map(c => [
          c.id,
          `"${c.name}"`,
          c.phone,
          c.email,
          `"${c.address.replace(/"/g, '""')}"`,
          c.joinDate,
          c.totalSpent.toFixed(2),
          c.activeRepairs,
          c.tags.join('; '),
          `"${c.notes.replace(/"/g, '""')}"`
      ]);
    }

    // Generate CSV Content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusOptions = () => {
    if (reportType === 'Repairs') return ['All', 'Completed', 'In Progress', 'Pending', 'Cancelled'];
    if (reportType === 'Inventory') return ['All', 'Low Stock', 'Out of Stock', 'In Stock'];
    if (reportType === 'Customers') return ['All', 'VIP', 'New', 'Business', 'Loyal', 'Walk-in'];
    return [];
  };

  // Extract unique brands for filter
  const uniqueBrands = ['All', ...Array.from(new Set(inventory.map(i => i.brand || 'Other').filter(Boolean)))];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-bold text-slate-800">Reports Center</h2>
           <p className="text-sm text-slate-500 mt-1">Generate and download detailed analytics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <FileText size={18} className="mr-2 text-blue-600"/> Report Type
                </h3>
                <div className="space-y-2">
                    {['Repairs', 'Inventory', 'Revenue', 'Customers'].map((type) => (
                        <button
                            key={type}
                            onClick={() => {
                                setReportType(type as ReportType);
                                setStatusFilter('All'); // Reset filters on type change
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex justify-between items-center ${
                                reportType === type 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="font-medium">{type} Report</span>
                            {reportType === type && <CheckCircle size={16} />}
                        </button>
                    ))}
                </div>
            </div>

            {reportType !== 'Inventory' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <Calendar size={18} className="mr-2 text-purple-600"/> {reportType === 'Customers' ? 'Join Date Range' : 'Date Range'}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Filters & Preview Panel */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <Filter size={18} className="mr-2 text-emerald-600"/> Filters & Generation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {getStatusOptions().length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                {reportType === 'Customers' ? 'Customer Tag Filter' : 'Status Filter'}
                            </label>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {getStatusOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    )}

                    {(reportType === 'Repairs' || reportType === 'Inventory') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand Filter</label>
                            <select 
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <h4 className="font-bold text-slate-700 text-sm mb-2">Summary Preview</h4>
                    <p className="text-sm text-slate-600 mb-1">
                        Generating <strong>{reportType} Report</strong> 
                        {reportType !== 'Inventory' && ` from ${startDate} to ${endDate}`}.
                    </p>
                    {statusFilter !== 'All' && <p className="text-xs text-slate-500">Filtered by {reportType === 'Customers' ? 'Tag' : 'Status'}: {statusFilter}</p>}
                    {brandFilter !== 'All' && <p className="text-xs text-slate-500">Filtered by Brand: {brandFilter}</p>}
                </div>

                <button 
                    onClick={generateCSV}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center transition-all"
                >
                    <FileDown size={20} className="mr-2" /> Download CSV Report
                </button>
            </div>
            
            {/* Contextual Tips */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start">
                <AlertTriangle size={20} className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Tip:</p>
                    {reportType === 'Customers' ? (
                        <p>Customer reports help you identify your top spenders (VIPs) and recent sign-ups. Use the date range to filter by "Join Date".</p>
                    ) : (
                        <p>Reports are generated in CSV format which can be opened in Excel, Google Sheets, or Numbers. Revenue reports calculate net profit based on logged income and purchase orders.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
