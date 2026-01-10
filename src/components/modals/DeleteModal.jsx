import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, onConfirm, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-red-100">
         
         {/* Header */}
         <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-red-700 tracking-wide flex items-center gap-2">
               <AlertTriangle size={16} /> Confirm Deletion
            </h3>
            <button onClick={onClose} className="text-red-300 hover:text-red-700 transition-colors">
               <X size={18} />
            </button>
         </div>

         {/* Content */}
         <div className="p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 size={24} />
            </div>
            <h4 className="text-gray-900 font-bold text-lg">Delete this entry?</h4>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
               This action cannot be undone. The maintenance record will be permanently removed for all users.
            </p>
         </div>

         {/* Footer */}
         <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button 
               onClick={onClose} 
               className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
               Cancel
            </button>
            <button 
               onClick={onConfirm} 
               disabled={loading}
               className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
               {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
         </div>

      </div>
    </div>
  );
};

export default DeleteModal;