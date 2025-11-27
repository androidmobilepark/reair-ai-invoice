
import React, { useState } from 'react';
import { Customer, Supplier, InventoryItem, SupplierLedgerEntry, UserProfile } from '../types';
import { generateCRMMessage } from '../services/geminiService';
import { Search, User, Phone, Mail, MapPin, Tag, History, Send, Copy, Activity, Truck, Package, ShoppingCart, DollarSign, FileText, ArrowUpRight, ArrowDownLeft, X, Plus, Edit, Trash2, ShieldAlert } from 'lucide-react';

interface CRMViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  inventory: InventoryItem[];
  currentUser: UserProfile;
}

const CRMView: React.FC<CRMViewProps> = ({ customers, setCustomers, suppliers, setSuppliers, inventory, currentUser }) => {
  const [viewMode, setViewMode] = useState<'customers' | 'suppliers'>('customers');
  
  // Permissions
  const canManageFinancials = currentUser.role === 'Admin';

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Supplier State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierTab, setSupplierTab] = useState<'overview' | 'ledger'>('overview');

  // Ledger Form State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [ledgerForm, setLedgerForm] = useState<Partial<SupplierLedgerEntry>>({
      type: 'Invoice',
      description: '',
      amount: 0,
      reference: '',
      date: new Date().toISOString().split('T')[0]
  });

  // Messaging State
  const [messageReason, setMessageReason] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Get items supplied by selected supplier
  const supplierItems = selectedSupplier 
      ? inventory.filter(item => item.supplierName === selectedSupplier.name) 
      : [];

  // --- Dynamic Balance Calculations ---
  // We calculate these on the fly to ensure UI is always consistent with the ledger array
  const currentLedger = selectedSupplier?.ledger || [];
  const totalInvoiced = currentLedger.filter(l => l.type === 'Invoice').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = currentLedger.filter(l => l.type === 'Payment').reduce((sum, i) => sum + i.amount, 0);
  const totalReturned = currentLedger.filter(l => l.type === 'Return').reduce((sum, i) => sum + i.amount, 0);
  const outstandingBalance = totalInvoiced - (totalPaid + totalReturned);

  const handleGenerateMessage = async () => {
    if (!selectedCustomer || !messageReason) return;
    setIsGenerating(true);
    const msg = await generateCRMMessage(selectedCustomer.name, messageReason);
    setGeneratedMessage(msg);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    alert('Message copied to clipboard!');
  };

  const handleEditTransaction = (entry: SupplierLedgerEntry) => {
      setLedgerForm({
          type: entry.type,
          description: entry.description,
          amount: entry.amount,
          reference: entry.reference || '',
          date: entry.date
      });
      setEditingTransactionId(entry.id);
      setShowLedgerModal(true);
  };

  const handleDeleteTransaction = (entryId: string) => {
      if(!selectedSupplier || !setSuppliers) return;
      if(!confirm("Are you sure you want to delete this transaction? This will recalculate the balance.")) return;

      const entry = selectedSupplier.ledger.find(e => e.id === entryId);
      if(!entry) return;

      // Logic to reverse the effect of the deleted transaction
      // If we delete an Invoice, balance decreases (we owe less).
      // If we delete a Payment/Return, balance increases (we owe more).
      let balanceChange = 0;
      if (entry.type === 'Invoice') {
          balanceChange = -entry.amount; 
      } else {
          balanceChange = entry.amount; // Add back the amount we thought we paid
      }

      const updatedSupplier = {
          ...selectedSupplier,
          balance: selectedSupplier.balance + balanceChange,
          ledger: selectedSupplier.ledger.filter(e => e.id !== entryId)
      };

      setSuppliers(prev => prev.map(s => s.id === selectedSupplier.id ? updatedSupplier : s));
      setSelectedSupplier(updatedSupplier);
  };

  const handleSaveTransaction = () => {
      if (!selectedSupplier || !ledgerForm.amount || !ledgerForm.description || !setSuppliers) return;

      // Ensure amount is positive for storage (logic handles the sign)
      const amount = Math.abs(Number(ledgerForm.amount));
      
      // Invoice = Increases Debt (+). Payment/Return = Decreases Debt (-).
      const isDebtIncrease = ledgerForm.type === 'Invoice';
      const balanceImpact = isDebtIncrease ? amount : -amount;

      let updatedLedger = [...(selectedSupplier.ledger || [])];
      let currentBalance = selectedSupplier.balance;

      if (editingTransactionId) {
          // Edit Mode
          const oldEntryIndex = updatedLedger.findIndex(e => e.id === editingTransactionId);
          if (oldEntryIndex === -1) return;
          const oldEntry = updatedLedger[oldEntryIndex];

          // 1. Reverse the old entry's impact on balance
          if (oldEntry.type === 'Invoice') {
              currentBalance -= oldEntry.amount; // Remove old invoice amount
          } else {
              currentBalance += oldEntry.amount; // Add back old payment amount
          }

          // 2. Apply new entry's impact
          currentBalance += balanceImpact;

          // 3. Update the ledger array
          updatedLedger[oldEntryIndex] = {
              ...oldEntry,
              date: ledgerForm.date || new Date().toISOString().split('T')[0],
              type: ledgerForm.type as any,
              description: ledgerForm.description || '',
              amount: amount,
              reference: ledgerForm.reference
          };
      } else {
          // Create Mode
          currentBalance += balanceImpact;
          const newEntry: SupplierLedgerEntry = {
              id: `TRX-${Date.now()}`,
              date: ledgerForm.date || new Date().toISOString().split('T')[0],
              type: ledgerForm.type as any,
              description: ledgerForm.description || '',
              amount: amount,
              reference: ledgerForm.reference
          };
          updatedLedger = [newEntry, ...updatedLedger];
      }

      const updatedSupplier = {
          ...selectedSupplier,
          balance: currentBalance,
          ledger: updatedLedger
      };

      setSuppliers(prev => prev.map(s => s.id === selectedSupplier.id ? updatedSupplier : s));
      setSelectedSupplier(updatedSupplier);
      
      // Cleanup
      setShowLedgerModal(false);
      setEditingTransactionId(null);
      setLedgerForm({ type: 'Invoice', description: '', amount: 0, reference: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleCloseModal = () => {
      setShowLedgerModal(false);
      setEditingTransactionId(null);
      setLedgerForm({ type: 'Invoice', description: '', amount: 0, reference: '', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative">
      {/* View Toggle */}
      <div className="flex space-x-4 mb-4">
           <button 
             onClick={() => { setViewMode('customers'); setSelectedSupplier(null); }}
             className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                 viewMode === 'customers' 
                 ? 'bg-blue-600 text-white shadow-md' 
                 : 'bg-white text-slate-600 hover:bg-slate-50'
             }`}
           >
               <User size={18} className="mr-2" /> Customers
           </button>
           <button 
             onClick={() => { setViewMode('suppliers'); setSelectedCustomer(null); }}
             className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                 viewMode === 'suppliers' 
                 ? 'bg-purple-600 text-white shadow-md' 
                 : 'bg-white text-slate-600 hover:bg-slate-50'
             }`}
           >
               <Truck size={18} className="mr-2" /> Suppliers
           </button>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left Sidebar: List */}
          <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 text-lg">
                  {viewMode === 'customers' ? 'Customer Directory' : 'Supplier Directory'}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={viewMode === 'customers' ? "Search name, email, phone..." : "Search company, contact..."}
                  value={viewMode === 'customers' ? customerSearch : supplierSearch}
                  onChange={(e) => viewMode === 'customers' ? setCustomerSearch(e.target.value) : setSupplierSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {viewMode === 'customers' ? (
                  filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      onClick={() => { setSelectedCustomer(customer); setGeneratedMessage(''); setMessageReason(''); }}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedCustomer?.id === customer.id 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-semibold ${selectedCustomer?.id === customer.id ? 'text-blue-700' : 'text-slate-700'}`}>
                            {customer.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{customer.phone}</p>
                        </div>
                        {customer.tags.includes('VIP') && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">VIP</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>ID: {customer.id}</span>
                        <span>Last: {customer.history[0]?.date || 'N/A'}</span>
                      </div>
                    </div>
                  ))
              ) : (
                  filteredSuppliers.map(supplier => (
                    <div 
                      key={supplier.id}
                      onClick={() => { setSelectedSupplier(supplier); setSupplierTab('overview'); }}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedSupplier?.id === supplier.id 
                          ? 'bg-purple-50 border-purple-200 shadow-sm' 
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-semibold ${selectedSupplier?.id === supplier.id ? 'text-purple-700' : 'text-slate-700'}`}>
                            {supplier.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center"><User size={10} className="mr-1"/>{supplier.contactPerson}</p>
                        </div>
                        {supplier.balance !== 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${supplier.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                ₹{Math.abs(supplier.balance).toFixed(0)} {supplier.balance > 0 ? 'Due' : 'Cr'}
                            </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-400 truncate">
                        {supplier.email}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className="w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {viewMode === 'customers' && selectedCustomer ? (
              <div className="flex flex-col h-full animate-fade-in">
                {/* Customer Profile Header */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-200">
                            {selectedCustomer.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                            <div className="flex items-center space-x-2 mt-1">
                                {selectedCustomer.tags.map(tag => (
                                    <span key={tag} className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded font-medium flex items-center">
                                        <Tag size={10} className="mr-1"/> {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Lifetime Value</p>
                        <p className="text-2xl font-bold text-emerald-600">₹{selectedCustomer.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="flex items-center text-sm text-slate-600">
                        <Mail size={16} className="mr-2 text-slate-400" /> {selectedCustomer.email}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                        <Phone size={16} className="mr-2 text-slate-400" /> {selectedCustomer.phone}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                        <MapPin size={16} className="mr-2 text-slate-400" /> {selectedCustomer.address}
                    </div>
                  </div>
                </div>

                {/* Customer Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                              <History size={16} className="mr-2"/> Recent History
                          </h4>
                          <div className="space-y-3">
                              {selectedCustomer.history.map((evt, i) => (
                                  <div key={i} className="flex justify-between items-start text-sm pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                                      <div>
                                          <p className="font-medium text-slate-700">{evt.description}</p>
                                          <span className={`text-xs px-1.5 rounded ${evt.type === 'Repair' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                              {evt.type}
                                          </span>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-slate-500 text-xs">{evt.date}</p>
                                          {evt.amount && <p className="font-medium text-slate-800">₹{evt.amount.toFixed(2)}</p>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                              <Activity size={16} className="mr-2"/> Customer Notes
                          </h4>
                          <textarea 
                            className="w-full h-32 bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            value={selectedCustomer.notes}
                            readOnly
                          />
                      </div>
                  </div>

                  {/* AI Outreach Section */}
                  <div className="border-t border-slate-100 pt-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                          <Send size={20} className="mr-2 text-purple-600"/> AI Outreach Generator
                      </h3>
                      <div className="flex gap-4">
                          <div className="w-1/2 space-y-3">
                              <label className="block text-xs font-semibold text-slate-500 uppercase">Message Context / Reason</label>
                              <textarea 
                                placeholder="e.g., Remind them their iPad screen protector is ready, or wish them a happy birthday with a 10% off coupon."
                                className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                value={messageReason}
                                onChange={(e) => setMessageReason(e.target.value)}
                              />
                              <button 
                                onClick={handleGenerateMessage}
                                disabled={isGenerating || !messageReason}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium shadow-md flex items-center justify-center transition-all disabled:opacity-50"
                              >
                                {isGenerating ? (
                                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Drafting...</>
                                ) : (
                                    'Generate Draft'
                                )}
                              </button>
                          </div>
                          <div className="w-1/2">
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-3">AI Draft Preview</label>
                              {generatedMessage ? (
                                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 relative h-32 overflow-y-auto">
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{generatedMessage}</p>
                                      <button 
                                        onClick={copyToClipboard}
                                        className="absolute top-2 right-2 p-1.5 bg-white text-purple-600 rounded shadow-sm hover:bg-purple-100"
                                        title="Copy"
                                      >
                                          <Copy size={14} />
                                      </button>
                                  </div>
                              ) : (
                                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm bg-slate-50">
                                      Generated message will appear here...
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                </div>
              </div>
            ) : viewMode === 'suppliers' && selectedSupplier ? (
              <div className="flex flex-col h-full animate-fade-in">
                  {/* Supplier Header */}
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
                      <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-4">
                              <div className="h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200">
                                  <Truck size={32} />
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-800">{selectedSupplier.name}</h2>
                                  <p className="text-slate-500 text-sm flex items-center mt-1">
                                      <User size={14} className="mr-1"/> Contact: <span className="font-medium text-slate-700 ml-1">{selectedSupplier.contactPerson}</span>
                                  </p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-sm text-slate-500">Outstanding Balance</p>
                              <p className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  ₹{Math.abs(outstandingBalance).toFixed(2)}
                              </p>
                              <p className="text-xs text-slate-400">
                                  {outstandingBalance > 0 ? 'We owe them' : 'Paid in full / Credit'}
                              </p>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="flex items-center text-sm text-slate-600">
                            <Mail size={16} className="mr-2 text-slate-400" /> {selectedSupplier.email}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                            <Phone size={16} className="mr-2 text-slate-400" /> {selectedSupplier.phone}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                            <MapPin size={16} className="mr-2 text-slate-400" /> {selectedSupplier.address}
                        </div>
                      </div>
                  </div>

                  {/* Supplier Tabs */}
                  <div className="flex border-b border-slate-100 px-6">
                      <button 
                         onClick={() => setSupplierTab('overview')}
                         className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                             supplierTab === 'overview' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                         }`}
                      >
                          Overview & Stock
                      </button>
                      <button 
                         onClick={() => setSupplierTab('ledger')}
                         className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                             supplierTab === 'ledger' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                         }`}
                      >
                          Financial Ledger
                      </button>
                  </div>

                  {/* Supplier Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                       {supplierTab === 'overview' ? (
                         <>
                            {/* Notes */}
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2">Internal Notes</h4>
                                <p className="text-sm text-slate-700">{selectedSupplier.notes || 'No notes available.'}</p>
                            </div>

                            {/* Supplied Items */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                                    <Package size={20} className="mr-2 text-blue-600"/> Supplied Inventory
                                </h3>
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Item Name</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">SKU</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {supplierItems.length > 0 ? (
                                                supplierItems.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.name}</td>
                                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.sku}</td>
                                                        <td className="px-4 py-3 text-sm text-center">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.currentStock <= item.reorderPoint ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                {item.currentStock}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-right text-slate-600">₹{item.price}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                        No inventory items currently linked to this supplier.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                         </>
                       ) : (
                         /* Ledger View */
                         <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex space-x-4">
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 min-w-[140px]">
                                        <p className="text-xs text-red-500 uppercase font-bold">Total Invoiced</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            ₹{totalInvoiced.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 min-w-[140px]">
                                        <p className="text-xs text-green-500 uppercase font-bold">Paid & Returned</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            ₹{(totalPaid + totalReturned).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 min-w-[140px]">
                                        <p className="text-xs text-blue-500 uppercase font-bold">Outstanding</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            ₹{outstandingBalance.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                {canManageFinancials ? (
                                    <button 
                                    onClick={() => setShowLedgerModal(true)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-md font-medium flex items-center"
                                    >
                                        <Plus size={18} className="mr-2" /> Record Transaction
                                    </button>
                                ) : (
                                    <div className="flex items-center text-slate-400 text-sm italic">
                                        <ShieldAlert size={16} className="mr-2"/> View Only Access
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Description / Ref</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Debit (-)</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Credit (+)</th>
                                            {canManageFinancials && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(selectedSupplier.ledger || []).length > 0 ? (
                                            selectedSupplier.ledger!.map(entry => (
                                                <tr key={entry.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{entry.date}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                            entry.type === 'Invoice' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                                            entry.type === 'Payment' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                                        }`}>
                                                            {entry.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-700">
                                                        <div className="font-medium">{entry.description}</div>
                                                        {entry.reference && <div className="text-xs text-slate-400">Ref: {entry.reference}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                                                        {['Payment', 'Return'].includes(entry.type) ? `₹${entry.amount.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                                                        {entry.type === 'Invoice' ? `₹${entry.amount.toFixed(2)}` : '-'}
                                                    </td>
                                                    {canManageFinancials && (
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center space-x-2">
                                                                <button 
                                                                    onClick={() => handleEditTransaction(entry)}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteTransaction(entry.id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={canManageFinancials ? 6 : 5} className="px-6 py-8 text-center text-slate-400">
                                                    No transactions recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                       )}
                  </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                 {viewMode === 'customers' ? <User size={64} className="mb-4 opacity-20"/> : <Truck size={64} className="mb-4 opacity-20"/>}
                 <p className="text-lg font-medium">Select a {viewMode === 'customers' ? 'customer' : 'supplier'} to view details</p>
              </div>
            )}
          </div>
      </div>
      
      {/* Ledger Modal */}
      {showLedgerModal && canManageFinancials && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-lg">{editingTransactionId ? 'Edit Transaction' : 'Record Transaction'}</h3>
                      <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                          <div className="flex gap-2">
                              {['Invoice', 'Payment', 'Return'].map(type => (
                                  <button
                                     key={type}
                                     onClick={() => setLedgerForm({...ledgerForm, type: type as any})}
                                     className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                         ledgerForm.type === type 
                                         ? 'bg-blue-600 text-white border-blue-600' 
                                         : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                     }`}
                                  >
                                      {type}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                              <input 
                                  type="date" 
                                  value={ledgerForm.date}
                                  onChange={(e) => setLedgerForm({...ledgerForm, date: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                              <input 
                                  type="number" 
                                  value={ledgerForm.amount}
                                  onChange={(e) => setLedgerForm({...ledgerForm, amount: parseFloat(e.target.value)})}
                                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  placeholder="0.00"
                              />
                          </div>
                      </div>

                      {/* Math feedback visual */}
                      <div className={`text-xs px-3 py-2 rounded border ${ledgerForm.type === 'Invoice' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {ledgerForm.type === 'Invoice' 
                             ? `This will INCREASE the balance owed by ₹${Number(ledgerForm.amount || 0).toFixed(2)}.`
                             : `This will DECREASE the balance owed by ₹${Number(ledgerForm.amount || 0).toFixed(2)}.`
                          }
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                          <input 
                              type="text" 
                              value={ledgerForm.description}
                              onChange={(e) => setLedgerForm({...ledgerForm, description: e.target.value})}
                              className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                              placeholder={ledgerForm.type === 'Invoice' ? "e.g. Purchase Order #500" : "e.g. Wire Transfer"}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference (Optional)</label>
                          <input 
                              type="text" 
                              value={ledgerForm.reference}
                              onChange={(e) => setLedgerForm({...ledgerForm, reference: e.target.value})}
                              className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                              placeholder="e.g. INV-102 or Check #"
                          />
                      </div>

                      <button 
                          onClick={handleSaveTransaction}
                          disabled={!ledgerForm.amount || !ledgerForm.description}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md mt-2 disabled:opacity-50"
                      >
                          {editingTransactionId ? 'Update Transaction' : 'Save Transaction'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CRMView;
