
import React, { useState, useEffect } from 'react';
import { AppSettings, Technician, BrandData, SalesPerson, Supplier, UserProfile, UserRole } from '../types';
import { exportDataToFile, importDataFromFile, uploadToGoogleDrive, loadGoogleDriveApi, openExternalStorage, getStorageUsage } from '../services/storageService';
import { Save, UserPlus, Trash2, Edit2, Plus, X, Tag, Settings, CreditCard, Users, Database, Smartphone, UserCheck, Truck, MapPin, Phone, Mail, Link, Copy, ShieldAlert, MessageCircle, Globe, QrCode, RefreshCcw, Wifi, WifiOff, CheckCircle2, BellRing, Key, Cloud, UploadCloud, DownloadCloud, HardDrive, FileUp, ExternalLink, Share2, FolderOpen, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  technicians: Technician[];
  setTechnicians: React.Dispatch<React.SetStateAction<Technician[]>>;
  salesPersons: SalesPerson[];
  setSalesPersons: React.Dispatch<React.SetStateAction<SalesPerson[]>>;
  brands: BrandData[];
  setBrands: React.Dispatch<React.SetStateAction<BrandData[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  currentUser: UserProfile;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    settings, setSettings, 
    technicians, setTechnicians,
    salesPersons, setSalesPersons,
    brands, setBrands,
    categories, setCategories,
    suppliers, setSuppliers,
    currentUser,
    users, setUsers
}) => {
  // Determine default active tab based on role
  const getInitialTab = () => {
      if (currentUser.role === 'Admin') return 'general';
      if (currentUser.role === 'Sales') return 'suppliers';
      return 'data';
  };

  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'team' | 'suppliers' | 'data' | 'backup'>(getInitialTab());

  // User Management Form State (Admin Only)
  const [userForm, setUserForm] = useState<Partial<UserProfile>>({ name: '', role: 'Technician', password: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Technician Form State (Details)
  const [techForm, setTechForm] = useState<Partial<Technician>>({ name: '', specialization: '' });
  const [editingTechId, setEditingTechId] = useState<string | null>(null);

  // Sales Person Form State (Details)
  const [salesForm, setSalesForm] = useState<Partial<SalesPerson>>({ name: '' });
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // Data Form State
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  // Model Management State
  const [selectedBrandForModels, setSelectedBrandForModels] = useState<string | null>(null);
  const [newModel, setNewModel] = useState('');

  // Invitation Logic
  const [inviteRole, setInviteRole] = useState<UserRole>('Technician');
  const [invitationLink, setInvitationLink] = useState('');

  // WhatsApp Connection Logic
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'scanning' | 'authenticating' | 'connected'>('idle');

  // Backup State
  const [backupLoading, setBackupLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [storageSize, setStorageSize] = useState<string>('0 KB');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Refresh storage usage on tab mount
  useEffect(() => {
      if (activeTab === 'backup') {
          setStorageSize(getStorageUsage());
      }
  }, [activeTab]);

  const generateInviteLink = () => {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const link = `https://nexusrepair.app/join?role=${inviteRole.toLowerCase()}&token=${token}`;
      setInvitationLink(link);
  };

  const copyInviteLink = () => {
      navigator.clipboard.writeText(invitationLink);
      alert('Invitation link copied to clipboard!');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      // In a real app, this would persist to backend
      alert("Settings saved successfully!");
  };

  const initiateWhatsAppConnection = () => {
      setShowQRModal(true);
      setConnectionStatus('scanning');
      // Simulation of connection lifecycle
      setTimeout(() => {
          setConnectionStatus('authenticating');
          setTimeout(() => {
              setConnectionStatus('connected');
              setSettings(prev => ({ ...prev, whatsappConnected: true }));
              setTimeout(() => {
                  setShowQRModal(false);
                  setConnectionStatus('idle'); // Reset local status as main setting is updated
              }, 1500);
          }, 2000);
      }, 4000);
  };

  const handleDisconnectWhatsApp = () => {
      if(confirm('Are you sure you want to disconnect? You will stop receiving automatic updates.')) {
          setSettings(prev => ({ ...prev, whatsappConnected: false }));
      }
  };

  // --- User Management Handlers (Login Access) ---
  const handleAddUser = () => {
      if (!userForm.name || !userForm.password) { alert("Name and Password are required."); return; }
      
      const initials = userForm.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      if (editingUserId) {
          setUsers(prev => prev.map(u => u.id === editingUserId ? { 
              ...u, 
              name: userForm.name!, 
              role: userForm.role as UserRole, 
              password: userForm.password!,
              avatarInitials: initials 
          } : u));
          setEditingUserId(null);
      } else {
          const newUser: UserProfile = {
              id: `U-${Date.now()}`,
              name: userForm.name,
              role: userForm.role as UserRole,
              avatarInitials: initials,
              password: userForm.password
          };
          setUsers([...users, newUser]);
      }
      setUserForm({ name: '', role: 'Technician', password: '' });
  };

  const handleEditUser = (user: UserProfile) => {
      setUserForm({ name: user.name, role: user.role, password: user.password });
      setEditingUserId(user.id);
  };

  const handleDeleteUser = (id: string) => {
      if (users.length <= 1) { alert("Cannot delete the last user."); return; }
      if (confirm('Delete this user? They will no longer be able to log in.')) {
          setUsers(prev => prev.filter(u => u.id !== id));
      }
  };

  // --- Technician Handlers ---
  const handleAddTechnician = () => {
      if(!techForm.name) return;
      if(editingTechId) {
          setTechnicians(prev => prev.map(t => t.id === editingTechId ? { ...t, name: techForm.name!, specialization: techForm.specialization || '' } : t));
          setEditingTechId(null);
      } else {
          const newTech: Technician = {
              id: `T-${Date.now()}`,
              name: techForm.name,
              specialization: techForm.specialization || 'General',
              active: true
          };
          setTechnicians([...technicians, newTech]);
      }
      setTechForm({ name: '', specialization: '' });
  };

  const handleEditTech = (tech: Technician) => {
      setTechForm({ name: tech.name, specialization: tech.specialization });
      setEditingTechId(tech.id);
  };

  const handleDeleteTech = (id: string) => {
      if(confirm('Delete this technician profile?')) {
          setTechnicians(prev => prev.filter(t => t.id !== id));
      }
  };

  // --- Sales Person Handlers ---
  const handleAddSalesPerson = () => {
      if(!salesForm.name) return;
      if(editingSalesId) {
          setSalesPersons(prev => prev.map(s => s.id === editingSalesId ? { ...s, name: salesForm.name! } : s));
          setEditingSalesId(null);
      } else {
          const newSales: SalesPerson = {
              id: `S-${Date.now()}`,
              name: salesForm.name,
              active: true
          };
          setSalesPersons([...salesPersons, newSales]);
      }
      setSalesForm({ name: '' });
  };

  const handleEditSales = (sales: SalesPerson) => {
      setSalesForm({ name: sales.name });
      setEditingSalesId(sales.id);
  };

  const handleDeleteSales = (id: string) => {
      if(confirm('Delete this sales person profile?')) {
          setSalesPersons(prev => prev.filter(s => s.id !== id));
      }
  };

  // --- Supplier Handlers ---
  const handleAddSupplier = () => {
    if(!supplierForm.name) return;
    if(editingSupplierId) {
        setSuppliers(prev => prev.map(s => s.id === editingSupplierId ? { 
            ...s, 
            name: supplierForm.name!,
            contactPerson: supplierForm.contactPerson || '',
            email: supplierForm.email || '',
            phone: supplierForm.phone || '',
            address: supplierForm.address || '',
            notes: supplierForm.notes || ''
        } : s));
        setEditingSupplierId(null);
    } else {
        const newSupplier: Supplier = {
            id: `SUP-${Date.now()}`,
            name: supplierForm.name,
            contactPerson: supplierForm.contactPerson || '',
            email: supplierForm.email || '',
            phone: supplierForm.phone || '',
            address: supplierForm.address || '',
            notes: supplierForm.notes || '',
            balance: 0,
            ledger: []
        };
        setSuppliers([...suppliers, newSupplier]);
    }
    setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
  };

  const handleEditSupplier = (s: Supplier) => {
      setSupplierForm(s);
      setEditingSupplierId(s.id);
  };

  const handleDeleteSupplier = (id: string) => {
      if(confirm('Delete this supplier?')) {
          setSuppliers(prev => prev.filter(s => s.id !== id));
      }
  };

  // --- Brand Logic ---
  const handleAddBrand = () => {
      if(newBrand && !brands.some(b => b.name === newBrand)) {
          setBrands([...brands, { name: newBrand, models: [] }].sort((a,b) => a.name.localeCompare(b.name)));
          setNewBrand('');
      }
  };

  const handleDeleteBrand = (brandName: string) => {
      if (currentUser.role !== 'Admin') {
          alert("Only Admins can delete brands.");
          return;
      }
      if(confirm(`Remove ${brandName} and all its models?`)) {
          setBrands(prev => prev.filter(b => b.name !== brandName));
          if(selectedBrandForModels === brandName) setSelectedBrandForModels(null);
      }
  };

  // --- Model Logic ---
  const handleAddModel = () => {
      if(selectedBrandForModels && newModel) {
          setBrands(prev => prev.map(b => {
              if(b.name === selectedBrandForModels) {
                  if(!b.models.includes(newModel)) {
                      return { ...b, models: [...b.models, newModel].sort() };
                  }
              }
              return b;
          }));
          setNewModel('');
      }
  };

  const handleDeleteModel = (modelName: string) => {
      if (currentUser.role !== 'Admin') {
          alert("Only Admins can delete models.");
          return;
      }
      if(selectedBrandForModels) {
          setBrands(prev => prev.map(b => {
              if(b.name === selectedBrandForModels) {
                  return { ...b, models: b.models.filter(m => m !== modelName) };
              }
              return b;
          }));
      }
  };

  const handleAddCategory = () => {
      if(newCategory && !categories.includes(newCategory)) {
          setCategories([...categories, newCategory].sort());
          setNewCategory('');
      }
  };

  // --- Backup Logic ---
  const handleLocalExport = () => {
     const event = new CustomEvent('trigger-local-export');
     window.dispatchEvent(event);
  };

  const handleAppReset = () => {
      const event = new CustomEvent('trigger-app-reset');
      window.dispatchEvent(event);
  };

  const handleGoogleBackup = async () => {
      if (!settings.googleApiKey || !settings.googleClientId) {
          alert("Please configure Google API Key and Client ID first.");
          return;
      }
      setBackupLoading(true);
      setUploadStatus('idle');
      
      try {
          await loadGoogleDriveApi(settings.googleApiKey, settings.googleClientId);
          const event = new CustomEvent('trigger-google-backup');
          window.dispatchEvent(event);
          
          setTimeout(() => {
              setBackupLoading(false);
              setUploadStatus('success');
              setSettings(prev => ({ ...prev, lastBackupDate: new Date().toLocaleString() }));
          }, 3000);
      } catch (error) {
          console.error(error);
          setBackupLoading(false);
          setUploadStatus('error');
      }
  };

  const handleDriveShare = () => {
      const event = new CustomEvent('trigger-drive-share');
      window.dispatchEvent(event);
  };

  const handleFileImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const event = new CustomEvent('trigger-file-import', { detail: file });
          window.dispatchEvent(event);
          e.target.value = ''; // Reset
      }
  };

  const getActiveModels = () => {
      return brands.find(b => b.name === selectedBrandForModels)?.models || [];
  };

  // Role Access Checks
  const canAccessGeneral = currentUser.role === 'Admin';
  const canAccessTeam = currentUser.role === 'Admin';
  const canAccessSuppliers = currentUser.role === 'Admin' || currentUser.role === 'Sales';
  const canAccessData = true; // Everyone needs to see/add brands
  const canAccessNotifications = currentUser.role === 'Admin';
  const canAccessBackup = currentUser.role === 'Admin';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">System Settings</h2>
        <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto">
            {canAccessGeneral && (
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Settings size={16} className="mr-2" /> General
                </button>
            )}
            {canAccessNotifications && (
                <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'notifications' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <BellRing size={16} className="mr-2" /> Notifications
                </button>
            )}
            {canAccessBackup && (
                <button 
                    onClick={() => setActiveTab('backup')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <HardDrive size={16} className="mr-2" /> Backup & Data
                </button>
            )}
            {canAccessTeam && (
                <button 
                    onClick={() => setActiveTab('team')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'team' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Users size={16} className="mr-2" /> Team
                </button>
            )}
            {canAccessSuppliers && (
                <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Truck size={16} className="mr-2" /> Suppliers
                </button>
            )}
            {canAccessData && (
                <button 
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'data' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Database size={16} className="mr-2" /> Data
                </button>
            )}
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && canAccessGeneral && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Store Configuration</h3>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                          <input 
                            type="text" 
                            value={settings.storeName}
                            onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Store Location</label>
                          <input 
                            type="text" 
                            value={settings.storeLocation}
                            onChange={(e) => setSettings({...settings, storeLocation: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Store Phone</label>
                          <input 
                            type="text" 
                            value={settings.storePhone}
                            onChange={(e) => setSettings({...settings, storePhone: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. 04373-469443"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Owner Phone</label>
                          <input 
                            type="text" 
                            value={settings.ownerPhone}
                            onChange={(e) => setSettings({...settings, ownerPhone: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. 9626207767"
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Store Address</label>
                          <textarea 
                            value={settings.storeAddress || ''}
                            onChange={(e) => setSettings({...settings, storeAddress: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Store Email</label>
                          <input 
                            type="email" 
                            value={settings.storeEmail || ''}
                            onChange={(e) => setSettings({...settings, storeEmail: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">GST / Tax ID</label>
                          <input 
                            type="text" 
                            value={settings.gstNumber || ''}
                            onChange={(e) => setSettings({...settings, gstNumber: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                          <input 
                            type="text" 
                            value={settings.website || ''}
                            onChange={(e) => setSettings({...settings, website: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="https://"
                          />
                      </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                      <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                          <CreditCard size={18} className="mr-2 text-slate-500"/> Financial Configuration
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice ID Prefix</label>
                              <div className="flex items-center">
                                  <input 
                                    type="text" 
                                    value={settings.invoicePrefix}
                                    onChange={(e) => setSettings({...settings, invoicePrefix: e.target.value.toUpperCase()})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                                    placeholder="INV" 
                                  />
                              </div>
                              <p className="text-xs text-slate-400 mt-1">Ex: <strong>{settings.invoicePrefix}</strong>-20231024-XXXX</p>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax Rate (%)</label>
                              <input 
                                type="number" 
                                step="0.1"
                                value={settings.taxRate}
                                onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                              />
                          </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency Symbol</label>
                              <input 
                                type="text" 
                                value={settings.currencySymbol}
                                onChange={(e) => setSettings({...settings, currencySymbol: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-md font-medium flex items-center">
                          <Save size={18} className="mr-2"/> Save Changes
                      </button>
                  </div>
              </form>
          </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && canAccessBackup && (
          <div className="space-y-6 animate-fade-in">
              
              {/* Google Drive Share / Mobile Cloud Link */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center">
                           <Share2 size={20} className="mr-2 text-green-600"/> Mobile Cloud Backup (Drive / Share)
                       </h3>
                   </div>
                   <p className="text-sm text-slate-600 mb-4">
                       Easily share your backup file to Google Drive, WhatsApp, or Email on mobile devices.
                   </p>
                   
                   <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                       <label className="block text-xs font-bold text-green-800 uppercase mb-1">Google Drive Folder Link</label>
                       <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={settings.googleDriveFolderLink || ''}
                              onChange={(e) => setSettings({...settings, googleDriveFolderLink: e.target.value})}
                              className="flex-1 border border-green-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                              placeholder="https://drive.google.com/drive/folders/..."
                           />
                           <button 
                               onClick={() => settings.googleDriveFolderLink && openExternalStorage(settings.googleDriveFolderLink)}
                               className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 font-medium text-sm flex items-center whitespace-nowrap"
                           >
                               <FolderOpen size={16} className="mr-2"/> Open Folder
                           </button>
                       </div>
                       <p className="text-xs text-green-600 mt-2 flex items-center">
                           <ShieldAlert size={12} className="mr-1"/> Store your Drive folder link here for quick access.
                       </p>
                   </div>

                   <button 
                       onClick={handleDriveShare}
                       className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center transition-all"
                   >
                       <Share2 size={18} className="mr-2" /> Share Backup to App (Drive/WhatsApp)
                   </button>
              </div>

              {/* Cloud Storage Links (TeraBox) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center">
                           <Cloud size={20} className="mr-2 text-indigo-500"/> TeraBox / External Cloud
                       </h3>
                   </div>
                   <p className="text-sm text-slate-600 mb-4">
                       Configure your external cloud storage link for manual backups.
                   </p>
                   
                   <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                       <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">TeraBox Folder URL</label>
                       <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={settings.teraBoxUrl || ''}
                              onChange={(e) => setSettings({...settings, teraBoxUrl: e.target.value})}
                              className="flex-1 border border-indigo-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="https://terabox.com/s/..."
                           />
                           <button 
                               onClick={() => settings.teraBoxUrl && openExternalStorage(settings.teraBoxUrl)}
                               className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center whitespace-nowrap"
                           >
                               <ExternalLink size={16} className="mr-2"/> Open Cloud Storage
                           </button>
                       </div>
                       <p className="text-xs text-indigo-600 mt-2 flex items-center">
                           <ShieldAlert size={12} className="mr-1"/> Workflow: Export the backup file below first, then upload it to your TeraBox folder.
                       </p>
                   </div>
              </div>

              {/* Device Storage Management Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center">
                           <HardDrive size={20} className="mr-2 text-blue-600"/> Device Storage Management
                       </h3>
                       <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
                   </div>
                   <p className="text-sm text-slate-600 mb-6">
                       Manage data stored locally on this device. Auto-save is enabled.
                   </p>
                   
                   {/* Storage Stats */}
                   <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Storage Used</span>
                            <span className="text-sm font-bold text-blue-600">{storageSize}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Local storage is limited by the browser (~5MB usually).</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <button 
                           onClick={handleLocalExport}
                           className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 border-dashed rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
                       >
                           <DownloadCloud size={32} className="text-slate-400 group-hover:text-blue-600 mb-3" />
                           <span className="font-bold text-slate-700 group-hover:text-blue-700">Save to Device Files</span>
                           <span className="text-xs text-slate-400 mt-1">Download .JSON Backup</span>
                       </button>

                       <button 
                           onClick={handleFileImportClick}
                           className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 border-dashed rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all group"
                       >
                           <FileUp size={32} className="text-slate-400 group-hover:text-emerald-600 mb-3" />
                           <span className="font-bold text-slate-700 group-hover:text-emerald-700">Import Backup File</span>
                           <span className="text-xs text-slate-400 mt-1">Restore from .JSON</span>
                           <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              accept=".json" 
                              className="hidden" 
                           />
                       </button>
                   </div>

                   {/* Danger Zone */}
                   <div className="mt-8 pt-6 border-t border-red-100">
                        <h4 className="text-sm font-bold text-red-600 mb-3 flex items-center">
                            <AlertTriangle size={16} className="mr-2"/> Danger Zone
                        </h4>
                        <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
                            <div>
                                <p className="text-sm font-medium text-red-800">Clear App Data</p>
                                <p className="text-xs text-red-600 mt-1">Permanently delete all local data and reset to defaults.</p>
                            </div>
                            <button 
                                onClick={handleAppReset}
                                className="bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                            >
                                Factory Reset
                            </button>
                        </div>
                   </div>
              </div>

              {/* Google Drive Section (API) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center">
                           <Cloud size={20} className="mr-2 text-orange-500"/> Google Drive API Backup
                       </h3>
                       {settings.lastBackupDate && (
                           <span className="text-xs text-slate-500">Last Backup: {settings.lastBackupDate}</span>
                       )}
                   </div>
                   
                   <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Google Client ID</label>
                               <input 
                                  type="text" 
                                  value={settings.googleClientId || ''}
                                  onChange={(e) => setSettings({...settings, googleClientId: e.target.value})}
                                  className="w-full border border-orange-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                  placeholder="apps.googleusercontent.com"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-orange-800 uppercase mb-1">API Key</label>
                               <input 
                                  type="password" 
                                  value={settings.googleApiKey || ''}
                                  onChange={(e) => setSettings({...settings, googleApiKey: e.target.value})}
                                  className="w-full border border-orange-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                  placeholder="AIzaSy..."
                               />
                           </div>
                       </div>
                       <p className="text-xs text-orange-600 mt-2">
                           Required: Enable Google Drive API in Google Cloud Console and add this domain to authorized origins.
                       </p>
                   </div>

                   <button 
                       onClick={handleGoogleBackup}
                       disabled={backupLoading}
                       className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center transition-all disabled:opacity-70"
                   >
                       {backupLoading ? (
                           <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Uploading...</>
                       ) : (
                           <><UploadCloud size={18} className="mr-2" /> Backup to Google Drive (API)</>
                       )}
                   </button>
                   
                   {uploadStatus === 'success' && (
                       <p className="text-sm text-green-600 font-bold mt-3 text-center flex items-center justify-center">
                           <CheckCircle2 size={16} className="mr-1"/> Backup successful!
                       </p>
                   )}
              </div>
          </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && canAccessTeam && (
          <div className="space-y-8 animate-fade-in">
              {/* User Management (Login Access) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <Key size={20} className="mr-2 text-blue-600"/> User Management & Login Access
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-blue-100 h-fit">
                          <h4 className="font-bold text-slate-700 mb-4 text-sm">{editingUserId ? 'Edit User Login' : 'Create New User'}</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                  <input 
                                     type="text" 
                                     value={userForm.name}
                                     onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                                     className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                     placeholder="e.g. John Doe"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                                  <select 
                                     value={userForm.role}
                                     onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})}
                                     className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                                  >
                                      <option value="Technician">Technician</option>
                                      <option value="Sales">Sales</option>
                                      <option value="Admin">Admin</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                  <div className="relative">
                                      <input 
                                         type={showPassword ? "text" : "password"} 
                                         value={userForm.password}
                                         onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                                         className="w-full border border-slate-300 rounded-lg p-2 pr-8 text-sm"
                                         placeholder="Set password"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                      >
                                          {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                                      </button>
                                  </div>
                              </div>
                              
                              <div className="flex gap-2 pt-2">
                                  <button 
                                     onClick={handleAddUser}
                                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
                                  >
                                     {editingUserId ? 'Update User' : 'Create User'}
                                  </button>
                                  {editingUserId && (
                                      <button 
                                        onClick={() => { setEditingUserId(null); setUserForm({name:'', role:'Technician', password:''}); }}
                                        className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                      >
                                          <X size={16} />
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="lg:col-span-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
                          <div className="p-4 border-b border-blue-50 bg-blue-50/50 flex justify-between items-center">
                              <span className="font-bold text-slate-700 text-sm">Active Users</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{users.length}</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                              {users.map(user => (
                                  <div key={user.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                              {user.avatarInitials}
                                          </div>
                                          <div>
                                              <p className="font-medium text-sm text-slate-800">{user.name}</p>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                  user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                  user.role === 'Technician' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                                              }`}>
                                                  {user.role}
                                              </span>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleEditUser(user)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit Login"
                                          >
                                              <Edit2 size={14}/>
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                            title="Delete User"
                                          >
                                              <Trash2 size={14}/>
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Invitation Link Section */}
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                      <Link size={20} className="mr-2 text-indigo-600"/> Quick Invite Link
                  </h3>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role Access</label>
                          <select 
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as UserRole)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 outline-none bg-white text-sm"
                          >
                              <option value="Technician">Technician</option>
                              <option value="Sales">Sales</option>
                              <option value="Admin">Admin</option>
                          </select>
                      </div>
                      <div className="flex-[2] w-full relative">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invitation Link</label>
                          <input 
                             type="text" 
                             readOnly
                             value={invitationLink || 'Click generate to create a secure link'}
                             className={`w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-none text-sm font-mono ${invitationLink ? 'bg-white text-slate-700' : 'bg-slate-50 text-slate-400 italic'}`}
                          />
                          {invitationLink && (
                              <button 
                                onClick={copyInviteLink}
                                className="absolute right-2 top-[26px] text-indigo-500 hover:text-indigo-700 p-1"
                                title="Copy Link"
                              >
                                  <Copy size={16} />
                              </button>
                          )}
                      </div>
                      <button 
                        onClick={generateInviteLink}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm w-full md:w-auto flex items-center justify-center whitespace-nowrap text-sm"
                      >
                          Generate
                      </button>
                  </div>
              </div>

              {/* Technicians Section (Details Only) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                  <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                      <h3 className="font-bold text-slate-800 mb-4">{editingTechId ? 'Edit Tech Profile' : 'Add Tech Profile'}</h3>
                      <p className="text-xs text-slate-400 mb-4">Manage specialization details here. Create login above.</p>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                              <input 
                                 type="text" 
                                 value={techForm.name}
                                 onChange={(e) => setTechForm({...techForm, name: e.target.value})}
                                 className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                 placeholder="e.g. John Doe"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialization</label>
                              <input 
                                 type="text" 
                                 value={techForm.specialization}
                                 onChange={(e) => setTechForm({...techForm, specialization: e.target.value})}
                                 className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                 placeholder="e.g. Screen Repair"
                              />
                          </div>
                          <div className="flex gap-2 pt-2">
                              <button 
                                 onClick={handleAddTechnician}
                                 disabled={!techForm.name}
                                 className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                 {editingTechId ? 'Update Profile' : 'Add Profile'}
                              </button>
                              {editingTechId && (
                                  <button 
                                    onClick={() => { setEditingTechId(null); setTechForm({name:'', specialization:''}); }}
                                    className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                  >
                                      <X size={18} />
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">Technician Profiles</h3>
                          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{technicians.length} Profiles</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {technicians.map(tech => (
                              <div key={tech.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                                          {tech.name.charAt(0)}
                                      </div>
                                      <div>
                                          <p className="font-medium text-slate-800 text-sm">{tech.name}</p>
                                          <p className="text-xs text-slate-500">{tech.specialization}</p>
                                      </div>
                                  </div>
                                  <div className="flex space-x-2">
                                      <button 
                                        onClick={() => handleEditTech(tech)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteTech(tech.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Sales Profiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                  <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                      <h3 className="font-bold text-slate-800 mb-4">{editingSalesId ? 'Edit Sales Profile' : 'Add Sales Profile'}</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                              <input 
                                 type="text" 
                                 value={salesForm.name}
                                 onChange={(e) => setSalesForm({...salesForm, name: e.target.value})}
                                 className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                 placeholder="e.g. Alice Smith"
                              />
                          </div>
                          <div className="flex gap-2 pt-2">
                              <button 
                                 onClick={handleAddSalesPerson}
                                 disabled={!salesForm.name}
                                 className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                 {editingSalesId ? 'Update Profile' : 'Add Profile'}
                              </button>
                              {editingSalesId && (
                                  <button 
                                    onClick={() => { setEditingSalesId(null); setSalesForm({name:''}); }}
                                    className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                  >
                                      <X size={18} />
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">Sales Profiles</h3>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">{salesPersons.length} Profiles</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {salesPersons.map(person => (
                              <div key={person.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                          {person.name.charAt(0)}
                                      </div>
                                      <div>
                                          <p className="font-medium text-slate-800 text-sm">{person.name}</p>
                                          <p className="text-xs text-slate-500">Sales / Pickup</p>
                                      </div>
                                  </div>
                                  <div className="flex space-x-2">
                                      <button 
                                        onClick={() => handleEditSales(person)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteSales(person.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'suppliers' && canAccessSuppliers && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="font-bold text-slate-800 mb-4">{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name *</label>
                          <input 
                             type="text" 
                             value={supplierForm.name}
                             onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                             placeholder="e.g. MobileSentrix"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Person</label>
                          <input 
                             type="text" 
                             value={supplierForm.contactPerson}
                             onChange={(e) => setSupplierForm({...supplierForm, contactPerson: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input 
                                type="email" 
                                value={supplierForm.email}
                                onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                            <input 
                                type="text" 
                                value={supplierForm.phone}
                                onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                          <input 
                             type="text" 
                             value={supplierForm.address}
                             onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                          <textarea 
                             value={supplierForm.notes}
                             onChange={(e) => setSupplierForm({...supplierForm, notes: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                          />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                          <button 
                             onClick={handleAddSupplier}
                             disabled={!supplierForm.name}
                             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                             {editingSupplierId ? 'Update Supplier' : 'Add Supplier'}
                          </button>
                          {editingSupplierId && (
                              <button 
                                onClick={() => { setEditingSupplierId(null); setSupplierForm({name:'', contactPerson:'', email:'', phone:'', address:'', notes:''}); }}
                                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                              >
                                  <X size={18} />
                              </button>
                          )}
                      </div>
                  </div>
              </div>

              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Supplier List</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">{suppliers.length} Vendors</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-4 grid grid-cols-1 gap-4">
                      {suppliers.map(sup => (
                          <div key={sup.id} className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow bg-slate-50 flex justify-between items-start">
                              <div className="space-y-1">
                                  <div className="flex items-center">
                                      <Truck size={16} className="mr-2 text-slate-400"/>
                                      <h4 className="font-bold text-slate-800">{sup.name}</h4>
                                  </div>
                                  <div className="text-sm text-slate-600 pl-6 space-y-0.5">
                                      {sup.contactPerson && <p className="flex items-center text-xs"><UserCheck size={12} className="mr-1.5 opacity-50"/> {sup.contactPerson}</p>}
                                      {sup.phone && <p className="flex items-center text-xs"><Phone size={12} className="mr-1.5 opacity-50"/> {sup.phone}</p>}
                                      {sup.email && <p className="flex items-center text-xs"><Mail size={12} className="mr-1.5 opacity-50"/> {sup.email}</p>}
                                  </div>
                              </div>
                              <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handleEditSupplier(sup)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  >
                                      <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSupplier(sup.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {suppliers.length === 0 && (
                          <div className="text-center text-slate-400 py-10 italic">No suppliers added yet.</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'data' && canAccessData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Brands Column */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[500px]">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                      <Tag size={18} className="mr-2 text-purple-600"/> Brands
                  </h3>
                  <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        value={newBrand} 
                        onChange={(e) => setNewBrand(e.target.value)}
                        placeholder="New brand..."
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <button onClick={handleAddBrand} className="bg-purple-600 text-white px-3 rounded-lg hover:bg-purple-700">
                          <Plus size={18} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {brands.map(brand => (
                          <div 
                              key={brand.name} 
                              onClick={() => setSelectedBrandForModels(brand.name)}
                              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${
                                  selectedBrandForModels === brand.name 
                                  ? 'bg-purple-50 border-purple-200 shadow-sm' 
                                  : 'hover:bg-slate-50 border-transparent'
                              }`}
                          >
                              <span className={`font-medium ${selectedBrandForModels === brand.name ? 'text-purple-700' : 'text-slate-700'}`}>
                                  {brand.name}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{brand.models.length}</span>
                                {currentUser.role === 'Admin' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.name); }} className="text-slate-300 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Models Column (Contextual) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[500px]">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                      <Smartphone size={18} className="mr-2 text-blue-600"/> 
                      {selectedBrandForModels ? `${selectedBrandForModels} Models` : 'Select a Brand'}
                  </h3>
                  {selectedBrandForModels ? (
                      <>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newModel} 
                                onChange={(e) => setNewModel(e.target.value)}
                                placeholder={`Add ${selectedBrandForModels} model...`}
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button onClick={handleAddModel} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                            {getActiveModels().length === 0 ? (
                                <p className="text-sm text-slate-400 text-center mt-10">No models added yet.</p>
                            ) : (
                                getActiveModels().map(model => (
                                    <div key={model} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 group">
                                        <span className="text-sm text-slate-600">{model}</span>
                                        {currentUser.role === 'Admin' && (
                                            <button onClick={() => handleDeleteModel(model)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                          <Tag size={48} className="mb-2 opacity-20"/>
                          <p className="text-sm">Select a brand from the left to manage its models.</p>
                      </div>
                  )}
              </div>

              {/* Categories Column */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[500px]">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                      <Database size={18} className="mr-2 text-indigo-600"/> Categories
                  </h3>
                  <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        value={newCategory} 
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Add category..."
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={handleAddCategory} className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700">
                          <Plus size={18} />
                      </button>
                  </div>
                  <div className="flex flex-wrap gap-2 content-start overflow-y-auto">
                      {categories.map(cat => (
                          <span key={cat} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center group h-fit">
                              {cat}
                              {currentUser.role === 'Admin' && (
                                  <button onClick={() => confirm(`Delete ${cat}?`) && setCategories(prev => prev.filter(c => c !== cat))} className="ml-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                      <X size={12} />
                                  </button>
                              )}
                          </span>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      {/* Access Denied Fallback (Visual Only) */}
      {!canAccessGeneral && activeTab === 'general' && (
          <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <ShieldAlert size={48} className="mx-auto mb-4 text-slate-300"/>
              <p>You do not have permission to view General Settings.</p>
          </div>
      )}
    </div>
  );
};

export default SettingsView;
