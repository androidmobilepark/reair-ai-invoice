
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { MobileHeader, MobileBottomNav } from './components/MobileNav';
import Dashboard from './components/Dashboard';
import InventoryView from './components/InventoryView';
import RepairView from './components/RepairView';
import InvoiceView from './components/InvoiceView';
import ChatView from './components/ChatView';
import CRMView from './components/CRMView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import NotificationToast from './components/NotificationToast';
import LoginScreen from './components/LoginScreen';
import { ViewState, RepairOrder, GeneratedInvoice, Customer, InventoryItem, AppSettings, Technician, BrandData, SalesPerson, Supplier, PurchaseOrder, UserProfile } from './types';
import { MOCK_REPAIRS, MOCK_CUSTOMERS, MOCK_INVENTORY, MOCK_TECHNICIANS, DEFAULT_SETTINGS, DEFAULT_BRANDS, DEFAULT_CATEGORIES, MOCK_SALES_PERSONS, MOCK_SUPPLIERS, MOCK_USERS } from './constants';
import { saveToLocalStorage, loadFromLocalStorage, exportDataToFile, importDataFromFile, uploadToGoogleDrive, shareBackupFile, clearLocalStorage } from './services/storageService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Mobile UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fabAction, setFabAction] = useState<(() => void) | undefined>(undefined);
  
  // Data State
  const [repairs, setRepairs] = useState<RepairOrder[]>(MOCK_REPAIRS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS); 
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]); 
  
  // Settings & Config State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [technicians, setTechnicians] = useState<Technician[]>(MOCK_TECHNICIANS);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>(MOCK_SALES_PERSONS);
  const [brandData, setBrandData] = useState<BrandData[]>(DEFAULT_BRANDS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);

  // Notification State
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
      typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // --- PERSISTENCE: LOAD ON MOUNT ---
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      setRepairs(savedData.repairs);
      setCustomers(savedData.customers);
      setInventory(savedData.inventory);
      setSuppliers(savedData.suppliers);
      setPurchaseOrders(savedData.purchaseOrders);
      setSettings(savedData.settings);
      setTechnicians(savedData.technicians);
      setSalesPersons(savedData.salesPersons);
      setBrandData(savedData.brandData);
      setCategories(savedData.categories);
      // Load users if available in backup (version check would be better in real app)
      if((savedData as any).users) setUsers((savedData as any).users);
      console.log("App data loaded from local storage.");
    }
  }, []);

  // --- PERSISTENCE: SAVE ON CHANGE ---
  useEffect(() => {
    const dataToSave = {
        repairs,
        customers,
        inventory,
        suppliers,
        purchaseOrders,
        settings,
        technicians,
        salesPersons,
        brandData,
        categories,
        users // Persist users
    };
    saveToLocalStorage(dataToSave);
  }, [repairs, customers, inventory, suppliers, purchaseOrders, settings, technicians, salesPersons, brandData, categories, users]);

  // --- BACKUP EVENT LISTENERS ---
  useEffect(() => {
      const handleLocalExport = () => {
          const data = { repairs, customers, inventory, suppliers, purchaseOrders, settings, technicians, salesPersons, brandData, categories, users };
          exportDataToFile(data);
      };

      const handleGoogleBackup = async () => {
          const data = { repairs, customers, inventory, suppliers, purchaseOrders, settings, technicians, salesPersons, brandData, categories, users };
          await uploadToGoogleDrive(data);
      };

      const handleDriveShare = async () => {
          const data = { repairs, customers, inventory, suppliers, purchaseOrders, settings, technicians, salesPersons, brandData, categories, users };
          await shareBackupFile(data);
      };

      const handleFileImport = async (e: Event) => {
          const customEvent = e as CustomEvent;
          const file = customEvent.detail as File;
          try {
              const data = await importDataFromFile(file);
              setRepairs(data.repairs);
              setCustomers(data.customers);
              setInventory(data.inventory);
              setSuppliers(data.suppliers);
              setPurchaseOrders(data.purchaseOrders);
              setSettings(data.settings);
              setTechnicians(data.technicians);
              setSalesPersons(data.salesPersons);
              setBrandData(data.brandData);
              setCategories(data.categories);
              if((data as any).users) setUsers((data as any).users);
              alert("Data restored successfully!");
          } catch (err) {
              alert("Failed to restore backup.");
              console.error(err);
          }
      };

      const handleAppReset = () => {
          if(confirm("CRITICAL WARNING: This will wipe all app data from this device. Are you sure?")) {
              clearLocalStorage();
              window.location.reload(); // Reload to reset state to defaults
          }
      };

      window.addEventListener('trigger-local-export', handleLocalExport);
      window.addEventListener('trigger-google-backup', handleGoogleBackup);
      window.addEventListener('trigger-drive-share', handleDriveShare);
      window.addEventListener('trigger-file-import', handleFileImport);
      window.addEventListener('trigger-app-reset', handleAppReset);

      return () => {
          window.removeEventListener('trigger-local-export', handleLocalExport);
          window.removeEventListener('trigger-google-backup', handleGoogleBackup);
          window.removeEventListener('trigger-drive-share', handleDriveShare);
          window.removeEventListener('trigger-file-import', handleFileImport);
          window.removeEventListener('trigger-app-reset', handleAppReset);
      };
  }, [repairs, customers, inventory, suppliers, purchaseOrders, settings, technicians, salesPersons, brandData, categories, users]);

  // --- NOTIFICATION PERMISSION ---
  const requestNotificationPermission = async () => {
      if (typeof Notification !== 'undefined') {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
      }
  };

  // Reset FAB action on view change
  useEffect(() => {
    setFabAction(undefined);
  }, [currentView]);

  // --- Notification Logic ---
  useEffect(() => {
    if (!currentUser) return;

    const checkOverdueRepairs = () => {
        const now = new Date();
        const alerts: string[] = [];

        repairs.forEach(repair => {
            const isCompleted = ['Completed', 'Picked Up', 'Delivered', 'Cancelled', 'Returned (Not Fixed)'].includes(repair.status);
            
            if (!isCompleted && repair.estimatedCompletion) {
                const estTime = new Date(repair.estimatedCompletion);
                const snoozedUntil = repair.snoozedUntil ? new Date(repair.snoozedUntil) : null;
                const isSnoozed = snoozedUntil && now < snoozedUntil;

                if (now > estTime && !isSnoozed) {
                    alerts.push(repair.id);
                }
            }
        });
        
        setActiveAlerts(prev => {
             const newAlerts = alerts.filter(id => !prev.includes(id));
             if (newAlerts.length > 0) {
                 // Try to trigger system notification
                 if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                     newAlerts.forEach(id => {
                         const r = repairs.find(rep => rep.id === id);
                         if (r) {
                             new Notification(`⚠️ Overdue: ${r.customerName}`, {
                                 body: `Repair #${r.id} (${r.deviceModel}) is past estimated completion time.`,
                                 requireInteraction: true, 
                                 tag: r.id
                             });
                         }
                     });
                 }
             }
             return alerts;
        });
    };

    checkOverdueRepairs();
    const intervalId = setInterval(checkOverdueRepairs, 30000); 

    return () => clearInterval(intervalId);
  }, [repairs, currentUser]);

  const handleSnoozeAlert = (repairId: string, minutes: number) => {
      const snoozeTime = new Date(new Date().getTime() + minutes * 60000).toISOString();
      setRepairs(prev => prev.map(r => 
          r.id === repairId ? { ...r, snoozedUntil: snoozeTime } : r
      ));
      setActiveAlerts(prev => prev.filter(id => id !== repairId));
  };

  const handleDismissAlert = (repairId: string) => {
      // Implicitly snooze for 10 minutes so it doesn't reappear instantly
      const snoozeTime = new Date(new Date().getTime() + 10 * 60000).toISOString();
      setRepairs(prev => prev.map(r => 
          r.id === repairId ? { ...r, snoozedUntil: snoozeTime } : r
      ));
      setActiveAlerts(prev => prev.filter(id => id !== repairId));
  };

  const handleAddModelToBrand = (brandName: string, modelName: string) => {
    setBrandData(prevData => {
        const brandExists = prevData.some(b => b.name.toLowerCase() === brandName.toLowerCase());

        if (brandExists) {
            return prevData.map(b => {
                if (b.name.toLowerCase() === brandName.toLowerCase()) {
                    if (!b.models.some(m => m.toLowerCase() === modelName.toLowerCase())) {
                        return { ...b, models: [...b.models, modelName].sort() };
                    }
                }
                return b;
            });
        } else {
            return [...prevData, { name: brandName, models: [modelName] }].sort((a,b) => a.name.localeCompare(b.name));
        }
    });
  };

  const handleAddCategory = (category: string) => {
    setCategories(prev => {
        if (!prev.includes(category)) {
            return [...prev, category].sort();
        }
        return prev;
    });
  };

  const handleInvoiceCreated = (invoice: GeneratedInvoice) => {
    const repairId = `RO-${Math.floor(Math.random() * 900000) + 100000}`;
    const newRepair: RepairOrder = {
      id: repairId,
      invoiceId: invoice.invoice_id, 
      dateCreated: new Date().toISOString().split('T')[0],
      storeLocation: settings.storeLocation,
      customerName: invoice.customer_name,
      customerMobile: invoice.customer_mobile,
      deviceModel: `${invoice.device_brand || ''} ${invoice.device_model || ''}`.trim() || invoice.device_type || 'Unknown Device',
      issue: invoice.line_items.length > 0 ? invoice.line_items[0].description : 'General Repair',
      status: 'Pending', 
      estimatedCompletion: invoice.estimated_completion || new Date(Date.now() + 86400000).toISOString(),
      partsUsed: invoice.line_items.map(item => ({ 
        name: item.description, 
        cost: item.amount 
      })),
      laborCost: 0,
      notes: invoice.line_items.map(i => i.description).join(', '),
      internalNotes: `Sales Person: ${invoice.sales_person || 'N/A'}. Linked to Invoice: ${invoice.invoice_id}`,
      technicianName: invoice.technician_name || 'Unassigned'
    };

    setRepairs(prev => [newRepair, ...prev]);
  };

  const handleConsumePart = (repairId: string, item: InventoryItem) => {
    if (item.currentStock <= 0) {
      alert("Error: Item is out of stock!");
      return;
    }

    setInventory(prev => prev.map(inv => {
      if (inv.id === item.id) {
        return { ...inv, currentStock: inv.currentStock - 1 };
      }
      return inv;
    }));

    setRepairs(prev => prev.map(r => {
      if (r.id === repairId) {
        return {
          ...r,
          partsUsed: [...r.partsUsed, { 
            name: item.name, 
            cost: item.price, 
            inventoryId: item.id 
          }]
        };
      }
      return r;
    }));
  };

  const handleCreateSpecialPO = (repairId: string, itemName: string, cost: number, supplier: string) => {
      const newPO: PurchaseOrder = {
          id: `PO-SP-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          supplierName: supplier,
          status: 'Ordered',
          totalAmount: cost,
          items: [{
              name: itemName,
              quantity: 1,
              unitCost: cost,
              totalCost: cost,
              brand: 'Special Order',
              model: `Repair #${repairId}`,
              category: 'Repair Part'
          }]
      };

      setPurchaseOrders(prev => [newPO, ...prev]);

      // Automatically update repair status to 'Waiting for Parts'
      setRepairs(prev => prev.map(r => r.id === repairId ? {
          ...r,
          status: 'Waiting for Parts',
          notes: (r.notes || '') + `\n[System]: Special PO #${newPO.id} created for part: ${itemName}.`
      } : r));
  };

  // --- Render View Logic based on Role and Selection ---
  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: 
        return <Dashboard userRole={currentUser?.role} onNavigate={setCurrentView} />;
      case ViewState.INVENTORY: 
        return (
          <InventoryView 
            inventory={inventory} 
            setInventory={setInventory} 
            brands={brandData} 
            categories={categories} 
            suppliers={suppliers} 
            onAddModel={handleAddModelToBrand}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            currentUser={currentUser!}
            onSetFabAction={setFabAction}
          />
        );
      case ViewState.REPAIRS: 
        return (
          <RepairView 
            repairs={repairs} 
            setRepairs={setRepairs} 
            technicians={technicians} 
            inventory={inventory}
            onConsumePart={handleConsumePart}
            brands={brandData}
            suppliers={suppliers}
            onCreateSpecialPO={handleCreateSpecialPO}
            onSetFabAction={setFabAction}
            settings={settings}
          />
        );
      case ViewState.INVOICE:
        return (
          <InvoiceView 
            onInvoiceCreated={handleInvoiceCreated}
            customers={customers}
            setCustomers={setCustomers}
            settings={settings}
            brands={brandData}
            categories={categories}
            onAddModel={handleAddModelToBrand}
            onAddCategory={handleAddCategory}
            salesPersons={salesPersons}
            technicians={technicians}
          />
        );
      case ViewState.CHAT:
        return <ChatView />;
      case ViewState.CRM:
        return (
          <CRMView 
            customers={customers} 
            setCustomers={setCustomers} 
            suppliers={suppliers} 
            setSuppliers={setSuppliers}
            inventory={inventory}
            currentUser={currentUser!}
          />
        );
      case ViewState.SETTINGS:
        return (
          <SettingsView 
            settings={settings} 
            setSettings={setSettings}
            technicians={technicians}
            setTechnicians={setTechnicians}
            salesPersons={salesPersons}
            setSalesPersons={setSalesPersons}
            brands={brandData}
            setBrands={setBrandData}
            categories={categories}
            setCategories={setCategories}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            currentUser={currentUser!}
            users={users}
            setUsers={setUsers}
          />
        );
      case ViewState.REPORTS:
        return (
          <ReportsView 
            repairs={repairs} 
            inventory={inventory} 
            purchaseOrders={purchaseOrders}
            customers={customers}
            settings={settings}
          />
        );
      default: 
        return <Dashboard userRole={currentUser?.role} onNavigate={setCurrentView} />;
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} users={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
        <Sidebar 
            currentView={currentView} 
            onNavigate={setCurrentView} 
            currentUser={currentUser}
            onLogout={() => setCurrentUser(null)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64">
             {/* Mobile Header */}
             <div className="relative bg-gradient-jshine">
                 <MobileHeader title={currentView} onOpenSidebar={() => setIsSidebarOpen(true)} />
                 {/* Permission Request Button (Only if needed) */}
                 {notificationPermission === 'default' && (
                     <button 
                        onClick={requestNotificationPermission}
                        className="absolute top-3 right-16 bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded backdrop-blur-md border border-white/30 transition-colors z-30 hidden md:block"
                     >
                        Enable Alerts
                     </button>
                 )}
             </div>

             {/* Main Content Area */}
             <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-cool-blues p-4 md:p-6 pb-24 md:pb-6 relative">
                 {activeAlerts.length > 0 && (
                     <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
                         <div className="pointer-events-auto">
                            {activeAlerts.map(id => {
                                const r = repairs.find(repair => repair.id === id);
                                if (!r) return null;
                                const overdue = r.estimatedCompletion ? new Date(r.estimatedCompletion).toLocaleString() : 'Unknown';
                                return (
                                    <NotificationToast 
                                        key={id}
                                        repairId={id}
                                        customerName={r.customerName}
                                        deviceModel={r.deviceModel}
                                        timeOverdue={overdue}
                                        onSnooze={handleSnoozeAlert}
                                        onDismiss={handleDismissAlert}
                                    />
                                );
                            })}
                         </div>
                     </div>
                 )}
                 
                 {renderView()}
             </main>

             <MobileBottomNav 
                currentView={currentView} 
                onNavigate={setCurrentView} 
                onOpenSidebar={() => setIsSidebarOpen(true)}
                onFabClick={fabAction}
                showFab={!!fabAction}
             />
        </div>
    </div>
  );
};

export default App;
