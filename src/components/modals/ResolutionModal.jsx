import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Loader2, AlertTriangle, FileText, Send, Check, Lock } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import CopyButton from '../CopyButton';

dayjs.extend(utc);
dayjs.extend(timezone);

const ResolutionModal = ({ isOpen, onClose, item, onExtend, onComplete, loading, initialMode = 'select' }) => {
  const [mode, setMode] = useState('select'); 
  const [extensionType, setExtensionType] = useState('time'); 
  const [newEndTime, setNewEndTime] = useState(null);
  
  // --- LATE EXTENSION LOGIC ---
  // If current time is within 5 minutes of End Time (or passed it), it's a "Late Extension"
  const now = dayjs();
  const endTime = item ? dayjs(item.end_time) : dayjs();
  const minutesRemaining = endTime.diff(now, 'minute');
  const isLateExtension = minutesRemaining <= 5;

  const [checklist, setChecklist] = useState({
    manualClose: false, // New check for Late Extensions
    boUpdate: false,
    notifyMerchant: false,
    internalNotify: false,
    redmineUpdate: false
  });

  const hasStarted = () => {
      if (!item || !item.start_time) return true; 
      return dayjs().isAfter(dayjs(item.start_time));
  };

  useEffect(() => {
    if (isOpen && item) {
      setMode(initialMode);
      setExtensionType('time');
      setNewEndTime(dayjs(item.end_time).add(1, 'hour'));
      // Reset checks
      setChecklist({ 
          manualClose: false, 
          boUpdate: false, 
          notifyMerchant: false, 
          internalNotify: false, 
          redmineUpdate: false 
      });
    }
  }, [isOpen, item, initialMode]);

  if (!isOpen || !item) return null;

  // --- VALIDATION: Require 'manualClose' ONLY if it is a Late Extension ---
  const isSopComplete = 
      (!isLateExtension || checklist.manualClose) && // Conditional Check
      checklist.boUpdate && 
      checklist.internalNotify && // Internal first (step 2)
      checklist.notifyMerchant && // Merchant second (step 3)
      checklist.redmineUpdate;

  const getManualCloseMsg = () => {
      return `Urgent: Maintenance for ${item.provider} has been extended at the last minute. Please help to manually close the game immediately to prevent auto-open. Thank You.`;
  };

  const getInternalGroupMsg = () => `Maintenance time update for ${item.provider}, BO8.2 announcement has been updated.`;
  
  // --- REMOVED getAnnouncementTitle FUNCTION HERE ---

  const getAnnouncementBody = () => {
    const timeStr = extensionType === 'notice' ? "until further notice" : `${newEndTime?.format('YYYY-MM-DD HH:mm')} (GMT+8)`;
    return `Hello there,\n\nPlease be informed that 【${item.provider}】 maintenance has been extended ${timeStr}.\nWe apologize for the inconvenience caused.\n\nThank you.`;
  };

  const handleConfirmExtension = () => {
    if (extensionType === 'time' && !newEndTime) return;
    if (!isSopComplete) return; 
    onExtend(item.id, newEndTime, extensionType === 'notice');
  };

  const toggleCheck = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const renderStep = (key, number, text, icon = null, isCritical = false, copyText = null) => {
    const isChecked = checklist[key];
    const baseBorder = isCritical ? 'border-red-100 hover:border-red-300' : 'border-gray-100 hover:border-blue-200';
    const checkedBorder = isCritical ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50/80';
    const checkedIconBg = isCritical ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white';
    
    return (
        <div 
            onClick={() => toggleCheck(key)}
            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group select-none ${
                isChecked 
                ? `${checkedBorder} shadow-md transform scale-[1.01]` 
                : `bg-white ${baseBorder} hover:shadow-lg hover:-translate-y-0.5`
            }`}
        >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                isChecked 
                ? `${checkedIconBg} shadow-lg scale-110 rotate-0` 
                : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 rotate-0'
            }`}>
                {isChecked ? <Check size={20} strokeWidth={3} /> : (icon || <span className="text-sm font-bold font-mono">{number}</span>)}
            </div>
            
            <div className={`flex-1 transition-colors duration-300 ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-xs leading-relaxed font-medium block">{text}</span>
                    {/* Render Copy Button if copyText is provided */}
                    {copyText && (
                        <div onClick={(e) => e.stopPropagation()} title="Copy Message">
                            <CopyButton text={copyText} size={14} className="text-gray-400 hover:text-black bg-white border border-gray-200 p-1 rounded-md shadow-sm" />
                        </div>
                    )}
                </div>
            </div>

            {isChecked && (
                <div className="absolute top-2 right-2 opacity-20 animate-in fade-in zoom-in">
                    <CheckCircle2 size={16} className={isCritical ? 'text-red-600' : 'text-emerald-500'} />
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
             <Clock size={16} className="text-red-500" /> Maintenance Resolution
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
            <div className="mb-6 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                    <h4 className="font-bold text-lg text-gray-900">{item.provider}</h4>
                    <p className="text-xs text-gray-500">Scheduled End: {dayjs(item.end_time).format('YYYY-MM-DD HH:mm')}</p>
                </div>
                <div className="text-right">
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">Action Required</span>
                    {mode === 'extend' && isLateExtension && (
                        <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center justify-end gap-1">
                            <AlertTriangle size={10} /> Late Extension (&lt;5m)
                        </p>
                    )}
                </div>
            </div>

            {mode === 'select' && (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onComplete} className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-emerald-100 bg-emerald-50/50 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all group">
                        <div className="w-14 h-14 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 size={28} /></div>
                        <div className="text-center"><span className="block font-bold text-emerald-900 text-lg">Completed</span><span className="text-xs text-emerald-600">Game is open & transfers working</span></div>
                    </button>

                    {hasStarted() ? (
                        <button onClick={() => setMode('extend')} className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-blue-100 bg-blue-50/50 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all group">
                            <div className="w-14 h-14 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={28} /></div>
                            <div className="text-center"><span className="block font-bold text-blue-900 text-lg">Extend Time</span><span className="text-xs text-blue-600">Provider needs more time</span></div>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-gray-100 bg-gray-50 rounded-xl opacity-60 cursor-not-allowed">
                             <Clock size={28} className="text-gray-400" />
                             <div className="text-center">
                                <span className="block font-bold text-gray-500 text-lg">Extend Time</span>
                                <span className="text-xs text-gray-400">Not started yet. Use Edit.</span>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {mode === 'extend' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Extension Type</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setExtensionType('time')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${extensionType === 'time' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>New End Time</button>
                                <button onClick={() => setExtensionType('notice')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${extensionType === 'notice' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Until Further Notice</button>
                            </div>
                        </div>
                        {extensionType === 'time' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Estimated End (UTC+8)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <DatePicker value={newEndTime} onChange={(val) => setNewEndTime(val)} slotProps={{ textField: { size: 'small' } }} />
                                    <TimePicker value={newEndTime} onChange={(val) => setNewEndTime(val)} ampm={false} slotProps={{ textField: { size: 'small' } }} />
                                </div>
                            </div>
                        )}
                        {extensionType === 'notice' && (
                            <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <span className="text-xs font-medium text-gray-500 flex items-center gap-2"><AlertTriangle size={14} /> Will be marked "Until Notice"</span>
                            </div>
                        )}
                    </div>
                    <hr className="border-gray-100" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2"><FileText size={14} /> SOP Checklist <span className="text-red-500">*</span></h5>
                            <div className="space-y-2">
                                {/* Late Extension Check - Removed copyText from here */}
                                {isLateExtension && renderStep('manualClose', '!', <><strong>CRITICAL: Manual Game Close</strong><br/>Late extension. Manually close game to prevent auto-open.</>, <Lock size={16} />, true)}

                                {/* Reordered Steps */}
                                {renderStep('boUpdate', '1', <>Update <strong>BO8.2</strong> Announcement.<br/>{extensionType === 'notice' ? 'Check "Until Further Notice".' : 'Update the "End Time".'}</>)}
                                {renderStep('internalNotify', '2', <>Notify <strong>IP Internal Group</strong>.<br/>(Use copy text on right)</>)}
                                {renderStep('notifyMerchant', '3', <>Notify Merchant via Robot's BO Select:<br/><strong>【IC-Maintenance&Promo of providers】</strong></>)}
                                {renderStep('redmineUpdate', '4', <>Update <strong>Redmine & Sync BO8.7</strong>.</>)}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2"><Send size={14} /> Messages to Copy</h5>
                            
                            {/* --- MOVED: MANUAL CLOSE MSG (Only shows if Late Extension) --- */}
                            {isLateExtension && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-red-500 animate-pulse">MANUAL CLOSE MSG (CRITICAL)</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-red-50 border border-red-200 rounded p-2 text-xs font-mono text-red-800 truncate">{getManualCloseMsg()}</div>
                                        <CopyButton text={getManualCloseMsg()} />
                                    </div>
                                </div>
                            )}

                            {/* 1. INTERNAL GROUP MESSAGE */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400">FOR INTERNAL GROUP</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 truncate">{getInternalGroupMsg()}</div>
                                    <CopyButton text={getInternalGroupMsg()} />
                                </div>
                            </div>

                            {/* 2. ANNOUNCEMENT BODY */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400">ANNOUNCEMENT BODY</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 h-16 overflow-y-auto whitespace-pre-wrap">{getAnnouncementBody()}</div>
                                    <CopyButton text={getAnnouncementBody()} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button 
                            onClick={() => initialMode === 'extend' ? onClose() : setMode('select')} 
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                            {initialMode === 'extend' ? 'Cancel' : 'Back'}
                        </button>
                        <button onClick={handleConfirmExtension} disabled={loading || !isSopComplete} className={`flex-1 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${isSopComplete ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : (isSopComplete ? 'Confirm Extension & Update System' : 'Complete SOP Checklist to Proceed')}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResolutionModal;