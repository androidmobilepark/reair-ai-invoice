
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Wrench, ShoppingCart, MessageSquare, Menu, Search, Plus, Bell } from 'lucide-react';

interface MobileNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenSidebar: () => void;
  onFabClick?: () => void; // Floating Action Button click handler
  showFab?: boolean;
}

export const MobileHeader: React.FC<{ onOpenSidebar: () => void; title: string }> = ({ onOpenSidebar, title }) => (
  <div className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20 md:hidden">
    <div className="flex items-center gap-3">
      <button onClick={onOpenSidebar} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
        <Menu size={24} />
      </button>
      <h1 className="font-bold text-lg text-slate-800 truncate max-w-[150px]">{title}</h1>
    </div>
    <div className="flex items-center gap-2">
      <button className="p-2 text-slate-400 hover:text-blue-600">
        <Search size={20} />
      </button>
      <button className="p-2 text-slate-400 hover:text-blue-600">
        <Bell size={20} />
      </button>
    </div>
  </div>
);

export const MobileBottomNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, onFabClick, showFab }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, label: 'Home', icon: <LayoutDashboard size={20} /> },
    { view: ViewState.REPAIRS, label: 'Repairs', icon: <Wrench size={20} /> },
    { view: ViewState.INVENTORY, label: 'Stock', icon: <ShoppingCart size={20} /> },
    { view: ViewState.CHAT, label: 'AI Chat', icon: <MessageSquare size={20} /> },
  ];

  return (
    <>
      {/* Floating Action Button */}
      {showFab && onFabClick && (
        <button
          onClick={onFabClick}
          className="fixed bottom-20 right-4 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center z-30 active:scale-95 transition-transform md:hidden"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 z-30 md:hidden safe-area-pb">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              currentView === item.view ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
