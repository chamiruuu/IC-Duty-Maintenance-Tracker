import React from 'react';
import { Trash2, AlertTriangle, X, ShieldCheck, Loader2 } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, onConfirm, onReject, loading, isDeletionRequest }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-gray-200">
         
         {/* Header */}
         <div className={`${isDeletionRequest ? 'bg-orange-50/50 border-orange-100' : 'bg-red-50/50 border-red-100'} px-6 py-4 border-b flex items-center justify-between`}>
            <h3 className={`text-sm font-bold ${isDeletionRequest ? 'text-orange-700' : 'text-red-700'} tracking-wide flex items-center gap-2`}>
               <AlertTriangle size={16} /> {isDeletionRequest ? 'Review Request' : 'Confirm Deletion'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
               <X size={18} />
            </button>
         </div>

         {/* Content */}
         <div className="p-6 text-center">
            <div className={`w-12 h-12 ${isDeletionRequest ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
               <Trash2 size={24} />
            </div>
            <h4 className="text-gray-900 font-bold text-lg">
                {isDeletionRequest ? 'Approve Deletion?' : 'Delete this entry?'}
            </h4>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
               {isDeletionRequest 
                 ? "A user requested to delete this entry. You can approve the deletion or reject the request to restore the entry."
                 : "This action cannot be undone. The maintenance record will be permanently removed for all users."
               }
            </p>
         </div>

         {/* Footer */}
         <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
            <button 
               onClick={onClose} 
               className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
               Cancel
            </button>

            {/* NEW: Reject Button (Only shows for requests) */}
            {isDeletionRequest && (
                <button
                  onClick={onReject}
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                >
                  <ShieldCheck size={14} /> Keep
                </button>
            )}

            <button 
               onClick={onConfirm} 
               disabled={loading}
               className={`flex-1 py-2.5 text-xs font-bold text-white ${isDeletionRequest ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2`}
            >
               {loading ? <Loader2 size={14} className="animate-spin" /> : (isDeletionRequest ? 'Approve' : 'Delete')}
            </button>
         </div>

      </div>
    </div>
  );
};

export default DeleteModal;