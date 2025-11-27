
import React, { useState } from 'react';
import { AlertCircle, Clock, X, ChevronUp, ChevronDown } from 'lucide-react';

interface NotificationToastProps {
  repairId: string;
  customerName: string;
  deviceModel: string;
  timeOverdue: string;
  onSnooze: (id: string, minutes: number) => void;
  onDismiss: (id: string) => void;
}

const SNOOZE_OPTIONS = [
  { label: '15 Minutes', value: 15 },
  { label: '30 Minutes', value: 30 },
  { label: '2 Hours', value: 120 },
  { label: '5 Hours', value: 300 },
  { label: '1 Day', value: 1440 },
  { label: '2 Days', value: 2880 },
  { label: '3 Days', value: 4320 },
];

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  repairId, customerName, deviceModel, timeOverdue, onSnooze, onDismiss 
}) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="glass-panel text-slate-800 rounded-2xl p-4 w-96 animate-slide-left mb-3 flex flex-col relative visible group border-l-4 border-l-red-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center text-red-600 font-bold">
          <AlertCircle size={18} className="mr-2" />
          <span>Overdue Repair Alert</span>
        </div>
        <button onClick={() => onDismiss(repairId)} className="text-slate-500 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>
      
      <div className="text-sm text-slate-700 mb-3 font-medium">
        <p><span className="font-semibold text-slate-800">ID:</span> {repairId}</p>
        <p><span className="font-semibold text-slate-800">Customer:</span> {customerName}</p>
        <p><span className="font-semibold text-slate-800">Device:</span> {deviceModel}</p>
        <p className="mt-1 text-red-600 text-xs font-bold bg-white/50 inline-block px-1 rounded">Expected: {timeOverdue}</p>
      </div>

      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
            {/* Dropdown Menu */}
            {showOptions && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 flex flex-col">
                    {SNOOZE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onSnooze(repairId, option.value);
                                setShowOptions(false);
                            }}
                            className="text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0 transition-colors"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
            
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition-colors border ${
                  showOptions 
                  ? 'bg-blue-100 text-blue-800 border-blue-300' 
                  : 'bg-white/80 hover:bg-white text-slate-800 border-transparent shadow-sm'
              }`}
            >
              <Clock size={14} className="mr-1" /> 
              Snooze 
              {showOptions ? <ChevronDown size={12} className="ml-1"/> : <ChevronUp size={12} className="ml-1"/>}
            </button>
        </div>

        <button 
           onClick={() => onDismiss(repairId)} // Dismiss acts as "Acknowledged for now"
           className="flex-1 border border-transparent bg-white/40 hover:bg-white/70 text-slate-700 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
