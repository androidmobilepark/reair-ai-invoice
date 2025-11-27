
import React, { useState, useEffect, useRef } from 'react';
import { generateInvoiceAI } from '../services/geminiService';
import { GeneratedInvoice, Customer, AppSettings, BrandData, SalesPerson, Technician } from '../types';
import { Sparkles, Printer, Download, FileText, Smartphone, User, Phone, Lock, Palette, Tag, Grid3X3, DollarSign, CalendarClock, Wrench, Box, Search, CheckCircle, UserCheck, ChevronDown, MonitorSmartphone, CheckSquare, Square, X, RotateCcw, Plus, List, Receipt } from 'lucide-react';

interface InvoiceViewProps {
  onInvoiceCreated: (invoice: GeneratedInvoice) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  settings: AppSettings;
  brands: BrandData[];
  categories: string[];
  onAddModel: (brand: string, model: string) => void;
  onAddCategory: (category: string) => void;
  salesPersons: SalesPerson[];
  technicians: Technician[];
}

// Helper Component for Pattern Drawing
const PatternLock: React.FC<{ onComplete: (pattern: string) => void; onClose: () => void }> = ({ onComplete, onClose }) => {
    const [path, setPath] = useState<number[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 3x3 Grid of dots (1-9)
    const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const getDotCoords = (index: number) => {
        // Calculate relative coordinates for SVG lines based on a 3x3 grid layout
        // Assuming a 240px container with padding
        const col = (index - 1) % 3;
        const row = Math.floor((index - 1) / 3);
        const gap = 80; 
        const offset = 40;
        return { x: col * gap + offset, y: row * gap + offset };
    };

    const handleMouseDown = (dot: number) => {
        setIsDrawing(true);
        setPath([dot]);
    };

    const handleMouseEnter = (dot: number) => {
        if (isDrawing && !path.includes(dot)) {
            // Check for valid moves (simple adjacency or bridging) could be added here
            // For now, allow free connection like standard Android patterns
            setPath(prev => [...prev, dot]);
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        if (path.length > 0) {
            onComplete(path.join('-'));
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDrawing) return;
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element) {
            const dotId = element.getAttribute('data-dot');
            if (dotId) {
                const dot = parseInt(dotId);
                if (!path.includes(dot)) {
                    setPath(prev => [...prev, dot]);
                }
            }
        }
    };

    return (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72 animate-fade-in select-none">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700">Draw Pattern</h4>
                <div className="flex gap-2">
                    <button onClick={() => setPath([])} className="p-1 text-slate-400 hover:text-slate-600" title="Reset">
                        <RotateCcw size={16} />
                    </button>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-500" title="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>
            
            <div 
                ref={containerRef}
                className="relative w-60 h-60 bg-slate-50 rounded-xl mx-auto touch-none"
                onMouseLeave={() => setIsDrawing(false)}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
            >
                {/* SVG Layer for Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <polyline 
                        points={path.map(p => {
                            const {x, y} = getDotCoords(p);
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-80"
                    />
                </svg>

                {/* Dots Grid */}
                <div className="grid grid-cols-3 gap-0 h-full w-full">
                    {dots.map(dot => {
                        const isActive = path.includes(dot);
                        return (
                            <div 
                                key={dot}
                                data-dot={dot}
                                className="flex items-center justify-center cursor-pointer relative z-20"
                                onMouseDown={() => handleMouseDown(dot)}
                                onMouseEnter={() => handleMouseEnter(dot)}
                                onTouchStart={() => handleMouseDown(dot)}
                                onTouchMove={handleTouchMove}
                            >
                                <div 
                                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-600 scale-150 ring-4 ring-blue-100' 
                                        : 'bg-slate-300 hover:bg-slate-400'
                                    }`} 
                                />
                                {/* Hit area expansion for easier touch */}
                                <div className="absolute inset-4 bg-transparent" /> 
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3 font-mono">
                Sequence: {path.join('-')}
            </p>
        </div>
    );
};

const InvoiceView: React.FC<InvoiceViewProps> = ({ 
    onInvoiceCreated, customers, setCustomers, settings, brands, categories, onAddModel, onAddCategory, salesPersons, technicians 
}) => {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [passcode, setPasscode] = useState('');
  const [pattern, setPattern] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [repairDetails, setRepairDetails] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // UI State for Custom Entries
  const [showPatternGrid, setShowPatternGrid] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false); 
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Checklist State
  const [hasSimTray, setHasSimTray] = useState(false);
  const [hasSimCard, setHasSimCard] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);

  // CRM Integration State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [invoice, setInvoice] = useState<GeneratedInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThermalReceipt, setShowThermalReceipt] = useState(false);

  const colors = ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red', 'Green', 'Purple', 'Grey', 'Other'];

  // Derived Models based on Brand selection (if brand exists in list)
  const availableModels = brands.find(b => b.name === brand)?.models || [];

  const SERVICE_TEMPLATES = [
    { id: 'screen', name: 'Screen Replacement', details: 'High-quality screen assembly replacement.\nTouch digitizer calibration.\nTrueTone programming included.', cost: 8500.00 },
    { id: 'battery', name: 'Battery Replacement', details: 'Old battery removal and disposal.\nNew OEM-spec battery installation.\nCharging cycle validation.', cost: 3500.00 },
    { id: 'port', name: 'Charging Port Repair', details: 'Charging port module replacement.\nInternal dust cleaning.\nCurrent draw testing.', cost: 1800.00 },
    { id: 'water', name: 'Water Damage Treatment', details: 'Motherboard ultrasonic cleaning.\nCorrosion removal.\nComponent-level diagnostic.\nNote: Success not guaranteed.', cost: 2500.00 },
    { id: 'software', name: 'Software Restore', details: 'System firmware re-flash.\nBootloop troubleshooting.\nData integrity verification (if possible).', cost: 1500.00 },
  ];

  const handleServiceTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const service = SERVICE_TEMPLATES.find(s => s.id === e.target.value);
    if (service) {
        setRepairDetails(service.details);
        setEstimatedCost(service.cost.toString());
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
      setCustomerName(customer.name);
      setMobile(customer.phone);
      setSelectedCustomerId(customer.id);
      setShowSuggestions(false);
  };

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) && customerName.length > 0 && selectedCustomerId !== c.id
  );

  const handleGenerate = async () => {
    if (!customerName || !repairDetails) return;

    setLoading(true);

    // AUTO-SAVE: If brand/model/category are new, add them to global state
    if (brand && model) {
        onAddModel(brand, model);
    }
    if (category) {
        onAddCategory(category);
    }

    // Robust Client-Side ID Generation: PREFIX-YYYYMMDD-XXXX
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    
    // Generate 4 random alphanumeric characters
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X');
    
    // Use configured Prefix from Settings
    const prefix = settings.invoicePrefix || 'INV';
    const generatedInvoiceId = `${prefix}-${datePart}-${randomPart}`;
    const currentDate = now.toLocaleDateString();

    // Construct a detailed prompt from form data including the pre-generated ID
    const prompt = `
      Generate a professional invoice for a repair shop named "${settings.storeName}".
      
      MANDATORY INSTRUCTION:
      - You MUST use the provided Invoice ID: "${generatedInvoiceId}" in the output JSON.
      - You MUST use the Date: "${currentDate}" in the output JSON.
      - You MUST include the Sales Person: "${selectedSalesPerson}" in the output JSON if provided.
      - You MUST include the Technician: "${selectedTechnician}" in the output JSON if provided.

      CUSTOMER INFO:
      Customer Name: ${customerName}
      Customer Mobile: ${mobile}
      
      STAFF INFO:
      Sales/Pickup: ${selectedSalesPerson}
      Technician: ${selectedTechnician}

      DEVICE INFO:
      Device Category: ${category}
      Device Brand: ${brand}
      Device Model: ${model}
      Device Color: ${color}
      Device Passcode: ${passcode}
      Unlock Pattern: ${pattern}
      
      ACCESSORIES / CHECKLIST:
      Sim Tray Received: ${hasSimTray ? 'Yes' : 'No'}
      Sim Card Received: ${hasSimCard ? 'Yes' : 'No'}
      Battery Received: ${hasBattery ? 'Yes' : 'No'}
      
      REPAIR DETAILS:
      ${repairDetails}
      
      ESTIMATES:
      Estimated Cost: ${estimatedCost}
      Estimated Completion: ${estimatedCompletion}
      
      INSTRUCTIONS:
      - Assume a tax rate of ${settings.taxRate}% if not specified.
      - Breakdown line items based on the repair details description.
      - Ensure 'received_sim_tray', 'received_sim_card', and 'received_battery' fields are boolean in the JSON.
    `;

    const result = await generateInvoiceAI(prompt);
    
    if (result) {
        // Enforce the generated ID and Date on the client side to ensure 100% match
        const finalInvoice = {
            ...result,
            invoice_id: generatedInvoiceId,
            date: result.date || currentDate,
            sales_person: selectedSalesPerson, // Ensure sales person is set even if AI misses it
            technician_name: selectedTechnician, // Ensure technician is set
            received_sim_tray: hasSimTray,
            received_sim_card: hasSimCard,
            received_battery: hasBattery
        };
        setInvoice(finalInvoice);
        onInvoiceCreated(finalInvoice);

        // --- CRM Auto-Save / Update Logic ---
        
        // 1. Check if user selected an existing customer ID
        // 2. OR if the entered mobile number matches an existing customer (to prevent duplicates)
        let customerIdToUpdate = selectedCustomerId;
        
        if (!customerIdToUpdate && mobile) {
            const existingCustomer = customers.find(c => c.phone === mobile);
            if (existingCustomer) {
                customerIdToUpdate = existingCustomer.id;
            }
        }

        if (customerIdToUpdate) {
            // Update Existing Customer
            setCustomers(prevCustomers => prevCustomers.map(c => {
                if (c.id === customerIdToUpdate) {
                    return {
                        ...c,
                        name: customerName, // Update name in case it changed
                        totalSpent: c.totalSpent + finalInvoice.total,
                        activeRepairs: c.activeRepairs + 1,
                        history: [
                            {
                                date: currentDate,
                                type: 'Repair',
                                description: `Invoice #${generatedInvoiceId} - ${finalInvoice.device_model || 'Repair'}`,
                                amount: finalInvoice.total
                            },
                            ...c.history
                        ]
                    };
                }
                return c;
            }));
        } else {
            // Create New Customer
            const newCustomer: Customer = {
                id: `C-${Date.now()}`,
                name: customerName,
                email: '', // Not captured in invoice
                phone: mobile,
                address: 'Walk-in', // Default value
                joinDate: currentDate,
                totalSpent: finalInvoice.total,
                activeRepairs: 1,
                tags: ['New'],
                notes: `Auto-created from Invoice #${generatedInvoiceId}`,
                history: [{
                    date: currentDate,
                    type: 'Repair',
                    description: `Invoice #${generatedInvoiceId} - ${finalInvoice.device_model || 'Repair'}`,
                    amount: finalInvoice.total
                }]
            };
            setCustomers(prev => [...prev, newCustomer]);
        }
    } else {
        setInvoice(null);
    }

    setLoading(false);
  };

  const handlePrint = (type: 'A4' | 'Thermal') => {
      if (type === 'Thermal') {
          setShowThermalReceipt(true);
      } else {
          // Default browser print is A4 styled via CSS usually, or just what we see.
          // For simplicity in this demo, printing the current view (which mimics A4).
          window.print();
      }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white drop-shadow-md">Smart Invoicing</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Section - Left Side */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-white/20 space-y-4">
            <h3 className="font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">Customer & Device Details</h3>
            
            {/* Staff Details */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Pickup / Sales Person</label>
                     <div className="relative">
                         <UserCheck className="absolute left-3 top-2.5 text-slate-400" size={16} />
                         <select
                             value={selectedSalesPerson}
                             onChange={(e) => setSelectedSalesPerson(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                         >
                             <option value="">Select Sales</option>
                             {salesPersons.map(p => (
                                 <option key={p.id} value={p.name}>{p.name}</option>
                             ))}
                         </select>
                         <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
                     </div>
                </div>
                <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Assigned Technician</label>
                     <div className="relative">
                         <MonitorSmartphone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                         <select
                             value={selectedTechnician}
                             onChange={(e) => setSelectedTechnician(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                         >
                             <option value="">Select Tech</option>
                             {technicians.map(t => (
                                 <option key={t.id} value={t.name}>{t.name}</option>
                             ))}
                         </select>
                         <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
                     </div>
                </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 relative pt-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Customer Name</label>
                    {selectedCustomerId && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full flex items-center font-bold">
                            <CheckCircle size={10} className="mr-1"/> CRM Linked
                        </span>
                    )}
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedCustomerId(null); // Reset selection on manual edit
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Search or enter name..."
                  />
                  {showSuggestions && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {filteredCustomers.map(c => (
                              <div 
                                key={c.id}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                onClick={() => handleCustomerSelect(c)}
                              >
                                  <div>
                                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                                      <p className="text-xs text-slate-500">{c.phone}</p>
                                  </div>
                                  {c.tags.includes('VIP') && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">VIP</span>}
                              </div>
                          ))}
                      </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>
            </div>

            {/* Device Details - Row 1 */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Product Category</label>
                <div className="flex gap-1">
                    {isAddingCategory ? (
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none animate-fade-in"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="Type Category..."
                            autoFocus
                        />
                    ) : (
                        <div className="relative flex-1">
                            <Box className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <select 
                                value={category}
                                onChange={(e) => {
                                    if(e.target.value === '__NEW__') {
                                        setIsAddingCategory(true);
                                        setCategory('');
                                    } else {
                                        setCategory(e.target.value);
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">+ Add New</option>
                            </select>
                        </div>
                    )}
                    <button 
                       onClick={() => setIsAddingCategory(!isAddingCategory)}
                       className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors bg-white"
                       title={isAddingCategory ? "Select Existing" : "Add New Category"}
                   >
                       {isAddingCategory ? <List size={18} /> : <Plus size={18} />}
                   </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Brand</label>
                <div className="flex gap-1">
                   {isAddingBrand ? (
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none animate-fade-in"
                            value={brand}
                            onChange={e => { 
                                setBrand(e.target.value); 
                                setModel('');
                                setIsAddingModel(true); // Force model to input mode since brand is new
                            }}
                            placeholder="Type Brand..."
                            autoFocus
                        />
                   ) : (
                        <div className="relative flex-1">
                            <Tag className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <select 
                                value={brand}
                                onChange={(e) => { 
                                    if(e.target.value === '__NEW__') {
                                        setIsAddingBrand(true);
                                        setBrand('');
                                        setIsAddingModel(true); // Default to adding model if brand is new
                                    } else {
                                        setBrand(e.target.value); 
                                        setModel(''); 
                                        setIsAddingModel(false); // Reset to list mode
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                            >
                                <option value="">Select Brand</option>
                                {brands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">+ Add New</option>
                            </select>
                        </div>
                   )}
                   <button 
                       onClick={() => {
                           setIsAddingBrand(!isAddingBrand);
                           setIsAddingModel(!isAddingBrand); // Sync model state mostly
                       }}
                       className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors bg-white"
                       title={isAddingBrand ? "Select Existing Brand" : "Add New Brand"}
                   >
                       {isAddingBrand ? <List size={18} /> : <Plus size={18} />}
                   </button>
                </div>
              </div>
            </div>

            {/* Device Details - Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Device Model</label>
                <div className="flex gap-1">
                    {isAddingModel ? (
                        <input 
                            type="text" 
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            disabled={!brand}
                            className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none animate-fade-in disabled:bg-slate-50"
                            placeholder={brand ? `Type ${brand} model...` : "Select brand first"}
                        />
                    ) : (
                        <div className="relative flex-1">
                            <Smartphone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <select
                                value={model}
                                onChange={(e) => {
                                    if(e.target.value === '__NEW__') {
                                        setIsAddingModel(true);
                                        setModel('');
                                    } else {
                                        setModel(e.target.value);
                                    }
                                }}
                                disabled={!brand}
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white disabled:bg-slate-50"
                            >
                                <option value="">Select Model</option>
                                {availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                                {brand && <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">+ Add New</option>}
                            </select>
                        </div>
                    )}
                    <button 
                       onClick={() => setIsAddingModel(!isAddingModel)}
                       disabled={!brand}
                       className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors bg-white disabled:opacity-50"
                       title={isAddingModel ? "Select Existing Model" : "Add New Model"}
                   >
                       {isAddingModel ? <List size={18} /> : <Plus size={18} />}
                   </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Color</label>
                <div className="relative">
                  <Palette className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <select 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                  >
                    <option value="">Select Color</option>
                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Security - Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Passcode</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. 1234"
                    />
                  </div>
              </div>
              <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Unlock Pattern</label>
                  <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Grid3X3 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          value={pattern}
                          onChange={(e) => setPattern(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g. 1-2-3-6"
                        />
                      </div>
                      <button 
                         onClick={() => setShowPatternGrid(!showPatternGrid)}
                         className={`p-2 rounded-xl border transition-colors ${showPatternGrid ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                         title="Draw Pattern"
                      >
                         <Grid3X3 size={18} />
                      </button>
                  </div>
                  
                  {/* Interactive Pattern Grid Helper */}
                  {showPatternGrid && (
                      <PatternLock 
                        onComplete={(seq) => { setPattern(seq); setShowPatternGrid(false); }}
                        onClose={() => setShowPatternGrid(false)}
                      />
                  )}
              </div>
            </div>
            
            {/* Device Checklist */}
            <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase flex items-center">
                    <CheckSquare size={14} className="mr-1" /> Accessories / Received Checklist
                </label>
                <div className="flex space-x-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={hasSimTray} 
                            onChange={(e) => setHasSimTray(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span>Sim Tray</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={hasSimCard} 
                            onChange={(e) => setHasSimCard(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span>Sim Card</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={hasBattery} 
                            onChange={(e) => setHasBattery(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span>Battery</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Estimate Cost (₹)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        type="number" 
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Est. Completion</label>
                   <div className="relative">
                      <CalendarClock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        type="datetime-local" 
                        value={estimatedCompletion}
                        onChange={(e) => setEstimatedCompletion(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600"
                      />
                   </div>
                </div>
            </div>

            {/* Service Details */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-xs font-semibold text-slate-500 uppercase">Repair Services & Details</label>
                 <div className="relative">
                    <Wrench className="absolute left-2 top-1.5 text-slate-400" size={12} />
                    <select 
                        className="text-xs border border-slate-300 rounded pl-6 pr-2 py-1 text-slate-600 outline-none focus:border-blue-500 bg-white cursor-pointer hover:bg-slate-50"
                        onChange={handleServiceTemplate}
                        defaultValue=""
                    >
                        <option value="" disabled>Load Template...</option>
                        {SERVICE_TEMPLATES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
              </div>
              <textarea
                value={repairDetails}
                onChange={(e) => setRepairDetails(e.target.value)}
                className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                placeholder="Describe parts used, labor hours, and costs. Or select a template above."
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading || !customerName || !repairDetails}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed btn-gradient-hover"
              >
                {loading ? (
                   <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Creating Invoice...</div>
                ) : (
                   <><Sparkles size={18} className="mr-2" /> Generate Invoice</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section - Right Side */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-2xl border border-slate-200 min-h-[600px] flex flex-col relative overflow-hidden card-3d">
          {invoice ? (
            <div className="flex-1 p-8 animate-fade-in relative z-10 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">INVOICE</h1>
                  <p className="text-slate-500 text-sm mt-1 font-mono">#{invoice.invoice_id}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-slate-700 text-lg">{settings.storeName}</h3>
                  <p className="text-sm text-slate-500">{settings.storeLocation}</p>
                  <p className="text-sm text-slate-500">{settings.storePhone}</p>
                  <p className="text-sm text-slate-500">Owner: {settings.ownerPhone}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
                  <p className="font-semibold text-slate-800 text-lg">{invoice.customer_name}</p>
                  {invoice.customer_mobile && (
                     <p className="text-sm text-slate-600 flex items-center mt-1">
                        <Smartphone size={14} className="mr-1" /> {invoice.customer_mobile}
                     </p>
                  )}
                  {/* Staff Info */}
                  <div className="mt-4 pt-4 border-t border-slate-50 space-y-1">
                      {invoice.sales_person && (
                        <p className="text-xs text-slate-500 flex items-center">
                            <UserCheck size={12} className="mr-1 text-purple-500" /> Served by: <span className="font-medium text-slate-700 ml-1">{invoice.sales_person}</span>
                        </p>
                      )}
                      {invoice.technician_name && (
                        <p className="text-xs text-slate-500 flex items-center">
                            <MonitorSmartphone size={12} className="mr-1 text-blue-500" /> Tech: <span className="font-medium text-slate-700 ml-1">{invoice.technician_name}</span>
                        </p>
                      )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="text-sm text-slate-500">Date:</span>
                    <span className="text-sm font-medium text-slate-800">{invoice.date}</span>
                  </div>
                  {(invoice.device_type || invoice.device_brand || invoice.device_model || invoice.device_color || invoice.device_passcode || invoice.device_pattern) && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Device Info</p>
                        <div className="text-sm text-slate-700 grid grid-cols-2 gap-x-2 gap-y-1">
                            {invoice.device_type && <span className="col-span-2 text-xs text-slate-500 uppercase font-bold tracking-wide">{invoice.device_type}</span>}
                            {invoice.device_brand && <span><span className="font-medium">Brand:</span> {invoice.device_brand}</span>}
                            {invoice.device_model && <span><span className="font-medium">Model:</span> {invoice.device_model}</span>}
                            {invoice.device_color && <span><span className="font-medium">Color:</span> {invoice.device_color}</span>}
                            {invoice.device_passcode && <span className="col-span-2 text-xs text-slate-500 mt-1 flex items-center"><Lock size={10} className="mr-1"/> Pass: {invoice.device_passcode}</span>}
                            {invoice.device_pattern && <span className="col-span-2 text-xs text-slate-500 flex items-center"><Grid3X3 size={10} className="mr-1"/> Pattern: {invoice.device_pattern}</span>}
                        </div>
                    </div>
                  )}
                  {/* Checklist Display in Preview */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Checklist</p>
                      <div className="flex space-x-3 text-xs">
                          <span className={`flex items-center ${invoice.received_sim_tray ? 'text-green-600 font-bold' : 'text-slate-400 line-through'}`}>
                             {invoice.received_sim_tray ? <CheckSquare size={10} className="mr-1"/> : <Square size={10} className="mr-1"/>} Sim Tray
                          </span>
                          <span className={`flex items-center ${invoice.received_sim_card ? 'text-green-600 font-bold' : 'text-slate-400 line-through'}`}>
                             {invoice.received_sim_card ? <CheckSquare size={10} className="mr-1"/> : <Square size={10} className="mr-1"/>} Sim Card
                          </span>
                          <span className={`flex items-center ${invoice.received_battery ? 'text-green-600 font-bold' : 'text-slate-400 line-through'}`}>
                             {invoice.received_battery ? <CheckSquare size={10} className="mr-1"/> : <Square size={10} className="mr-1"/>} Battery
                          </span>
                      </div>
                  </div>

                  {(invoice.estimated_cost || invoice.estimated_completion) && (
                     <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Estimate Info</p>
                        {invoice.estimated_cost && <div className="text-sm text-slate-700 flex justify-between"><span>Est. Cost:</span> <span className="font-medium">{settings.currencySymbol}{invoice.estimated_cost}</span></div>}
                        {invoice.estimated_completion && <div className="text-sm text-slate-700 flex justify-between mt-1"><span>Completion:</span> <span className="font-medium">{invoice.estimated_completion.replace('T', ' ')}</span></div>}
                     </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="flex-1">
                <table className="w-full mb-8">
                    <thead className="bg-slate-50 border-y border-slate-100">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item / Description</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {invoice.line_items.map((item, idx) => (
                        <tr key={idx}>
                        <td className="px-4 py-4 text-sm text-slate-700 font-medium">{item.description}</td>
                        <td className="px-4 py-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-4 text-sm text-slate-600 text-right">{settings.currencySymbol}{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right">{settings.currencySymbol}{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>Subtotal</span>
                    <span>{settings.currencySymbol}{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mb-4">
                    <span>Tax ({settings.taxRate}%)</span>
                    <span>{settings.currencySymbol}{invoice.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-slate-800 pt-4 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-blue-600">{settings.currencySymbol}{invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* A4 Footer Terms */}
              <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                  <p className="font-bold">TERMS & CONDITIONS</p>
                  <p>No returns on electronic parts. NO WARRANTY.</p>
              </div>

              {/* Actions */}
              <div className="mt-8 flex justify-center space-x-4 no-print">
                  <button onClick={() => handlePrint('A4')} className="flex items-center px-5 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors border border-slate-200 font-medium">
                      <Printer size={18} className="mr-2" /> Print Invoice
                  </button>
                  <button onClick={() => handlePrint('Thermal')} className="flex items-center px-5 py-2.5 text-purple-600 hover:bg-purple-50 hover:text-purple-800 rounded-lg transition-colors border border-purple-200 font-medium">
                      <Receipt size={18} className="mr-2" /> Thermal Receipt
                  </button>
                  <button className="flex items-center px-5 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors font-medium shadow-lg shadow-slate-200">
                      <Download size={18} className="mr-2" /> Download PDF
                  </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
              <div className="bg-slate-50 p-8 rounded-full mb-6">
                <FileText size={64} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-semibold text-slate-400 mb-2">No Invoice Generated</h3>
              <p className="text-sm max-w-xs text-center">Fill out the customer and device details on the left, then click 'Generate Invoice' to create a professional document.</p>
            </div>
          )}
        </div>
      </div>

      {/* Thermal Receipt Modal / Hidden Print View */}
      {showThermalReceipt && invoice && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm print:bg-white print:static print:block">
               <div className="bg-white p-6 w-[350px] shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto print:shadow-none print:w-full print:max-w-none print:p-0 print:overflow-visible">
                   {/* Modal Header for Web */}
                   <div className="flex justify-between items-center mb-4 print:hidden">
                       <h3 className="font-bold">Thermal Receipt Preview</h3>
                       <button onClick={() => setShowThermalReceipt(false)}><X size={20}/></button>
                   </div>
                   
                   {/* Thermal Content Wrapper */}
                   <div className="thermal-content text-xs font-mono text-black">
                       <div className="text-center mb-4">
                           <h2 className="text-base font-bold uppercase">{settings.storeName}</h2>
                           <p>{settings.storeLocation}</p>
                           <p>Tel: {settings.storePhone}</p>
                       </div>
                       
                       <div className="border-b border-black border-dashed mb-2 pb-2">
                           <div className="flex justify-between"><span>Date:</span> <span>{invoice.date}</span></div>
                           <div className="flex justify-between"><span>Inv #:</span> <span>{invoice.invoice_id}</span></div>
                           <div className="flex justify-between"><span>Cust:</span> <span>{invoice.customer_name}</span></div>
                           {invoice.sales_person && <div className="flex justify-between"><span>Staff:</span> <span>{invoice.sales_person}</span></div>}
                       </div>

                       <div className="mb-2">
                           {invoice.line_items.map((item, i) => (
                               <div key={i} className="mb-1">
                                   <div className="font-bold">{item.description}</div>
                                   <div className="flex justify-between">
                                       <span>{item.quantity} x {item.unit_price}</span>
                                       <span>{item.amount.toFixed(2)}</span>
                                   </div>
                               </div>
                           ))}
                       </div>

                       <div className="border-t border-black border-dashed pt-2 mb-4">
                           <div className="flex justify-between"><span>Subtotal:</span> <span>{invoice.subtotal.toFixed(2)}</span></div>
                           <div className="flex justify-between"><span>Tax:</span> <span>{invoice.tax.toFixed(2)}</span></div>
                           <div className="flex justify-between text-sm font-bold mt-1"><span>TOTAL:</span> <span>{settings.currencySymbol}{invoice.total.toFixed(2)}</span></div>
                       </div>

                       <div className="text-center mb-4">
                           <p className="mb-2">*** Thank You ***</p>
                           <p className="text-[10px]">No returns on electronic parts.<br/>NO WARRANTY.</p>
                       </div>
                   </div>

                   {/* Print Button for Web */}
                   <button 
                     onClick={() => window.print()} 
                     className="w-full bg-black text-white py-2 rounded font-bold mt-4 print:hidden hover:bg-gray-800"
                   >
                       Print Now
                   </button>
               </div>
               
               {/* CSS for 58mm printing */}
               <style>{`
                  @media print {
                      @page { size: 58mm auto; margin: 0; }
                      body { margin: 0; padding: 5px; }
                      body > *:not(.fixed) { display: none; }
                      .fixed { position: static; display: block; background: white; height: auto; }
                      .thermal-content { width: 100%; max-width: 56mm; margin: 0 auto; }
                      /* Hide standard web modal buttons */
                      button { display: none !important; }
                  }
               `}</style>
          </div>
      )}
    </div>
  );
};

export default InvoiceView;
