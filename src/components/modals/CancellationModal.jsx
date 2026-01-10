import React, { useState } from 'react';
import { X, Ban, FileText, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react';

const CancellationModal = ({ isOpen, onClose, item, onConfirm, loading }) => {
  const [checklist, setChecklist] = useState({
    deleteBo: false,
    updateRedmine: false,
    updateSchedule: false
  });

  if (!isOpen || !item) return null;

  const isSopComplete = checklist.deleteBo && checklist.updateRedmine && checklist.updateSchedule;

  const toggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    if (isSopComplete) onConfirm(item.id);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide flex items-center gap-2">
             <Ban size={16} /> Confirm Cancellation
          </h3>
          <button onClick={onClose} className="text-red-300 hover:text-red-800"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="p-6">
            <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Ban size={24} />
                </div>
                <h4 className="font-bold text-gray-900">{item.provider}</h4>
                <p className="text-xs text-gray-500 mt-1">Provider has informed that maintenance is cancelled.</p>
            </div>

            {/* SOP Checklist */}
            <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2">
                    <FileText size={14} /> SOP Checklist <span className="text-red-500">*</span>
                </h5>
                <div className="space-y-2">
                    
                    {/* Step 1 */}
                    <div 
                        onClick={() => toggleCheck('deleteBo')}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${checklist.deleteBo ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'}`}
                    >
                        <div className={`mt-0.5 ${checklist.deleteBo ? 'text-red-600' : 'text-gray-300'}`}>
                            {checklist.deleteBo ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                        <span className="text-xs"><strong>Delete</strong> the BO8.2 announcement immediately.</span>
                    </div>

                    {/* Step 2 */}
                    <div 
                        onClick={() => toggleCheck('updateRedmine')}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${checklist.updateRedmine ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'}`}
                    >
                        <div className={`mt-0.5 ${checklist.updateRedmine ? 'text-red-600' : 'text-gray-300'}`}>
                            {checklist.updateRedmine ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                        <span className="text-xs">Update <strong>Redmine (Note 4)</strong> (Mark as Cancelled).</span>
                    </div>

                    {/* Step 3 */}
                    <div 
                        onClick={() => toggleCheck('updateSchedule')}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${checklist.updateSchedule ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'}`}
                    >
                        <div className={`mt-0.5 ${checklist.updateSchedule ? 'text-red-600' : 'text-gray-300'}`}>
                            {checklist.updateSchedule ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                        <span className="text-xs">Update Maintenance Schedule & Close Case.</span>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button 
                    onClick={handleConfirm}
                    disabled={loading || !isSopComplete}
                    className={`flex-1 py-2.5 text-xs font-bold text-white rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${
                        isSopComplete 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Approve Cancellation'}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default CancellationModal;