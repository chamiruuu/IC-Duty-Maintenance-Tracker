import React from 'react';
import { Trash2, ArrowRight } from 'lucide-react';

const DeleteRequestModal = ({ isOpen, onClose, item, onConfirm, loading }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
        <div className="p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Deletion?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                You are requesting to <strong>permanently delete</strong> the entry for <strong>{item.provider}</strong>. This requires Admin approval.
            </p>

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(item)}
                    disabled={loading}
                    className="flex-[1.5] py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md flex items-center justify-center gap-2"
                >
                    {loading ? 'Sending...' : 'Request Delete'} <ArrowRight size={14} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteRequestModal;