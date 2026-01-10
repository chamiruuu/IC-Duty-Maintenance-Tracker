import React, { useRef, useEffect, useState } from 'react';
import { Bell, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

const NotificationMenu = ({ isOpen, onClose, history, onClear }) => {
  const menuRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // Close if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  // Filter for last 10 minutes
  const now = new Date();
  const recentHistory = history.filter(n => differenceInMinutes(now, n.timestamp) <= 10);

  const handleCopy = (e, id, text) => {
    e.stopPropagation(); // Prevent bubbling if needed
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div ref={menuRef} className="absolute right-0 top-12 w-80 bg-white border border-gray-200 shadow-xl rounded-lg z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Recent Alerts (10m)</h3>
        {recentHistory.length > 0 && (
            <button onClick={onClear} className="text-[10px] text-gray-400 hover:text-red-600 font-medium transition-colors">
                Clear All
            </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[300px] overflow-y-auto">
        {recentHistory.length === 0 ? (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center gap-2">
            <Bell size={20} className="text-gray-200" />
            <span className="text-xs">No recent notifications</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentHistory.map((n) => (
              <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3">
                
                {/* Icon */}
                <div className={`mt-0.5 min-w-[24px] h-6 rounded-full flex items-center justify-center ${n.type === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                   {n.type === 'urgent' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                </div>

                {/* Content */}
                <div className="flex-1">
                   <h4 className="text-xs font-bold text-gray-900 leading-tight">{n.title}</h4>
                   <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                   
                   {/* Timestamp & Copy Button Row */}
                   <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] text-gray-300 font-mono">
                            {n.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </span>

                        {n.copyText && (
                            <button
                                onClick={(e) => handleCopy(e, n.id, n.copyText)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold transition-all ${copiedId === n.id ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-gray-200 text-gray-600 hover:border-black hover:text-black'}`}
                            >
                                {copiedId === n.id ? <Check size={10} /> : <Copy size={10} />}
                                {copiedId === n.id ? 'COPIED' : 'COPY SCRIPT'}
                            </button>
                        )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationMenu;