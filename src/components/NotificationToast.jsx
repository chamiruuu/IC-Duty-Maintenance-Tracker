import React, { useState } from 'react';
import { Bell, Copy, Check, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

const NotificationToast = ({ notifications, removeNotification, onSnooze }) => {
  const [justCopied, setJustCopied] = useState(null);

  if (notifications.length === 0) return null;

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setJustCopied(id);
    setTimeout(() => setJustCopied(null), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {notifications.map((n) => (
        <div 
          key={n.id} 
          className={`w-96 p-4 rounded-lg shadow-xl border-l-4 flex items-start gap-3 animate-in slide-in-from-right duration-300 bg-white ${n.type === 'urgent' ? 'border-red-500' : 'border-amber-500'}`}
        >
          <div className={`p-2 rounded-full mt-1 ${n.type === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            {n.type === 'urgent' ? <AlertTriangle size={18} /> : <Bell size={18} />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed mb-3">{n.message}</p>
            
            <div className="flex flex-wrap gap-2">
                {/* SNOOZE BUTTON (Only for Overdue/Urgent items with an ID) */}
                {n.type === 'urgent' && n.maintenanceId && (
                    <button 
                        onClick={() => onSnooze(n.maintenanceId, n.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-colors w-full justify-center mb-1"
                    >
                        <MessageSquare size={12} /> Confirming with Provider (Snooze 5m)
                    </button>
                )}

                {/* COPY SCRIPT BUTTON */}
                {n.copyText && (
                    <button 
                        onClick={() => handleCopy(n.id, n.copyText)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${justCopied === n.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        {justCopied === n.id ? <Check size={12} /> : <Copy size={12} />}
                        {justCopied === n.id ? 'COPIED' : 'COPY SCRIPT'}
                    </button>
                )}

                <button 
                onClick={() => removeNotification(n.id)}
                className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-wide ml-auto"
                >
                Dismiss
                </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;