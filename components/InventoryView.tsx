import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, RestockSuggestion, BrandData, Supplier, PurchaseOrder, UserProfile } from '../types';
import { analyzeInventoryAI } from '../services/geminiService';
import { BrainCircuit, Package, ShoppingCart, Plus, X, Search, Edit, Trash2, Save, List, AlertTriangle, Truck, Eye, ChevronRight, Barcode, Printer } from 'lucide-react';

// Declare JsBarcode for TypeScript since it's loaded via CDN
declare const JsBarcode: any;

interface InventoryViewProps {
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    brands: BrandData[];
    categories: string[];
    suppliers: Supplier[];
    onAddModel: (brand: string, model: string) => void;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    currentUser: UserProfile;
    onSetFabAction?: (action: (() => void) | undefined) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ 
    inventory, setInventory, brands, categories, suppliers, onAddModel, purchaseOrders, setPurchaseOrders, currentUser, onSetFabAction
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');

  // Role Access
  const canManageStock = currentUser.role === 'Admin' || currentUser.role === 'Technician';
  const canManagePurchasing = currentUser.role === 'Admin' || currentUser.role === 'Sales';

  const [suggestions, setSuggestions] = useState<RestockSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [poStatus, setPoStatus] = useState<Record<string, 'idle' | 'creating' | 'created'>>({});

  // Filter State
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom PO State
  const [showCustomPO, setShowCustomPO] = useState(false);
  const [customPOItem, setCustomPOItem] = useState('');
  const [customPOQty, setCustomPOQty] = useState('');
  const [customPOCost, setCustomPOCost] = useState('');
  const [customPOSupplier, setCustomPOSupplier] = useState('');
  const [customPOBrand, setCustomPOBrand] = useState('');
  const [customPOModel, setCustomPOModel] = useState('');
  const [customPOCategory, setCustomPOCategory] = useState('');
  const [customPOSuccess, setCustomPOSuccess] = useState(false);

  // PO Details Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Add/Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Partial<InventoryItem>>({});
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  // Barcode Printing State
  const [printLabelItem, setPrintLabelItem] = useState<InventoryItem | null>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Set FAB action for mobile
  useEffect(() => {
    if (onSetFabAction) {
        if (canManageStock && activeTab === 'inventory') {
            onSetFabAction(() => handleAddNewItem);
        } else if (canManagePurchasing && activeTab === 'orders') {
            onSetFabAction(() => setShowCustomPO(true));
        } else {
            onSetFabAction(undefined);
        }
    }
  }, [onSetFabAction, canManageStock, canManagePurchasing, activeTab]);

  // Generate Barcode when modal opens
  useEffect(() => {
      if (printLabelItem && barcodeRef.current) {
          if (typeof JsBarcode !== 'undefined') {
              try {
                  JsBarcode(barcodeRef.current, printLabelItem.sku, {
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
  }, [printLabelItem]);

  // Derived filter lists
  const filterBrands = useMemo(() => ['All', ...brands.map(b => b.name)], [brands]);
  const filterCategories = useMemo(() => ['All', ...categories], [categories]);

  // Derived models for Add Item form
  const availableModelsForForm = brands.find(b => b.name === itemFormData.brand)?.models || [];
  
  // Derived models for Custom PO form
  const availableModelsForPO = brands.find(b => b.name === customPOBrand)?.models || [];

  // Filtered Inventory
  const filteredInventory = inventory.filter(item => {
      const matchesBrand = selectedBrand === 'All' || (item.brand || 'Other') === selectedBrand;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.model && item.model.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesBrand && matchesCategory && matchesSearch;
  });

  const handleAnalyze = async () => {
    setLoading(true);
    setPoStatus({}); 
    const allResults = await analyzeInventoryAI(inventory);
    setSuggestions(allResults);
    setLoading(false);
  };

  const handleCreateAIPO = async (suggestion: RestockSuggestion) => {
    setPoStatus(prev => ({ ...prev, [suggestion.productId]: 'creating' }));
    const itemDetails = inventory.find(i => i.id === suggestion.productId);
    const unitCost = itemDetails ? itemDetails.price * 0.6 : 0; 
    const totalCost = unitCost * suggestion.recommendedRestock;

    const newPO: PurchaseOrder = {
        id: `PO-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        supplierName: itemDetails?.supplierName || 'Unknown Supplier',
        status: 'Ordered',
        totalAmount: totalCost,
        items: [{
            itemId: suggestion.productId,
            name: suggestion.productName,
            quantity: suggestion.recommendedRestock,
            unitCost: unitCost,
            totalCost: totalCost
        }]
    };
    await new Promise(resolve => setTimeout(resolve, 800));
    setPurchaseOrders(prev => [newPO, ...prev]);
    setPoStatus(prev => ({ ...prev, [suggestion.productId]: 'created' }));
  };

  const handleSaveCustomPO = async () => {
      if(!customPOItem || !customPOQty) return;
      const qty = parseInt(customPOQty);
      const unitCost = parseFloat(customPOCost) || 0;
      const total = qty * unitCost;

      const newPO: PurchaseOrder = {
          id: `PO-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          supplierName: customPOSupplier || 'General Vendor',
          status: 'Ordered',
          totalAmount: total,
          items: [{
              name: customPOItem,
              quantity: qty,
              unitCost: unitCost,
              totalCost: total,
              brand: customPOBrand,
              model: customPOModel,
              category: customPOCategory
          }]
      };

      setPurchaseOrders(prev => [newPO, ...prev]);
      setCustomPOSuccess(true);
      setTimeout(() => {
          setCustomPOSuccess(false);
          setShowCustomPO(false);
          setCustomPOItem(''); setCustomPOQty(''); setCustomPOCost(''); setCustomPOSupplier(''); setCustomPOBrand(''); setCustomPOModel(''); setCustomPOCategory('');
      }, 1500);
  };

  const handleReceivePO = (po: PurchaseOrder) => {
      if(po.status === 'Received') return;
      let updatedInventory = [...inventory];
      po.items.forEach(poItem => {
          if (poItem.itemId) {
              const index = updatedInventory.findIndex(i => i.id === poItem.itemId);
              if (index !== -1) {
                  updatedInventory[index] = { ...updatedInventory[index], currentStock: updatedInventory[index].currentStock + poItem.quantity };
              }
          } else {
              const newItem: InventoryItem = {
                  id: `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  sku: `NEW-${Math.floor(Math.random() * 10000)}`,
                  name: poItem.name,
                  category: poItem.category || 'General',
                  brand: poItem.brand || '',
                  model: poItem.model || '',
                  supplierName: po.supplierName,
                  currentStock: poItem.quantity,
                  reorderPoint: 5,
                  price: poItem.unitCost * 1.5 || 0
              };
              updatedInventory.push(newItem);
              if(poItem.brand && poItem.model) onAddModel(poItem.brand, poItem.model);
          }
      });
      setInventory(updatedInventory);
      setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received' } : p));
      setSelectedPO(null);
  };

  const handleAddNewItem = () => {
      setEditingItem(null);
      setItemFormData({ sku: '', name: '', category: 'General', brand: '', model: '', supplierName: '', currentStock: 0, reorderPoint: 5, price: 0 });
      setIsAddingBrand(false);
      setShowItemModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
      setEditingItem(item);
      setItemFormData({ ...item });
      setIsAddingBrand(false);
      setShowItemModal(true);
  };

  const handleDeleteItem = (id: string) => {
      if(confirm('Are you sure you want to delete this item?')) {
          setInventory(prev => prev.filter(i => i.id !== id));
      }
  };

  const handleSaveItem = () => {
      if (!itemFormData.name || !itemFormData.sku) { alert("Name and SKU are required."); return; }
      if (itemFormData.brand && itemFormData.model) onAddModel(itemFormData.brand, itemFormData.model);

      const newItem: InventoryItem = {
          id: editingItem ? editingItem.id : Date.now().toString(),
          sku: itemFormData.sku || 'SKU-000',
          name: itemFormData.name || 'New Item',
          category: itemFormData.category || 'General',
          brand: itemFormData.brand || '',
          model: itemFormData.model || '',
          supplierName: itemFormData.supplierName || '',
          currentStock: Number(itemFormData.currentStock) || 0,
          reorderPoint: Number(itemFormData.reorderPoint) || 0,
          price: Number(itemFormData.price) || 0,
      };

      if (editingItem) setInventory(prev => prev.map(i => i.id === editingItem.id ? newItem : i));
      else setInventory(prev => [...prev, newItem]);
      setShowItemModal(false);
  };

  const handlePrintLabel = () => {
      window.print();
  };

  const getStockStatus = (item: InventoryItem) => {
      if (item.currentStock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
      if (item.currentStock <= item.reorderPoint) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      return { label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  return (
    <div className="space-y-4 md:space-y-6 relative h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Inventory & Ordering</h2>
          <p className="text-sm text-slate-500 mt-1 hidden md:block">Real-time stock tracking and automated purchasing.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             {canManageStock && (
                <button 
                    onClick={handleAddNewItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:py-3 rounded-lg flex items-center shadow-md transition-all whitespace-nowrap text-sm md:text-base hidden md:flex"
                >
                    <Plus size={18} className="mr-2" /> Add Item
                </button>
             )}
             {canManagePurchasing && (
                <>
                    <button 
                        onClick={() => setShowCustomPO(true)}
                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 md:py-3 rounded-lg flex items-center shadow-sm transition-all whitespace-nowrap text-sm md:text-base"
                    >
                        <ShoppingCart size={18} className="mr-2" /> Custom PO
                    </button>
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 md:py-3 rounded-lg flex items-center shadow-lg shadow-purple-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
                    >
                        {loading ? (
                            <span className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Analyzing...</span>
                        ) : (
                            <><BrainCircuit size={20} className="mr-2" /> AI Stock Analysis</>
                        )}
                    </button>
                </>
             )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto flex-shrink-0">
        <button 
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <List size={16} className="mr-2" /> Stock List
        </button>
        {canManagePurchasing && (
            <button 
                onClick={() => setActiveTab('orders')}
                className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <ShoppingCart size={16} className="mr-2" /> Purchase Orders 
                {purchaseOrders.filter(p => p.status === 'Ordered').length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs font-bold">
                        {purchaseOrders.filter(p => p.status === 'Ordered').length}
                    </span>
                )}
            </button>
        )}
      </div>

      {activeTab === 'inventory' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters Bar */}
            <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-4 flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                    <div className="relative">
                        <select 
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            {filterBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    
                    <div className="relative">
                        <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            {filterCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="relative col-span-2 md:col-span-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search SKU, Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg py-2 pl-9 pr-3 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto grid grid-cols-1 ${canManagePurchasing ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
                <div className={`${canManagePurchasing ? 'lg:col-span-2' : 'lg:col-span-1'} flex flex-col`}>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">SKU / Info</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Brand / Model</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase text-center">Stock</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Status</th>
                                    {canManagePurchasing && <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase text-right">Price</th>}
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase text-center">Label</th>
                                    {canManageStock && <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInventory.map((item) => {
                                    const status = getStockStatus(item);
                                    return (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{item.brand || '-'} / {item.model || 'Universal'}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold">{item.currentStock}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-1 rounded-full font-bold border uppercase ${status.color}`}>{status.label}</span></td>
                                        {canManagePurchasing && <td className="px-4 py-3 text-right text-sm">₹{item.price.toFixed(2)}</td>}
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => setPrintLabelItem(item)}
                                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                title="Print Barcode"
                                            >
                                                <Barcode size={18} />
                                            </button>
                                        </td>
                                        {canManageStock && <td className="px-4 py-3 text-center flex justify-center gap-2">
                                            <button onClick={() => handleEditItem(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                            {currentUser.role === 'Admin' && <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>}
                                        </td>}
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 pb-20">
                        {filteredInventory.length === 0 && <p className="text-center text-slate-400 py-8">No items found.</p>}
                        {filteredInventory.map((item) => {
                            const status = getStockStatus(item);
                            return (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" onClick={() => handleEditItem(item)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{item.name}</h3>
                                            <p className="text-xs text-slate-500">{item.brand} • {item.model}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${status.color}`}>{status.label}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <div className="text-xs text-slate-400 font-mono bg-slate-50 px-1 rounded">{item.sku}</div>
                                        <div className="text-right flex items-center gap-3">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPrintLabelItem(item); }}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-full"
                                            >
                                                <Barcode size={16} />
                                            </button>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Stock</p>
                                                <p className={`text-xl font-bold ${item.currentStock <= item.reorderPoint ? 'text-red-600' : 'text-slate-800'}`}>{item.currentStock}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Recommendations Panel */}
                {canManagePurchasing && suggestions.length > 0 && (
                    <div className="space-y-4 mt-6 lg:mt-0 pb-20">
                         <div className="flex items-center space-x-2 text-purple-700 font-bold px-1">
                             <AlertTriangle size={18} />
                             <h3>Stock Alerts</h3>
                         </div>
                         {suggestions.map((sugg, idx) => {
                             const status = poStatus[sugg.productId] || 'idle';
                             return (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{sugg.productName}</h4>
                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap ml-2">
                                            + Order {sugg.recommendedRestock}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">{sugg.reasoning}</p>
                                    <button 
                                        onClick={() => handleCreateAIPO(sugg)}
                                        disabled={status !== 'idle'}
                                        className="w-full text-xs py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    >
                                        {status === 'creating' ? 'Creating PO...' : status === 'created' ? 'PO Created' : 'Create PO'}
                                    </button>
                                </div>
                             )
                         })}
                    </div>
                )}
            </div>
        </div>
      ) : (
        /* Purchase Orders Tab */
        <div className="flex-1 overflow-y-auto pb-20">
             {/* Desktop Table */}
             <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">PO Number</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Supplier</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {purchaseOrders.map(po => (
                              <tr key={po.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-mono text-sm text-slate-800 font-medium">{po.id}</td>
                                  <td className="px-6 py-4 text-sm text-slate-600">{po.supplierName}</td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">₹{po.totalAmount.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${po.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{po.status}</span></td>
                                  <td className="px-6 py-4 text-center"><button onClick={() => setSelectedPO(po)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Eye size={18}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
             </div>

             {/* Mobile Cards for POs */}
             <div className="md:hidden space-y-3">
                 {purchaseOrders.map(po => (
                     <div key={po.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" onClick={() => setSelectedPO(po)}>
                         <div className="flex justify-between items-center mb-2">
                             <span className="font-mono text-xs font-bold text-slate-500">{po.id}</span>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${po.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{po.status}</span>
                         </div>
                         <h4 className="font-bold text-slate-800 text-sm mb-1">{po.supplierName}</h4>
                         <div className="flex justify-between items-end mt-2">
                             <p className="text-xs text-slate-400">{po.date}</p>
                             <p className="font-bold text-lg text-slate-800">₹{po.totalAmount.toFixed(2)}</p>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                     <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                     <button onClick={() => setShowItemModal(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                 </div>
                 <div className="p-6 overflow-y-auto space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                         <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="e.g. iPhone 13 Screen" value={itemFormData.name || ''} onChange={e => setItemFormData({...itemFormData, name: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                            <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="SKU-123" value={itemFormData.sku || ''} onChange={e => setItemFormData({...itemFormData, sku: e.target.value})} />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                            <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={itemFormData.category || ''} onChange={e => setItemFormData({...itemFormData, category: e.target.value})}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                     </div>
                     
                     {/* Brand & Model Selection */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                            <div className="relative">
                                {isAddingBrand ? (
                                    <div className="flex gap-2">
                                        <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="New Brand" value={itemFormData.brand || ''} onChange={e => setItemFormData({...itemFormData, brand: e.target.value})} />
                                        <button onClick={() => setIsAddingBrand(false)} className="p-2 border rounded hover:bg-slate-50"><List size={16}/></button>
                                    </div>
                                ) : (
                                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" 
                                        value={itemFormData.brand || ''} 
                                        onChange={e => {
                                            if(e.target.value === '__NEW__') setIsAddingBrand(true);
                                            else setItemFormData({...itemFormData, brand: e.target.value});
                                        }}
                                    >
                                        <option value="">Select Brand</option>
                                        {brands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                        <option value="__NEW__" className="font-bold text-blue-600">+ Add New</option>
                                    </select>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
                             <select 
                                className="w-full border p-2.5 rounded-lg text-sm bg-white"
                                value={itemFormData.model || ''}
                                onChange={e => setItemFormData({...itemFormData, model: e.target.value})}
                                disabled={!itemFormData.brand || isAddingBrand}
                             >
                                <option value="">Select Model</option>
                                {availableModelsForForm.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Stock</label>
                            <input className="w-full border p-2.5 rounded-lg text-sm" type="number" value={itemFormData.currentStock || 0} onChange={e => setItemFormData({...itemFormData, currentStock: parseInt(e.target.value)})} />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reorder Point</label>
                            <input className="w-full border p-2.5 rounded-lg text-sm" type="number" value={itemFormData.reorderPoint || 0} onChange={e => setItemFormData({...itemFormData, reorderPoint: parseInt(e.target.value)})} />
                         </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (₹)</label>
                            <input className="w-full border p-2.5 rounded-lg text-sm" type="number" value={itemFormData.price || 0} onChange={e => setItemFormData({...itemFormData, price: parseFloat(e.target.value)})} />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
                            <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={itemFormData.supplierName || ''} onChange={e => setItemFormData({...itemFormData, supplierName: e.target.value})}>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                         </div>
                     </div>

                     <button onClick={handleSaveItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold mt-4 shadow-md transition-colors">
                         {editingItem ? 'Update Item' : 'Save New Item'}
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {printLabelItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm print:bg-white print:p-0 print:absolute print:inset-0">
             <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full print:shadow-none print:w-full print:max-w-none print:p-0">
                  <div className="flex justify-between items-center mb-4 print:hidden">
                      <h3 className="text-lg font-bold">Print Label (15x30mm)</h3>
                      <button onClick={() => setPrintLabelItem(null)} className="p-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                  </div>
                  
                  {/* Label Preview Container */}
                  <div className="flex justify-center bg-slate-100 p-8 rounded-lg mb-4 print:bg-white print:p-0 print:m-0 print:block">
                      <div className="bg-white border border-slate-300 w-[113px] h-[56px] flex flex-col items-center justify-center overflow-hidden p-1 relative print:border-none print:w-full print:h-full">
                          <p className="text-[8px] font-bold text-center leading-tight w-full truncate mb-0.5">{printLabelItem.name}</p>
                          <svg ref={barcodeRef} className="w-full h-8"></svg>
                          <p className="text-[10px] font-bold mt-0.5">₹{printLabelItem.price}</p>
                      </div>
                  </div>

                  <button 
                    onClick={handlePrintLabel}
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

      {/* Custom PO Modal */}
      {showCustomPO && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                 <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                     <h3 className="font-bold text-slate-800">Create Custom Purchase Order</h3>
                     <button onClick={() => setShowCustomPO(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                 </div>
                 <div className="p-6 space-y-4">
                     {!customPOSuccess ? (
                         <>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                                 <input className="w-full border p-2.5 rounded-lg text-sm" value={customPOItem} onChange={e => setCustomPOItem(e.target.value)} placeholder="e.g. Screen Protectors" />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={customPOBrand} onChange={e => setCustomPOBrand(e.target.value)}>
                                        <option value="">Select Brand</option>
                                        {brands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
                                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={customPOModel} onChange={e => setCustomPOModel(e.target.value)} disabled={!customPOBrand}>
                                        <option value="">Select Model</option>
                                        {availableModelsForPO.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                                     <input className="w-full border p-2.5 rounded-lg text-sm" type="number" value={customPOQty} onChange={e => setCustomPOQty(e.target.value)} />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Cost (₹)</label>
                                     <input className="w-full border p-2.5 rounded-lg text-sm" type="number" value={customPOCost} onChange={e => setCustomPOCost(e.target.value)} />
                                 </div>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
                                 <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={customPOSupplier} onChange={e => setCustomPOSupplier(e.target.value)}>
                                     <option value="">Select Supplier</option>
                                     {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                 </select>
                             </div>

                             <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 flex justify-between">
                                 <span>Total Estimated Cost:</span>
                                 <span className="font-bold">₹{((parseInt(customPOQty) || 0) * (parseFloat(customPOCost) || 0)).toFixed(2)}</span>
                             </div>

                             <button onClick={handleSaveCustomPO} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md">
                                 Generate Purchase Order
                             </button>
                         </>
                     ) : (
                         <div className="text-center py-8">
                             <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                 <ShoppingCart className="text-green-600" size={32} />
                             </div>
                             <h4 className="text-xl font-bold text-slate-800">Order Created!</h4>
                             <p className="text-slate-500 mt-2">Purchase order has been saved successfully.</p>
                         </div>
                     )}
                 </div>
             </div>
          </div>
      )}

      {/* PO Details Modal */}
      {selectedPO && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                     <div>
                         <h3 className="font-bold text-slate-800 text-lg">Purchase Order Details</h3>
                         <p className="text-xs text-slate-500 font-mono">{selectedPO.id}</p>
                     </div>
                     <button onClick={() => setSelectedPO(null)}><X className="text-slate-400 hover:text-slate-600"/></button>
                 </div>
                 <div className="p-6 overflow-y-auto">
                     <div className="flex justify-between mb-6">
                         <div>
                             <p className="text-xs font-bold text-slate-500 uppercase">Supplier</p>
                             <p className="font-bold text-slate-800 text-lg">{selectedPO.supplierName}</p>
                             <p className="text-sm text-slate-500">{selectedPO.date}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-xs font-bold text-slate-500 uppercase">Total Amount</p>
                             <p className="font-bold text-blue-600 text-2xl">₹{selectedPO.totalAmount.toFixed(2)}</p>
                             <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedPO.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                 {selectedPO.status}
                             </span>
                         </div>
                     </div>

                     <h4 className="font-bold text-slate-700 mb-2 text-sm border-b pb-1">Items Ordered</h4>
                     <div className="space-y-2 mb-8">
                         {selectedPO.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                 <div>
                                     <p className="font-medium text-slate-800">{item.name}</p>
                                     <p className="text-xs text-slate-500">{item.brand} {item.model ? `• ${item.model}` : ''}</p>
                                 </div>
                                 <div className="text-right text-sm">
                                     <p><span className="font-bold">{item.quantity}</span> x ₹{item.unitCost}</p>
                                     <p className="font-bold text-slate-700">₹{item.totalCost.toFixed(2)}</p>
                                 </div>
                             </div>
                         ))}
                     </div>

                     {selectedPO.status === 'Ordered' && canManageStock && (
                         <button 
                             onClick={() => handleReceivePO(selectedPO)}
                             className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center transition-colors"
                         >
                             <Truck size={20} className="mr-2" /> Mark as Received & Add to Inventory
                         </button>
                     )}
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default InventoryView;