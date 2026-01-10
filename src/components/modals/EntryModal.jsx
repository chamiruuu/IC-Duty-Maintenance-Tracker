import React, { useEffect } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { X, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react';
import CopyButton from '../CopyButton';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PROVIDERS = [
  "C-Sports", "SA Gaming", "Evolution", "PP Casino", "SBO", "Sexy Casino", 
  "WM", "DG Casino", "AE Sexy", "Venus", "SV388"
];

const EntryModal = ({ 
  isOpen, onClose, formData, setFormData, handleConfirm, loading, editingId, errors, setErrors, existingMaintenances 
}) => {
  
  useEffect(() => {
    if(isOpen) setErrors({});
  }, [isOpen, setErrors]);

  if (!isOpen) return null;

  const isCancelled = formData.type === 'Cancelled';

  const validateAndConfirm = () => {
    const newErrors = {};
    let hasError = false;

    // 1. Required Checks
    if (!formData.provider) { newErrors.provider = true; hasError = true; }
    
    // Redmine is NOT required for Cancelled
    if (!isCancelled && !formData.redmineLink) { newErrors.redmineLink = true; hasError = true; }
    
    if (!formData.startTime) { newErrors.startTime = true; hasError = true; }
    
    // End Time Checks
    if (!formData.isUntilFurtherNotice && !isCancelled && !formData.endTime) { 
        newErrors.endTime = true; 
        hasError = true; 
    }

    // 2. Duplicate Checks
    if (existingMaintenances && !hasError && !editingId) {
        const startDay = dayjs(formData.startTime).format('YYYY-MM-DD');
        const newTicket = formData.redmineLink ? formData.redmineLink.replace(/\D/g, '') : ''; 

        const otherMaintenances = existingMaintenances.filter(m => m.id !== editingId);

        const duplicateProvider = otherMaintenances.some(m => {
            const mDay = dayjs(m.start_time).format('YYYY-MM-DD');
            return (m.provider === formData.provider) && (mDay === startDay);
        });

        if (duplicateProvider) {
            newErrors.providerDuplicate = true;
            hasError = true;
        }

        // Only check ticket duplicate if it's not cancelled (since cancelled has no ticket)
        if (!isCancelled && newTicket.length > 0) {
            const duplicateTicket = otherMaintenances.some(m => {
                const mTicket = m.redmine_ticket ? m.redmine_ticket.toString() : '';
                return mTicket === newTicket;
            });

            if (duplicateTicket) {
                newErrors.redmineDuplicate = true;
                hasError = true;
            }
        }
    }

    if (hasError) {
        setErrors(newErrors);
        return;
    }

    // 3. Prepare Data
    let startString;
    if (isCancelled) {
        startString = dayjs(formData.startTime).format('YYYY-MM-DD 00:00:00');
    } else {
        startString = dayjs(formData.startTime).format('YYYY-MM-DD HH:mm:ss');
    }
    const zonedStart = dayjs.tz(startString, "Asia/Shanghai");
    
    let zonedEnd = null;
    if (!formData.isUntilFurtherNotice && !isCancelled && formData.endTime) {
        const endString = dayjs(formData.endTime).format('YYYY-MM-DD HH:mm:ss');
        zonedEnd = dayjs.tz(endString, "Asia/Shanghai");
    }

    handleConfirm(zonedStart, zonedEnd);
  };

  const getPreviewId = (url) => {
    if (!url) return '';
    const digits = url.replace(/\D/g, '');
    return digits ? `CS-${digits}` : '';
  };

  const generateScript = (part) => {
    const { provider, type, startTime, endTime, isUntilFurtherNotice } = formData;
    
    // --- EMPTY SCRIPT IF CANCELLED OR NOT FILLED ---
    if (type === 'Cancelled') return "";
    if (!provider || !startTime) return ""; // Wait for input
    
    const dStart = startTime.format('YYYY-MM-DD');
    const tStart = startTime.format('HH:mm');
    const tEnd = endTime ? endTime.format('HH:mm') : '';

    if (type === 'Scheduled') {
      if (!isUntilFurtherNotice) {
        if (part === 'title') return `【${provider}】scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
        return `Hello there, \nPlease be informed that 【${provider}】 scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8) , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
      } else {
        if (part === 'title') return `【${provider}】scheduled to have system maintenance on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.`;
        return `Hello there\nPlease be informed that【${provider}】scheduled to have system maintenance on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      }
    } else { 
      // Urgent
      if (!isUntilFurtherNotice) {
        if (part === 'title') return `【${provider}】【Urgent Maintenance】on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
        return `Hello there\nPlease be informed that【${provider}】 is going urgent maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8) , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      } else {
        if (part === 'title') return `【${provider}】【Urgent Maintenance】until further notice (from ${dStart} ${tStart})`;
        return `Hello there\nPlease be informed that【${provider}】 is going urgent maintenance until further notice , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      }
    }
  };

  const inputStyle = (isError) => `w-full bg-white border text-gray-900 text-sm rounded-sm px-3 py-2 outline-none transition-all ${isError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{editingId ? 'Edit Maintenance' : 'New Maintenance Entry'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-6 space-y-5 border-r border-gray-100 overflow-y-auto">
            
            {/* Provider */}
            <div>
              <div className="flex justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">Provider *</label>
                  {errors.providerDuplicate && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> Already exists for this date</span>}
              </div>
              <select 
                className={inputStyle(errors.provider || errors.providerDuplicate)}
                value={formData.provider}
                onChange={(e) => { setFormData({...formData, provider: e.target.value}); setErrors({...errors, provider: false, providerDuplicate: false}); }}
              >
                <option value="" disabled>Select Provider...</option>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Redmine - HIDDEN IF CANCELLED */}
            {!isCancelled && (
            <div>
              <div className="flex justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">Redmine Link *</label>
                  {errors.redmineDuplicate ? (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> Ticket number already used</span>
                  ) : (
                      <span className="text-indigo-600 font-mono text-xs">{getPreviewId(formData.redmineLink)}</span>
                  )}
              </div>
              <div className="relative">
                  <input 
                    className={`${inputStyle(errors.redmineLink || errors.redmineDuplicate)} pl-8`} 
                    placeholder="Paste URL..." 
                    value={formData.redmineLink} 
                    onChange={(e) => { setFormData({...formData, redmineLink: e.target.value}); setErrors({...errors, redmineLink: false, redmineDuplicate: false}); }} 
                  />
                  <LinkIcon size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>
            </div>
            )}

            {/* TYPE SELECTION */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                   <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                   <select 
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" 
                        value={formData.type} 
                        onChange={(e) => {
                            // If switching TO Cancelled, clear redmine/end time errors
                            const newType = e.target.value;
                            setFormData({...formData, type: newType});
                            if(newType === 'Cancelled') setErrors({});
                        }}
                   >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Cancelled">Cancelled</option>
                   </select>
               </div>
               <div className="flex items-end pb-2">
                   <label className={`flex items-center gap-2 cursor-pointer ${formData.type === 'Cancelled' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                       <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 rounded-sm border-gray-300 text-black focus:ring-black" 
                            checked={formData.isUntilFurtherNotice} 
                            disabled={formData.type === 'Cancelled'}
                            onChange={(e) => { setFormData({...formData, isUntilFurtherNotice: e.target.checked}); if(e.target.checked) setErrors({...errors, endTime: false}); }} 
                        />
                        <span className="text-xs font-medium text-gray-700">Until Further Notice</span>
                   </label>
               </div>
            </div>

            {/* TIME INPUTS: Conditionally Rendered */}
            {isCancelled ? (
                // CANCELLED MODE: Only Date, No Time
                <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-500">Date of Cancellation *</label>
                    <DatePicker
                        value={formData.startTime}
                        onChange={(newValue) => { setFormData(prev => ({ ...prev, startTime: newValue })); setErrors({...errors, startTime: false, providerDuplicate: false}); }}
                        format="YYYY-MM-DD"
                        slotProps={{ textField: { size: 'small', className: errors.startTime ? 'bg-red-50' : '', error: !!errors.startTime, fullWidth: true } }}
                    />
                </div>
            ) : (
                // NORMAL MODE: Start & End Time
                <>
                    <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-500">Start Time (UTC+8) *</label>
                    <div className="grid grid-cols-2 gap-2">
                        <DatePicker
                        value={formData.startTime}
                        onChange={(newValue) => { setFormData(prev => ({ ...prev, startTime: newValue })); setErrors({...errors, startTime: false, providerDuplicate: false}); }}
                        format="YYYY-MM-DD"
                        slotProps={{ textField: { size: 'small', className: errors.startTime ? 'bg-red-50' : '', error: !!errors.startTime } }}
                        />
                        <TimePicker
                        value={formData.startTime}
                        onChange={(newValue) => { setFormData(prev => ({ ...prev, startTime: newValue })); setErrors({...errors, startTime: false}); }}
                        ampm={false}
                        slotProps={{ textField: { size: 'small', className: errors.startTime ? 'bg-red-50' : '', error: !!errors.startTime } }}
                        />
                    </div>
                    </div>

                    <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-500">End Time (UTC+8) *</label>
                    <div className="grid grid-cols-2 gap-2">
                        <DatePicker
                        value={formData.endTime}
                        onChange={(newValue) => { setFormData(prev => ({ ...prev, endTime: newValue })); setErrors({...errors, endTime: false}); }}
                        disabled={formData.isUntilFurtherNotice}
                        format="YYYY-MM-DD"
                        slotProps={{ textField: { size: 'small', className: errors.endTime ? 'bg-red-50' : '', error: !!errors.endTime } }}
                        />
                        <TimePicker
                        value={formData.endTime}
                        onChange={(newValue) => { setFormData(prev => ({ ...prev, endTime: newValue })); setErrors({...errors, endTime: false}); }}
                        disabled={formData.isUntilFurtherNotice}
                        ampm={false}
                        slotProps={{ textField: { size: 'small', className: errors.endTime ? 'bg-red-50' : '', error: !!errors.endTime } }}
                        />
                    </div>
                    </div>
                </>
            )}

          </div>

          <div className="w-1/2 bg-gray-50 p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generated Script</span><span className="text-[10px] font-mono text-gray-400">READ-ONLY</span></div>
              <div className="group relative"><div className="flex justify-between items-end mb-1"><label className="text-[10px] font-semibold text-gray-400">TITLE</label><CopyButton text={generateScript('title')} /></div><div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 break-words h-12">{generateScript('title')}</div></div>
              <div className="group relative flex-1"><div className="flex justify-between items-end mb-1"><label className="text-[10px] font-semibold text-gray-400">BODY</label><CopyButton text={generateScript('body')} /></div><div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap h-full">{generateScript('body')}</div></div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition-colors">Cancel</button>
          <button onClick={validateAndConfirm} disabled={loading} className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-sm shadow-sm transition-colors flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : (editingId ? 'Update Entry' : 'Confirm Entry')}</button>
        </div>

      </div>
    </div>
  );
};

export default EntryModal;