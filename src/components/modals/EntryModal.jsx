import React, { useEffect, useState, useRef } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { X, Link as LinkIcon, Loader2, AlertCircle, ChevronDown, Search, Send, Check } from 'lucide-react';
import CopyButton from '../CopyButton';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PROVIDERS = [
  "C-Sports", "I-Sports", "OPUS Sport", "SBO", "BTi", "IMSB", "WBet",
  "PA Casino", "ALLBET", "BG Casino", "DG Casino", "GP Casino", "Opus Casino",
  "OG Plus", "GClub Live", "Sexy Casino", "Evolution Gaming", "SA Gaming",
  "WM", "PP Casino", "Yeebet", "PT Casino", "MG Live", "Spadegaming",
  "CQ9 Slots", "HBS", "MG+ Slot", "PG Soft", "Pragmatic Play", "PP Streaming",
  "PT Slots", "YGG", "Joker", "Playstar", "BNG", "AWC", "DC", "SKYWIND",
  "NETENT", "FastSpin", "JILI", "CG", "Next Spin", "RSG", "NoLimit City",
  "OG Slots", "Relax gaming", "Hacksaw", "YGR", "AdvantPlay", "Octoplay",
  "FatPanda", "2J", "GGSoft", "SABA Number Game", "QQKENO", "QQThai",
  "QQViet", "QQ4D", "PokerQ"
];

const EntryModal = ({ 
  isOpen, onClose, formData, setFormData, handleConfirm, loading, editingId, errors, setErrors, existingMaintenances 
}) => {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const [showRescheduleSop, setShowRescheduleSop] = useState(false);
  const [rescheduleChecklist, setRescheduleChecklist] = useState({ internal: false, boSync: false });
  
  // Store initial times to detect changes. Using Strings for easier comparison.
  const [initialTimes, setInitialTimes] = useState({ start: null, end: null });

  // --- FIX: SEPARATED INITIALIZATION EFFECT ---
  // This runs ONLY when the modal opens or the editing ID changes.
  // It does NOT run when formData updates (typing), preventing reset loops.
  useEffect(() => {
    if (isOpen) {
        setSearchTerm(formData.provider || '');
        setErrors({});
        setShowRescheduleSop(false);
        setRescheduleChecklist({ internal: false, boSync: false });
        
        // Capture specific initial times if editing
        if (editingId) {
            // Using format() instead of ISO to ignore milliseconds issues
            const fmt = 'YYYY-MM-DD HH:mm';
            setInitialTimes({ 
                start: formData.startTime ? dayjs(formData.startTime).format(fmt) : null,
                end: formData.endTime ? dayjs(formData.endTime).format(fmt) : null
            });
        } else {
            setInitialTimes({ start: null, end: null });
        }
    }
  }, [isOpen, editingId]); // Removed formData from dependencies
  // ----------------------------------------------

  // --- FIX: ROBUST CHANGE DETECTION ---
  useEffect(() => {
    if (editingId && initialTimes.start) {
        const fmt = 'YYYY-MM-DD HH:mm';
        const currentStart = formData.startTime ? dayjs(formData.startTime).format(fmt) : null;
        const currentEnd = formData.endTime ? dayjs(formData.endTime).format(fmt) : null;
        
        // Check if times are different (String comparison)
        const isTimeChanged = (currentStart !== initialTimes.start) || (currentEnd !== initialTimes.end);
        
        // Check if it is a FUTURE event (Not started yet)
        // Ensure we compare against the INITIAL time to see if the original plan was future
        const isFuture = dayjs().isBefore(dayjs(initialTimes.start));

        if (isTimeChanged && isFuture) {
            setShowRescheduleSop(true);
        } else {
            setShowRescheduleSop(false);
        }
    }
  }, [formData.startTime, formData.endTime, editingId, initialTimes]);
  // ------------------------------------

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isCancelled = formData.type === 'Cancelled';
  const filteredProviders = PROVIDERS.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleProviderSelect = (provider) => {
      setFormData({ ...formData, provider: provider });
      setSearchTerm(provider);
      setIsDropdownOpen(false);
      setErrors({ ...errors, provider: false, providerDuplicate: false, providerInvalid: false });
  };

  const validateAndConfirm = () => {
    // 1. Check SOP for Reschedules
    if (showRescheduleSop) {
        if (!rescheduleChecklist.internal || !rescheduleChecklist.boSync) return;
    }

    const newErrors = {};
    let hasError = false;

    // 2. Standard Validations
    if (!formData.provider) { newErrors.provider = true; hasError = true; } 
    else if (!PROVIDERS.includes(formData.provider)) { newErrors.providerInvalid = true; hasError = true; }
    
    if (!isCancelled && !formData.redmineLink) { newErrors.redmineLink = true; hasError = true; }
    if (!formData.startTime) { newErrors.startTime = true; hasError = true; }
    if (!formData.isUntilFurtherNotice && !isCancelled && !formData.endTime) { newErrors.endTime = true; hasError = true; }

    // 3. DUPLICATE CHECKER (Fixed for Timezones)
    if (existingMaintenances && !hasError && !editingId) {
        // FIX: Force the form date to Shanghai Timezone YYYY-MM-DD
        const formDay = dayjs(formData.startTime).tz("Asia/Shanghai").format('YYYY-MM-DD');
        
        const newTicket = formData.redmineLink ? formData.redmineLink.replace(/\D/g, '') : ''; 
        const otherMaintenances = existingMaintenances.filter(m => m.id !== editingId);

        const duplicateProvider = otherMaintenances.some(m => {
            // FIX: Convert DB time to Shanghai Timezone YYYY-MM-DD for comparison
            const mDay = dayjs(m.start_time).tz("Asia/Shanghai").format('YYYY-MM-DD');
            
            // Returns true if Provider matches AND Date matches
            return (m.provider === formData.provider) && (mDay === formDay);
        });

        if (duplicateProvider) { 
            newErrors.providerDuplicate = true; 
            hasError = true; 
        }

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

    if (hasError) { setErrors(newErrors); return; }

    // 4. Prepare Data for Save
    let startString;
    if (isCancelled) { 
        // For cancelled items, lock to 00:00 Shanghai time
        startString = dayjs(formData.startTime).tz("Asia/Shanghai").format('YYYY-MM-DD 00:00:00'); 
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

  const getPreviewId = (url) => { if (!url) return ''; const digits = url.replace(/\D/g, ''); return digits ? `CS-${digits}` : ''; };

  const generateScript = (part) => {
    const { provider, type, startTime, endTime, isUntilFurtherNotice } = formData;
    if (type === 'Cancelled') {
      if (part === 'title') return `${provider} Cancel Maintenance`;
      if (!startTime) return "";
      return `${startTime.format('YYYY/MM/DD')}`;
    }
    if (!provider || !startTime) return ""; 
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
      if (!isUntilFurtherNotice) {
        if (part === 'title') return `【${provider}】【Urgent Maintenance】on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
        return `Hello there\nPlease be informed that【${provider}】 is going urgent maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8) , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      } else {
        if (part === 'title') return `【${provider}】【Urgent Maintenance】until further notice (from ${dStart} ${tStart})`;
        return `Hello there\nPlease be informed that【${provider}】 is going urgent maintenance until further notice , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      }
    }
  };

  const getInternalUpdateMsg = () => `Maintenance time update for ${formData.provider}, BO8.2 announcement has been updated.`;
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
            
            <div ref={dropdownRef} className="relative">
              <div className="flex justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">Provider *</label>
                  {errors.providerDuplicate && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> Already exists</span>}
                  {errors.providerInvalid && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> Invalid Provider</span>}
              </div>
              <div className="relative">
                  <input
                    type="text"
                    className={`${inputStyle(errors.provider || errors.providerDuplicate || errors.providerInvalid)} pr-8`}
                    placeholder="Search or Select Provider..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setFormData({ ...formData, provider: e.target.value });
                        if(!isDropdownOpen) setIsDropdownOpen(true);
                        setErrors({ ...errors, provider: false, providerDuplicate: false, providerInvalid: false });
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  <div className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none">
                      {isDropdownOpen ? <Search size={14} /> : <ChevronDown size={14} />}
                  </div>
              </div>
              {isDropdownOpen && (
                  <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto">
                      {filteredProviders.length > 0 ? (
                          filteredProviders.map((p) => (
                              <li key={p} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium" onClick={() => handleProviderSelect(p)}>{p}</li>
                          ))
                      ) : (
                          <li className="px-3 py-2 text-sm text-gray-400 italic">No matches found</li>
                      )}
                  </ul>
              )}
            </div>

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
                  <input className={`${inputStyle(errors.redmineLink || errors.redmineDuplicate)} pl-8`} placeholder="Paste URL..." value={formData.redmineLink} onChange={(e) => { setFormData({...formData, redmineLink: e.target.value}); setErrors({...errors, redmineLink: false, redmineDuplicate: false}); }} />
                  <LinkIcon size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div>
                   <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                   <select className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" value={formData.type} onChange={(e) => { const newType = e.target.value; setFormData({...formData, type: newType}); if(newType === 'Cancelled') setErrors({}); }}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Cancelled">Cancelled</option>
                   </select>
               </div>
               <div className="flex items-end pb-2">
                   <label className={`flex items-center gap-2 cursor-pointer ${formData.type === 'Cancelled' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                       <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-gray-300 text-black focus:ring-black" checked={formData.isUntilFurtherNotice} disabled={formData.type === 'Cancelled'} onChange={(e) => { setFormData({...formData, isUntilFurtherNotice: e.target.checked}); if(e.target.checked) setErrors({...errors, endTime: false}); }} />
                       <span className="text-xs font-medium text-gray-700">Until Further Notice</span>
                   </label>
               </div>
            </div>

            {isCancelled ? (
                <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-500">Date of Cancellation *</label>
                    <DatePicker value={formData.startTime} onChange={(newValue) => { setFormData(prev => ({ ...prev, startTime: newValue })); setErrors({...errors, startTime: false, providerDuplicate: false}); }} format="YYYY-MM-DD" slotProps={{ textField: { size: 'small', className: errors.startTime ? 'bg-red-50' : '', error: !!errors.startTime, fullWidth: true } }} />
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 text-gray-500">Start Time (UTC+8) *</label>
                        <DateTimePicker value={formData.startTime} onChange={(newValue) => { setFormData(prev => ({ ...prev, startTime: newValue })); setErrors({...errors, startTime: false, providerDuplicate: false}); }} timeSteps={{ minutes: 1 }} ampm={false} slotProps={{ textField: { size: 'small', fullWidth: true, className: errors.startTime ? 'bg-red-50' : '', error: !!errors.startTime } }} />
                    </div>
                    <div className={formData.isUntilFurtherNotice ? 'opacity-50 pointer-events-none' : ''}>
                        <label className="block text-xs font-semibold mb-1.5 text-gray-500">End Time (UTC+8) *</label>
                        <DateTimePicker value={formData.endTime} onChange={(newValue) => { setFormData(prev => ({ ...prev, endTime: newValue })); setErrors({...errors, endTime: false}); }} disabled={formData.isUntilFurtherNotice} timeSteps={{ minutes: 1 }} ampm={false} slotProps={{ textField: { size: 'small', fullWidth: true, className: errors.endTime ? 'bg-red-50' : '', error: !!errors.endTime } }} />
                    </div>
                </>
            )}
            
            {/* --- REDESIGNED RESCHEDULE SOP CHECKLIST --- */}
            {showRescheduleSop && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
                            <AlertCircle size={16} />
                        </div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Reschedule Protocol
                        </h4>
                    </div>

                    <div className="space-y-3">
                        
                        {/* Item 1: Internal Group */}
                        <div 
                            onClick={() => setRescheduleChecklist(p => ({...p, internal: !p.internal}))}
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${
                                rescheduleChecklist.internal
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-md' 
                                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
                            }`}
                        >
                             <div className="flex items-center gap-4">
                                 {/* Icon */}
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                     rescheduleChecklist.internal 
                                     ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' 
                                     : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                 }`}>
                                     {rescheduleChecklist.internal ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">1</span>}
                                 </div>
                                 
                                 {/* Text */}
                                 <div className="flex-1">
                                     <span className={`block text-xs font-bold transition-colors ${rescheduleChecklist.internal ? 'text-emerald-900' : 'text-gray-700'}`}>Notify Internal Group</span>
                                 </div>
                             </div>

                             {/* Copy Section (Inside the card for better UX) */}
                             <div className="mt-3 pl-12 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                 <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-500 truncate select-all">
                                    {getInternalUpdateMsg()}
                                 </div>
                                 <CopyButton text={getInternalUpdateMsg()} label="COPY" />
                             </div>
                        </div>

                        {/* Item 2: BO Sync */}
                        <div 
                            onClick={() => setRescheduleChecklist(p => ({...p, boSync: !p.boSync}))}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${
                                rescheduleChecklist.boSync
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-md' 
                                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
                            }`}
                        >
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                 rescheduleChecklist.boSync 
                                 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' 
                                 : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                             }`}>
                                 {rescheduleChecklist.boSync ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">2</span>}
                             </div>
                             <span className={`text-xs font-bold transition-colors ${rescheduleChecklist.boSync ? 'text-emerald-900' : 'text-gray-700'}`}>
                                Update BO8.2 & Sync BO8.7
                             </span>
                        </div>

                    </div>
                </div>
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
          <button 
            onClick={validateAndConfirm} 
            disabled={loading || (showRescheduleSop && (!rescheduleChecklist.internal || !rescheduleChecklist.boSync))} 
            className={`px-4 py-2 text-xs font-bold text-white rounded-sm shadow-sm transition-colors flex items-center gap-2 ${
                (showRescheduleSop && (!rescheduleChecklist.internal || !rescheduleChecklist.boSync)) 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : (editingId ? 'Update Entry' : 'Confirm Entry')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EntryModal;