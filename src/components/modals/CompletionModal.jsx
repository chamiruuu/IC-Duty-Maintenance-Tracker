import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, LogIn, Clock, ArrowRight, Check, Copy, Send, CalendarDays, CheckSquare, Square, AlertTriangle, Users } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import CopyButton from '../CopyButton';

dayjs.extend(utc);
dayjs.extend(timezone);

const CompletionModal = ({ 
  isOpen, item, onClose, onConfirm, sopChecks, setSopChecks 
}) => {
  const [completionTime, setCompletionTime] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const nowChina = dayjs().tz("Asia/Shanghai");
      const visualNow = dayjs(nowChina.format('YYYY-MM-DD HH:mm:ss'));
      setCompletionTime(visualNow);
      
      // Reset checks based on type
      setSopChecks({ 
          gameTest: false, 
          robotNotify: false, // Only for Urgent/Notice
          documentation: false 
      });
    }
  }, [isOpen, setSopChecks]);

  if (!isOpen || !item) return null;

  // --- LOGIC: DETECT TYPE ---
  const isUrgent = item.type && item.type.toLowerCase().includes('urgent');
  const isNotice = item.is_until_further_notice;
  const showRobotNotify = isUrgent || isNotice;

  // --- 1. SCRIPT GENERATION ---
  const getFinishContent = () => {
    const typeText = isUrgent ? 'urgent maintenance' : 'scheduled maintenance';
    return `Hello there, \nPlease be informed that 【${item.provider}】 ${typeText} has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
  };

  // --- 2. CONFIRM HANDLER ---
  const handleConfirm = () => {
    if (completionTime) {
        const timeString = completionTime.format('YYYY-MM-DD HH:mm:ss');
        const finalTime = dayjs.tz(timeString, "Asia/Shanghai");
        onConfirm(finalTime);
    }
  };

  const getRedmineDisplayId = (ticketNum) => {
    if (!ticketNum) return '-';
    return `CS-${ticketNum.toString().replace(/\D/g, '')}`;
  };

  const toggleCheck = (key) => setSopChecks(prev => ({ ...prev, [key]: !prev[key] }));

  // Helper for SOP Items
  const renderCheckItem = (key, title, desc, icon) => {
      const isChecked = sopChecks[key];
      return (
        <button 
            onClick={() => toggleCheck(key)}
            className={`w-full group flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${isChecked ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
        >
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                {isChecked ? <Check size={16} strokeWidth={3} /> : icon}
            </div>
            <div>
                <span className={`block text-sm font-bold ${isChecked ? 'text-emerald-900' : 'text-gray-900'}`}>{title}</span>
                <span className="text-xs text-gray-500 mt-0.5 block leading-relaxed">{desc}</span>
            </div>
        </button>
      );
  };

  // Validation
  const canConfirm = sopChecks.gameTest && sopChecks.documentation && (!showRobotNotify || sopChecks.robotNotify);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className={`px-6 py-5 border-b border-gray-200 shrink-0 ${isUrgent ? 'bg-amber-50' : 'bg-gray-50'}`}>
             <div className="flex items-start justify-between">
                <div>
                   <h3 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isUrgent ? 'text-amber-800' : 'text-gray-900'}`}>
                     {isUrgent ? <AlertTriangle size={20} className="text-amber-600"/> : <ShieldCheck className="text-emerald-600" size={20} />} 
                     {isUrgent ? 'Urgent Completion' : 'Verify Completion'}
                   </h3>
                   <p className="text-xs text-gray-500 mt-1">
                      Finalizing maintenance for <span className="font-bold text-gray-900">{item.provider}</span>.
                   </p>
                </div>
                <div className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-500">
                   {getRedmineDisplayId(item.redmine_ticket)}
                </div>
             </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-6">
             
             {/* 1. Time Selection */}
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <Clock size={10} /> Set Completion Time (UTC+8)
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <DatePicker 
                        value={completionTime} 
                        onChange={(val) => setCompletionTime(val)} 
                        slotProps={{ textField: { size: 'small', className: 'bg-white' } }} 
                    />
                    <TimePicker 
                        value={completionTime} 
                        onChange={(val) => setCompletionTime(val)} 
                        ampm={false}
                        slotProps={{ textField: { size: 'small', className: 'bg-white' } }} 
                    />
                </div>
             </div>

             {/* 2. SOP Action Cards */}
             <div className="space-y-3">
                 <h5 className="text-xs font-bold text-gray-900 uppercase">SOP Checklist</h5>
                 
                 {/* Step 1: Game & Transfer Test (Combined) */}
                 {renderCheckItem(
                     'gameTest', 
                     'Game & Transfer Test', 
                     'Manual open successful. Game loading and transfers are normal on WEB.', 
                     <Activity size={16} />
                 )}

                 {/* Step 2: Robot Notify (Conditional) */}
                 {showRobotNotify && renderCheckItem(
                     'robotNotify', 
                     'Notify Merchants (Robot BO)', 
                     'Send "Maintenance Completed" announcement to 【IC-Maintenance&Promo】 group.', 
                     <Users size={16} />
                 )}

                 {/* Step 3: Documentation */}
                 {renderCheckItem(
                     'documentation', 
                     'Update BO8.2 & Redmine', 
                     isUrgent 
                        ? 'Add "Completed" to BO title. Update Redmine Note. Assign to Carmen.' 
                        : 'Add "Completed" to BO title. Update Redmine Note & Schedule.',
                     <CheckSquare size={16} />
                 )}
             </div>

             {/* 3. Script Section */}
             <div className="space-y-2 pt-2">
                <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2">
                    <Send size={12} /> FINISH CONTENT
                </h5>
                <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 h-24 overflow-y-auto whitespace-pre-wrap">
                        {getFinishContent()}
                    </div>
                    <CopyButton text={getFinishContent()} />
                </div>
             </div>

          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col gap-4 shrink-0">
             <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
                <Clock size={10} />
                <span>Completion timestamp: <strong>{completionTime ? completionTime.format('HH:mm:ss') : '--:--'} (UTC+8)</strong></span>
             </div>
             <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button 
                   onClick={handleConfirm} 
                   disabled={!canConfirm}
                   className="flex-[2] py-3 text-xs font-bold text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2"
                >
                   Confirm Completion <ArrowRight size={14} />
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default CompletionModal;