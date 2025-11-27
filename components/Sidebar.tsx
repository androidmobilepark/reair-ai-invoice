import React from 'react';
import { ViewState, UserProfile } from '../types';
import { LayoutDashboard, ShoppingCart, Wrench, FileText, MessageSquare, Users, Settings, LogOut, X, FileBarChart } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: UserProfile;
  onLogout: () => void;
  isOpen?: boolean; // Mobile state
  onClose?: () => void; // Mobile close handler
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, currentUser, onLogout, isOpen, onClose }) => {
  // Define nav items with allowed roles
  const navItems = [
    { view: ViewState.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} />, allowedRoles: ['Admin', 'Technician', 'Sales'] },
    { view: ViewState.CRM, label: 'Customers', icon: <Users size={20} />, allowedRoles: ['Admin', 'Sales'] },
    { view: ViewState.REPAIRS, label: 'Repairs', icon: <Wrench size={20} />, allowedRoles: ['Admin', 'Technician', 'Sales'] },
    { view: ViewState.INVENTORY, label: 'Inventory', icon: <ShoppingCart size={20} />, allowedRoles: ['Admin', 'Technician', 'Sales'] },
    { view: ViewState.INVOICE, label: 'Invoices', icon: <FileText size={20} />, allowedRoles: ['Admin', 'Sales', 'Technician'] },
    { view: ViewState.REPORTS, label: 'Reports', icon: <FileBarChart size={20} />, allowedRoles: ['Admin', 'Sales'] },
    { view: ViewState.CHAT, label: 'AI Assistant', icon: <MessageSquare size={20} />, allowedRoles: ['Admin', 'Technician', 'Sales'] },
    { view: ViewState.SETTINGS, label: 'Settings', icon: <Settings size={20} />, allowedRoles: ['Admin', 'Technician', 'Sales'] },
  ];

  const filteredNavItems = navItems.filter(item => item.allowedRoles.includes(currentUser.role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-jshine text-white shadow-xl">
      <div className="p-6 border-b border-white/20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            Android Mobile Park
          </h1>
          <p className="text-xs text-white/80 mt-1 font-medium tracking-wide">Just Live For You</p>
        </div>
        {/* Mobile Close Button */}
        <button onClick={onClose} className="md:hidden text-white hover:bg-white/20 p-1 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              onNavigate(item.view);
              if (onClose) onClose();
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
              currentView === item.view
                ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-white/20">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-sm border border-white/30 text-white shadow-sm">
                {currentUser.avatarInitials}
            </div>
            <div>
                <p className="text-sm font-medium text-white">{currentUser.name}</p>
                <p className="text-[10px] text-white/70 uppercase tracking-wide">{currentUser.role}</p>
            </div>
            </div>
            <button 
                onClick={onLogout}
                className="text-white/70 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                title="Logout"
            >
                <LogOut size={18} />
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <div className="hidden md:flex w-64 flex-col h-screen fixed left-0 top-0 z-10">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
          
          {/* Drawer */}
          <div className="relative w-72 h-full animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;