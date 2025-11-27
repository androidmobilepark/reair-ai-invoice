import React, { useState, useEffect, useRef } from 'react';
import { RepairOrder, RepairStatus, Technician, InventoryItem, BrandData, Supplier, AppSettings } from '../types';
import { generateStatusUpdate } from '../services/geminiService';
import { Smartphone, Laptop, Hammer, MessageCircle, ChevronDown, User, MapPin, Calendar, FileText, CheckCircle, X, Save, FileCheck, PackagePlus, AlertCircle, Clock, Filter, Search, ShoppingCart, Truck, ChevronRight, Barcode, Printer, Receipt, MessageSquare } from 'lucide-react';

// Declare JsBarcode for TypeScript since it's loaded via CDN
declare const JsBarcode: any;

interface RepairViewProps {
  repairs: RepairOrder[];
  setRepairs: React.Dispatch<React.SetStateAction<RepairOrder[]>>;
  technicians: Technician[];
  inventory: InventoryItem[];
  onConsumePart: (repairId: string, item: InventoryItem) => void;
  brands: BrandData[];
  suppliers: Supplier[];
  onCreateSpecialPO: (repairId: string, itemName: string, cost: number, supplier: string) => void;
  onSetFabAction?: (action: (() => void) | undefined) => void;
  settings?: AppSettings;
}

const RepairView: React.FC<RepairViewProps> = ({ repairs, setRepairs, technicians, inventory, onConsumePart, brands, suppliers, onCreateSpecialPO, onSetFabAction, settings }) => {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageRecipient, setMessageRecipient] = useState<string>(''); // Phone number
  
  // Modal State
  const [selectedRepair, setSelectedRepair] = useState<RepairOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Inventory selection state in modal
  const [selectedPartId, setSelectedPartId] = useState<string>("");

  // Special PO State
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [poItemName, setPoItemName] = useState('');
  const [poCost, setPoCost] = useState('');
  const [poSupplier, setPoSupplier] = useState('');

  // Filter State
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTechnician, setFilterTechnician] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Barcode Printing State
  const [printLabelRepair, setPrintLabelRepair] = useState<RepairOrder | null>(null);
  const [showIntakeTicket, setShowIntakeTicket] = useState<RepairOrder | null>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const STATUS_OPTIONS: RepairStatus[] = [
      'Pending', 'Under Diagnosis', 'Waiting for Parts', 'In Progress', 'Quality Testing', 
      'Completed', 'Picked Up', 'Delivered', 'Returned (Not Fixed)', 'Cancelled'
  ];

  // Set FAB action for mobile
  useEffect(() => {
    if (onSetFabAction) {
        // In a real app, this would open a 'New Repair' modal. For now, we simulate a button click.
        // Since 'New Repair' logic isn't fully separated in the provided original file, we just define functionality here.
        onSetFabAction(() => () => alert("New Repair Flow would open here"));
    }
  }, [onSetFabAction]);

  // Generate Barcode when modal opens
  useEffect(() => {
      if (printLabelRepair && barcodeRef.current) {
          // Safety check for JsBarcode presence
          if (typeof JsBarcode !== 'undefined') {
              try {
                  JsBarcode(barcodeRef.current, printLabelRepair.id, {
                      format: "CODE128",
                      width: 1.5,
                      height: 30,
                      displayValue: false,
                      margin: 0
                  });
              } catch (e) {
                  console.error("Barcode generation failed", e);
              }
          } else {
              console.warn("JsBarcode library not loaded.");
          }
      }
  }, [printLabelRepair]);

  // Filter Logic (Same as before)
  const filteredRepairs = repairs.filter(repair => {
    if (filterStatus !== 'All' && repair.status !== filterStatus) return false;
    if (filterTechnician !== 'All') {
       if (filterTechnician === 'Unassigned') {
           if (repair.technicianName && repair.technicianName !== 'Unassigned') return false;
       } else {
           if (repair.technicianName !== filterTechnician) return false;
       }
    }
    if (filterBrand !== 'All') {
        const brandInfo = brands.find(b => b.name === filterBrand);
        const modelString = repair.deviceModel.toLowerCase();
        const brandName = filterBrand.toLowerCase();
        const matchesBrandName = modelString.includes(brandName);
        const matchesModel = brandInfo ? brandInfo.models.some(m => modelString.includes(m.toLowerCase())) : false;
        if (!matchesBrandName && !matchesModel) return false;
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
            repair.id.toLowerCase().includes(q) ||
            repair.customerName.toLowerCase().includes(q) ||
            repair.deviceModel.toLowerCase().includes(q) ||
            (repair.invoiceId && repair.invoiceId.toLowerCase().includes(q))
        );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-600';
      case 'Under Diagnosis': return 'bg-blue-100 text-blue-700';
      case 'Waiting for Parts': return 'bg-amber-100 text-amber-700';
      case 'In Progress': return 'bg-indigo-100 text-indigo-700';
      case 'Quality Testing': return 'bg-purple-100 text-purple-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Picked Up': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Delivered': return 'bg-slate-200 text-slate-600 line-through decoration-slate-400';
      case 'Returned (Not Fixed)': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getDeviceIcon = (model: string) => {
    if (model.toLowerCase().includes('mac') || model.toLowerCase().includes('laptop')) return <Laptop size={18} />;
    return <Smartphone size={18} />;
  };

  const isOverdue = (repair: RepairOrder) => {
      const isCompleted = ['Completed', 'Picked Up', 'Delivered', 'Returned (Not Fixed)', 'Cancelled'].includes(repair.status);
      if (isCompleted || !repair.estimatedCompletion) return false;
      return new Date() > new Date(repair.estimatedCompletion);
  };

  const handleStatusChange = (id: string, newStatus: RepairStatus) => {
    setRepairs(prev => prev.map(r => {
        if (r.id === id) {
            const updates: Partial<RepairOrder> = { status: newStatus };
            if (newStatus === 'Completed' && !r.actualCompletion) {
                updates.actualCompletion = new Date().toISOString();
            }
            return { ...r, ...updates };
        }
        return r;
    }));
    setGeneratedMessage(null);
  };

  const handleNotify = async (repair: RepairOrder) => {
    setGeneratingFor(repair.id);
    setGeneratedMessage(null);
    setMessageRecipient(repair.customerMobile || '');
    const message = await generateStatusUpdate(repair.customerName, repair.deviceModel, repair.status);
    setGeneratedMessage(message);
    setGeneratingFor(null);
  };

  const handleSendWhatsApp = () => {
    if (!generatedMessage || !messageRecipient || !settings) return;
    const cleanPhoneNumber = messageRecipient.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(generatedMessage);
    const url = `${settings.whatsappApiLink}?phone=${cleanPhoneNumber}&text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
      if (!generatedMessage || !messageRecipient || !settings?.smsEnabled) {
          alert("SMS is disabled or details are missing.");
          return;
      }
      // Simulation of API Call
      alert(`[SMS SIMULATION]\nSending to: ${messageRecipient}\nVia: ${settings.smsGatewayUrl}\nMessage: ${generatedMessage}`);
  };

  const openDetails = (repair: RepairOrder) => {
      setSelectedRepair(repair);
      setIsModalOpen(true);
      setSelectedPartId("");
      setIsPOFormOpen(false);
  };

  const handleSaveDetails = () => {
      if (selectedRepair) {
          setRepairs(prev => prev.map(r => r.id === selectedRepair.id ? selectedRepair : r));
          setIsModalOpen(false);
          setSelectedRepair(null);
      }
  };

  const handleAddPartToRepair = () => {
      if (!selectedRepair || !selectedPartId) return;
      const part = inventory.find(i => i.id === selectedPartId);
      if (part) {
          onConsumePart(selectedRepair.id, part);
          setSelectedRepair(prev => {
              if(!prev) return null;
              return {
                  ...prev,
                  partsUsed: [...prev.partsUsed, { name: part.name, cost: part.price, inventoryId: part.id }]
              }
          });
          setSelectedPartId("");
      }
  };

  const handleCreatePO = () => {
      if(!selectedRepair || !poItemName || !poCost) return;
      const cost = parseFloat(poCost);
      onCreateSpecialPO(selectedRepair.id, poItemName, cost, poSupplier || 'General Vendor');
      setSelectedRepair(prev => prev ? ({...prev, status: 'Waiting for Parts'}) : null);
      setIsPOFormOpen(false); setPoItemName(''); setPoCost(''); setPoSupplier('');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Repair Tracking</h2>
        <button className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg items-center shadow-md transition-colors">
          <Hammer size={18} className="mr-2" /> New Repair
        </button>
      </div>

      {/* Responsive Filter Bar */}
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-2 text-xs md:text-sm bg-white"
                  >
                      <option value="All">Status: All</option>
                      {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
              </div>

              <div className="relative">
                  <select 
                    value={filterTechnician}
                    onChange={(e) => setFilterTechnician(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-2 text-xs md:text-sm bg-white"
                  >
                      <option value="All">Tech: All</option>
                      <option value="Unassigned">Unassigned</option>
                      {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
              </div>

              <div className="relative col-span-2 md:col-span-2">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Order..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 pl-9 pr-3 text-xs md:text-sm outline-none"
                  />
              </div>
          </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase">Order / Customer</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase">Device / Issue</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase">Technician</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase">Total Cost</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRepairs.map((repair) => {
                  const overdue = isOverdue(repair);
                  const totalCost = (repair.partsUsed.reduce((sum, p) => sum + p.cost, 0) + repair.laborCost).toFixed(2);
                  return (
                <tr key={repair.id} className={`hover:bg-slate-50 transition-colors ${overdue ? 'bg-red-50/40' : ''}`}>
                  <td className="px-6 py-4">
                      <div className="text-slate-800 font-mono font-medium text-sm flex items-center">
                          {repair.id} {overdue && <Clock size={14} className="ml-2 text-red-500 animate-pulse" />}
                          {repair.invoiceId && <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-1.5 rounded font-bold">{repair.invoiceId}</span>}
                      </div>
                      <div className="text-sm font-medium text-slate-600 mt-1">{repair.customerName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                        {getDeviceIcon(repair.deviceModel)} {repair.deviceModel}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{repair.issue}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                        value={repair.status}
                        onChange={(e) => handleStatusChange(repair.id, e.target.value as RepairStatus)}
                        className={`appearance-none pl-3 pr-8 py-1 rounded-lg text-xs font-bold cursor-pointer outline-none border border-transparent ${getStatusColor(repair.status)}`}
                    >
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                     {repair.technicianName || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">
                     ₹{totalCost}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                    <button onClick={() => setShowIntakeTicket(repair)} className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded text-xs border border-slate-200" title="Print Ticket">
                        <Receipt size={16}/>
                    </button>
                    <button onClick={() => setPrintLabelRepair(repair)} className="text-purple-600 hover:bg-purple-50 px-2 py-1 rounded text-xs border border-purple-100" title="Print Barcode">
                        <Barcode size={16}/>
                    </button>
                    <button onClick={() => openDetails(repair)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium">Details</button>
                    <button onClick={() => handleNotify(repair)} disabled={generatingFor === repair.id} className="text-slate-500 hover:text-blue-600 px-2 py-1 rounded text-xs"><MessageCircle size={14}/></button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 pb-20">
          {filteredRepairs.length === 0 && <p className="text-center text-slate-400 py-8">No repairs found.</p>}
          {filteredRepairs.map(repair => {
              const overdue = isOverdue(repair);
              const totalCost = (repair.partsUsed.reduce((sum, p) => sum + p.cost, 0) + repair.laborCost).toFixed(2);
              return (
                  <div key={repair.id} className={`bg-white p-4 rounded-xl border shadow-sm ${overdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`} onClick={() => openDetails(repair)}>
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-500">{repair.id}</span>
                                  {overdue && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">Overdue</span>}
                              </div>
                              <h3 className="font-bold text-slate-800 text-sm mt-0.5">{repair.customerName}</h3>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${getStatusColor(repair.status)}`}>
                             {repair.status}
                          </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-600 text-sm mb-3">
                          {getDeviceIcon(repair.deviceModel)}
                          <span className="font-medium">{repair.deviceModel}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 truncate">{repair.issue}</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                          <div className="text-xs text-slate-500 flex items-center">
                              <span className="font-bold text-slate-700 mr-2">₹{totalCost}</span>
                              {repair.technicianName || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowIntakeTicket(repair); }}
                                className="text-slate-500 p-1 rounded hover:bg-slate-100"
                              >
                                  <Receipt size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPrintLabelRepair(repair); }}
                                className="text-purple-600 text-xs flex items-center font-medium bg-purple-50 px-2 py-1 rounded"
                              >
                                  <Barcode size={14} className="mr-1"/> Label
                              </button>
                              <button className="text-blue-600 text-xs font-bold flex items-center">
                                  View Details <ChevronRight size={14} className="ml-1"/>
                              </button>
                          </div>
                      </div>
                  </div>
              )
          })}
      </div>

      {generatedMessage && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-lg fixed bottom-20 left-4 right-4 z-40 md:static md:mb-6 animate-slide-up">
           <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-blue-800 uppercase mb-1">AI Notification Draft</h3>
              <button onClick={() => setGeneratedMessage(null)}><X size={16} className="text-blue-400 hover:text-blue-700"/></button>
           </div>
           <p className="text-sm text-slate-700 italic mb-4 bg-white p-3 rounded-lg border border-blue-100">"{generatedMessage}"</p>
           
           <div className="flex space-x-3">
               <button 
                onClick={handleSendWhatsApp}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center transition-colors"
               >
                   <MessageCircle size={16} className="mr-2" /> WhatsApp
               </button>
               <button 
                onClick={handleSendSMS}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center transition-colors"
               >
                   <MessageSquare size={16} className="mr-2" /> SMS
               </button>
           </div>
        </div>
      )}

      {/* Repair Details Modal */}
      {isModalOpen && selectedRepair && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
              <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl overflow-y-auto flex flex-col animate-slide-up">
                  {/* Header */}
                  <div className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                      <div>
                          <div className="flex items-center space-x-2">
                              <h3 className="text-lg md:text-2xl font-bold text-slate-800">Repair Order</h3>
                              <span className="bg-slate-200 text-slate-600 font-mono text-xs md:text-sm px-2 py-0.5 rounded">#{selectedRepair.id}</span>
                          </div>
                          {selectedRepair.invoiceId && <p className="text-xs text-green-600 font-bold mt-1 flex items-center"><FileText size={12} className="mr-1"/> Linked to Invoice: {selectedRepair.invoiceId}</p>}
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-full border border-slate-200">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-20">
                      {/* Left Column */}
                      <div className="space-y-4 md:space-y-6">
                           {/* Status Changer */}
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Status</label>
                               <select 
                                    value={selectedRepair.status}
                                    onChange={(e) => handleStatusChange(selectedRepair.id, e.target.value as RepairStatus)}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                               >
                                   {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                               </select>
                           </div>

                           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
                               <h4 className="font-bold text-blue-800 mb-2">Customer Info</h4>
                               <p><span className="text-blue-600 font-medium">Name:</span> {selectedRepair.customerName}</p>
                               <p><span className="text-blue-600 font-medium">Mobile:</span> {selectedRepair.customerMobile}</p>
                               <p><span className="text-blue-600 font-medium">Location:</span> {selectedRepair.storeLocation}</p>
                           </div>

                           {/* Tech Assignment */}
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Technician</label>
                              <select
                                value={selectedRepair.technicianName || ''}
                                onChange={(e) => setSelectedRepair({...selectedRepair, technicianName: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                              >
                                <option value="">Select Technician</option>
                                {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                              </select>
                           </div>

                           {/* Special Order Button */}
                           {!isPOFormOpen ? (
                               <button 
                                 onClick={() => setIsPOFormOpen(true)}
                                 className="w-full border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center"
                               >
                                   <ShoppingCart size={16} className="mr-2"/> Order Non-Stock Part
                               </button>
                           ) : (
                               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in">
                                   <h5 className="font-bold text-slate-700 text-sm mb-2">Create Special Purchase Order</h5>
                                   <div className="space-y-2">
                                       <input 
                                         placeholder="Part Name" 
                                         className="w-full border p-2 rounded text-sm"
                                         value={poItemName}
                                         onChange={e => setPoItemName(e.target.value)}
                                       />
                                       <div className="flex gap-2">
                                           <input 
                                             placeholder="Cost (₹)" 
                                             type="number"
                                             className="w-1/2 border p-2 rounded text-sm"
                                             value={poCost}
                                             onChange={e => setPoCost(e.target.value)}
                                           />
                                            <select 
                                                className="w-1/2 border p-2 rounded text-sm bg-white"
                                                value={poSupplier}
                                                onChange={e => setPoSupplier(e.target.value)}
                                            >
                                                <option value="">Supplier...</option>
                                                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                       </div>
                                       <div className="flex gap-2 pt-2">
                                           <button onClick={handleCreatePO} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-medium">Create PO</button>
                                           <button onClick={() => setIsPOFormOpen(false)} className="px-3 bg-slate-200 text-slate-600 rounded text-sm">Cancel</button>
                                       </div>
                                   </div>
                               </div>
                           )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4 md:space-y-6">
                          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                              <h4 className="font-bold text-orange-800 mb-2 text-sm uppercase">Parts & Costs</h4>
                              <div className="flex gap-2 mb-2">
                                  <select 
                                      value={selectedPartId} 
                                      onChange={(e) => setSelectedPartId(e.target.value)}
                                      className="flex-1 text-xs border p-2 rounded bg-white"
                                  >
                                      <option value="">Add Part from Inventory...</option>
                                      {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (₹{i.price}) {i.currentStock <= 0 ? '(OOS)' : ''}</option>)}
                                  </select>
                                  <button onClick={handleAddPartToRepair} className="bg-orange-600 text-white px-3 rounded text-xs">Add</button>
                              </div>
                              <div className="space-y-1 mb-2">
                                  {selectedRepair.partsUsed.map((p, i) => (
                                      <div key={i} className="flex justify-between text-xs bg-white p-2 rounded border border-orange-100">
                                          <span>{p.name} {p.inventoryId ? '(Stock)' : '(Manual)'}</span>
                                          <span>₹{p.cost}</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="flex justify-between items-center text-sm pt-2 border-t border-orange-200 font-bold text-orange-900">
                                  <span>Total Estimate:</span>
                                  <span>₹{(selectedRepair.partsUsed.reduce((acc, p) => acc + p.cost, 0) + selectedRepair.laborCost).toFixed(2)}</span>
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repair Notes</label>
                              <textarea 
                                className="w-full h-24 border rounded-lg p-3 text-sm" 
                                placeholder="Public notes..."
                                value={selectedRepair.notes || ''}
                                onChange={(e) => setSelectedRepair({...selectedRepair, notes: e.target.value})}
                              />
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Notes</label>
                              <textarea 
                                className="w-full h-24 border rounded-lg p-3 text-sm bg-yellow-50/50" 
                                placeholder="Tech-only notes..."
                                value={selectedRepair.internalNotes || ''}
                                onChange={(e) => setSelectedRepair({...selectedRepair, internalNotes: e.target.value})}
                              />
                          </div>

                          <button 
                            onClick={handleSaveDetails}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md"
                          >
                              Save Changes
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Barcode Print Modal */}
      {printLabelRepair && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm print:bg-white print:p-0 print:absolute print:inset-0">
             <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full print:shadow-none print:w-full print:max-w-none print:p-0">
                  <div className="flex justify-between items-center mb-4 print:hidden">
                      <h3 className="text-lg font-bold">Print Label (15x30mm)</h3>
                      <button onClick={() => setPrintLabelRepair(null)} className="p-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                  </div>
                  
                  {/* Label Preview Container */}
                  <div className="flex justify-center bg-slate-100 p-8 rounded-lg mb-4 print:bg-white print:p-0 print:m-0 print:block">
                      <div className="bg-white border border-slate-300 w-[113px] h-[56px] flex flex-col items-center justify-center overflow-hidden p-1 relative print:border-none print:w-full print:h-full">
                          <p className="text-[8px] font-bold text-center leading-tight w-full truncate mb-0.5">{printLabelRepair.customerName}</p>
                          <svg ref={barcodeRef} className="w-full h-8"></svg>
                          <p className="text-[8px] font-bold mt-0.5">{printLabelRepair.id}</p>
                      </div>
                  </div>

                  <button 
                    onClick={() => window.print()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium flex items-center justify-center print:hidden"
                  >
                      <Printer size={18} className="mr-2" /> Print Now
                  </button>
             </div>
             {/* Print Style */}
             <style>{`
                @media print {
                    @page { size: 30mm 15mm; margin: 0; }
                    body { margin: 0; padding: 0; }
                    body > *:not(.fixed) { display: none; }
                    .fixed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: white; }
                }
             `}</style>
          </div>
      )}

      {/* Intake Ticket Modal (Thermal Print) */}
      {showIntakeTicket && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm print:bg-white print:static print:block">
              <div className="bg-white p-6 w-[350px] shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto print:shadow-none print:w-full print:max-w-none print:p-0 print:overflow-visible">
                  <div className="flex justify-between items-center mb-4 print:hidden">
                       <h3 className="font-bold">Intake Ticket Preview</h3>
                       <button onClick={() => setShowIntakeTicket(null)}><X size={20}/></button>
                  </div>

                  <div className="ticket-content font-mono text-black text-xs">
                      <div className="text-center mb-4 border-b border-black pb-2">
                          <h2 className="text-xl font-bold">REPAIR TICKET</h2>
                          <p className="text-sm">Android Mobile Park</p>
                          <p>{new Date().toLocaleDateString()}</p>
                      </div>

                      <div className="mb-4">
                          <h1 className="text-2xl font-bold text-center border-2 border-black p-1 mb-2">{showIntakeTicket.id}</h1>
                          <p><span className="font-bold">Customer:</span> {showIntakeTicket.customerName}</p>
                          <p><span className="font-bold">Device:</span> {showIntakeTicket.deviceModel}</p>
                          <p><span className="font-bold">Issue:</span> {showIntakeTicket.issue}</p>
                      </div>

                      <div className="mb-4 border-t border-black border-dashed pt-2">
                          <p><span className="font-bold">Est. Completion:</span><br/>{showIntakeTicket.estimatedCompletion?.replace('T', ' ')}</p>
                      </div>

                      <div className="text-[10px] leading-tight mb-8">
                          <p className="font-bold mb-1">TERMS & CONDITIONS:</p>
                          <p>1. We are not responsible for data loss. Please backup.</p>
                          <p>2. Diagnosis fees apply if repair is cancelled.</p>
                          <p>3. Devices left over 30 days will be recycled.</p>
                      </div>

                      <div className="border-t border-black pt-8 mt-4">
                          <p className="text-center">Customer Signature</p>
                      </div>
                  </div>

                  <button 
                     onClick={() => window.print()} 
                     className="w-full bg-black text-white py-2 rounded font-bold mt-4 print:hidden hover:bg-gray-800"
                   >
                       Print Ticket
                   </button>
              </div>

              <style>{`
                  @media print {
                      @page { size: 58mm auto; margin: 0; }
                      body { margin: 0; padding: 5px; }
                      body > *:not(.fixed) { display: none; }
                      .fixed { position: static; display: block; background: white; height: auto; }
                      .ticket-content { width: 100%; max-width: 56mm; margin: 0 auto; }
                      button { display: none !important; }
                  }
               `}</style>
          </div>
      )}
    </div>
  );
};

export default RepairView;