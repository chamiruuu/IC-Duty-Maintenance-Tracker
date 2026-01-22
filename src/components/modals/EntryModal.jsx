import React, { useEffect, useState, useRef } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { X, Link as LinkIcon, Loader2, AlertCircle, ChevronDown, Search, Check, Copy, Info } from 'lucide-react';
import CopyButton from '../CopyButton';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { generateUrgentScript } from '../../lib/scriptGenerator'; 

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
  
  // --- NEW: Local State for Part of the Game ---
  const [isPartGame, setIsPartGame] = useState(false);

  const [showRescheduleSop, setShowRescheduleSop] = useState(false);
  const [rescheduleChecklist, setRescheduleChecklist] = useState({ internal: false, boSync: false });
  
  // Urgent SOP Checklist State
  const [urgentChecks, setUrgentChecks] = useState({ internal: false, bo82: false, redmine: false });

  const [urgentScript, setUrgentScript] = useState({ title: '', startMessage: '' });
  const [initialTimes, setInitialTimes] = useState({ start: null, end: null });

  // --- HELPER: Generate Part of the Game Scripts ---
  const generatePartGameScript = (isUrgentMode) => {
      const { provider, startTime, endTime, isUntilFurtherNotice, affectedGames } = formData;
      if (!provider || !startTime) return { title: '', body: '' };

      const games = (affectedGames || '').split('\n').filter(g => g.trim());
      const isMultiple = games.length > 1;
      const gameName = games[0] ? games[0].trim() : "Game Name";
      
      // If Multiple: "Provider-part of the game", Else: "Provider-GameName"
      const subjectName = isMultiple ? `${provider}-part of the game` : `${provider}-${gameName}`;
      
      const dStart = startTime.format('YYYY-MM-DD');
      const tStart = startTime.format('HH:mm');
      const tEnd = endTime ? endTime.format('HH:mm') : '';
      
      let title = '';
      let body = '';

      if (isUrgentMode) {
          // URGENT SCRIPTS
          if (isUntilFurtherNotice) {
              title = `【${subjectName}】【Urgent Maintenance】until further notice(from ${dStart} ${tStart})`;
              body = `Hello there,\nPlease be informed that【${subjectName}】 is going urgent maintenance until further notice,during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
          } else {
              title = `【${subjectName}】【Urgent Maintenance】on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
              body = `Hello there,\nPlease be informed that【${subjectName}】 is going urgent maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8) , during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
          }
      } else {
          // SCHEDULED SCRIPTS
          if (isUntilFurtherNotice) {
              title = `【${subjectName}】scheduled to have system maintenance on ${dStart}(GMT+8), and the end time will be until further notice.`;
              body = `Hello there,\nPlease be informed that【${subjectName}】scheduled to have system maintenance on ${dStart} ${tStart}(GMT+8), and the end time will be until further notice. During the period,other games can be able to access and the game  lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
          } else {
              title = `【${subjectName}】scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
              body = `Hello there,\nPlease be informed that 【${subjectName}】scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd} (GMT+8), during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
          }
      }

      // Append Game List if Multiple
      if (isMultiple) {
          body += `\nAffected game list :\n\n${games.map(g => `【${g.trim()}】`).join('\n')}`;
      }

      return { title, startMessage: body, body }; 
  };

  // --- LOGIC: Sync formData with UI state ---
  const currentTypeStr = formData.type || 'Scheduled';
  const isUrgent = currentTypeStr.includes('Urgent');
  const isCancelled = currentTypeStr === 'Cancelled';
  
  // Logic to lock the Confirm button if Urgent checks aren't met
  const isUrgentLocked = isUrgent && (!urgentChecks.internal || !urgentChecks.bo82 || !urgentChecks.redmine);

  // Update Urgent Script whenever form data changes
  useEffect(() => {
    if (isUrgent) {
        if (isPartGame) {
             setUrgentScript(generatePartGameScript(true));
        } else {
             const script = generateUrgentScript(formData);
             setUrgentScript(script);
        }
    }
  }, [formData, isPartGame, isUrgent]); 

  useEffect(() => {
    if (isOpen) {
        setSearchTerm(formData.provider || '');
        setErrors({});
        setShowRescheduleSop(false);
        setRescheduleChecklist({ internal: false, boSync: false });
        setUrgentChecks({ internal: false, bo82: false, redmine: false });
        
        // --- INITIALIZE IS_PART_GAME FROM SAVED DATA ---
        const typeStr = formData.type || 'Scheduled';
        const isPg = typeStr.includes('Part of the Game') || !!formData.affectedGames;
        setIsPartGame(isPg);

        if (editingId) {
            const fmt = 'YYYY-MM-DD HH:mm';
            setInitialTimes({ 
                start: formData.startTime ? dayjs(formData.startTime).format(fmt) : null,
                end: formData.endTime ? dayjs(formData.endTime).format(fmt) : null
            });
        } else {
            setInitialTimes({ start: null, end: null });
        }
    }
  }, [isOpen, editingId]); 

  useEffect(() => {
    if (editingId && initialTimes.start) {
        const fmt = 'YYYY-MM-DD HH:mm';
        const currentStart = formData.startTime ? dayjs(formData.startTime).format(fmt) : null;
        const currentEnd = formData.endTime ? dayjs(formData.endTime).format(fmt) : null;
        
        const isTimeChanged = (currentStart !== initialTimes.start) || (currentEnd !== initialTimes.end);
        const isFuture = dayjs().isBefore(dayjs(initialTimes.start));

        if (isTimeChanged && isFuture) {
            setShowRescheduleSop(true);
        } else {
            setShowRescheduleSop(false);
        }
    }
  }, [formData.startTime, formData.endTime, editingId, initialTimes]);

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

  const filteredProviders = PROVIDERS.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleProviderSelect = (provider) => {
      setFormData({ ...formData, provider: provider });
      setSearchTerm(provider);
      setIsDropdownOpen(false);
      setErrors({ ...errors, provider: false, providerDuplicate: false, providerInvalid: false });
  };

  // --- HANDLER: Type Change (Dropdown) ---
  const handleTypeChange = (e) => {
      const newBase = e.target.value; 
      let newTypeStr = newBase;
      
      if (newBase === 'Cancelled') {
          setErrors({});
      } else {
          if (isPartGame) {
              newTypeStr = newBase === 'Urgent' ? 'Part of the Game (Urgent)' : 'Part of the Game';
          }
      }
      setFormData({ ...formData, type: newTypeStr });
  };

  // --- HANDLER: Part of Game Toggle ---
  const handlePartGameChange = (e) => {
      const checked = e.target.checked;
      setIsPartGame(checked);
      
      const baseUrgent = formData.type.includes('Urgent');
      
      if (checked) {
          const newStr = baseUrgent ? 'Part of the Game (Urgent)' : 'Part of the Game';
          setFormData({ ...formData, type: newStr });
      } else {
          const newStr = baseUrgent ? 'Urgent' : 'Scheduled';
          setFormData({ ...formData, type: newStr, isInHouse: false, affectedGames: '' });
      }
  };

  const validateAndConfirm = () => {
    if (showRescheduleSop) {
        if (!rescheduleChecklist.internal || !rescheduleChecklist.boSync) return;
    }
    if (isUrgentLocked) return;

    const newErrors = {};
    let hasError = false;

    if (!formData.provider) { newErrors.provider = true; hasError = true; } 
    else if (!PROVIDERS.includes(formData.provider)) { newErrors.providerInvalid = true; hasError = true; }
    
    if (!isCancelled && !formData.redmineLink) { newErrors.redmineLink = true; hasError = true; }
    if (!formData.startTime) { newErrors.startTime = true; hasError = true; }
    if (!formData.isUntilFurtherNotice && !isCancelled && !formData.endTime) { newErrors.endTime = true; hasError = true; }

    if (isPartGame && !formData.affectedGames?.trim()) {
        newErrors.affectedGames = true; hasError = true;
    }

    if (existingMaintenances && !hasError && !editingId) {
        const formDay = dayjs(formData.startTime).tz("Asia/Shanghai").format('YYYY-MM-DD');
        const newTicket = formData.redmineLink ? formData.redmineLink.replace(/\D/g, '') : ''; 
        const otherMaintenances = existingMaintenances.filter(m => m.id !== editingId);

        const duplicateProvider = otherMaintenances.some(m => {
            const mDay = dayjs(m.start_time).tz("Asia/Shanghai").format('YYYY-MM-DD');
            return (m.provider === formData.provider) && (mDay === formDay);
        });

        if (duplicateProvider && !isUrgent) { 
            newErrors.providerDuplicate = true; 
            hasError = true; 
        }

        if (!isCancelled && newTicket.length > 0) {
            const duplicateTicket = otherMaintenances.some(m => {
                const mTicket = m.redmine_ticket ? m.redmine_ticket.toString() : '';
                return mTicket === newTicket;
            });
            if (duplicateTicket) { newErrors.redmineDuplicate = true; hasError = true; }
        }
    }

    if (hasError) { setErrors(newErrors); return; }

    let startString;
    if (isCancelled) { 
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

  const generateScheduledScript = (part) => {
    const { provider, startTime, endTime, isUntilFurtherNotice, type } = formData;
    if (!provider || !startTime) return ""; 
    
    if (type === 'Cancelled') {
        if (part === 'title') return `${provider} Cancel Maintenance`;
        return startTime.format('YYYY/MM/DD'); 
    }

    if (isPartGame) {
        const scriptData = generatePartGameScript(false); 
        if (part === 'title') return scriptData.title;
        return scriptData.body;
    }

    const dStart = startTime.format('YYYY-MM-DD');
    const tStart = startTime.format('HH:mm');
    const tEnd = endTime ? endTime.format('HH:mm') : '';

    if (isUntilFurtherNotice) {
        if (part === 'title') return `【${provider}】scheduled to have system maintenance on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.`;
        return `Hello there\nPlease be informed that【${provider}】scheduled to have system maintenance on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    } else {
        if (part === 'title') return `【${provider}】scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
        return `Hello there, \nPlease be informed that 【${provider}】 scheduled to have system maintenance on ${dStart} between ${tStart} to ${tEnd}(GMT+8) , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }
  };

  const getInternalUpdateMsg = () => `Maintenance time update for ${formData.provider}, BO8.2 announcement has been updated.`;
  const getUrgentInternalMsg = () => {
      if (isPartGame) return `Urgent Maintenance: ${formData.provider || 'Provider'} - Part of the Game (Lobby Remains Open).`;
      return `Urgent Maintenance: ${formData.provider || 'Provider'} - Please assist to close the game.`;
  };
  
  const inputStyle = (isError) => `w-full bg-white border text-gray-900 text-sm rounded-sm px-3 py-2 outline-none transition-all ${isError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'}`;

  const getProviderHint = () => {
      if(formData.provider === 'Pragmatic Play') return { text: 'For Reel Kingdom games, list them text-only.', link: 'https://snipboard.io/h6JWba.jpg' };
      if(formData.provider === 'PT Slots') return { text: 'For GPAS games, list them text-only.', link: 'https://snipboard.io/uDgQrB.jpg' };
      return null;
  };
  const providerHint = getProviderHint();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isUrgent ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-sm font-bold uppercase tracking-wide ${isUrgent ? 'text-red-700' : 'text-gray-900'}`}>
            {editingId ? 'Edit Maintenance' : isUrgent ? 'New Urgent Entry' : 'New Maintenance Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL: INPUTS */}
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
                   <select 
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" 
                        value={isCancelled ? 'Cancelled' : (isUrgent ? 'Urgent' : 'Scheduled')} 
                        onChange={handleTypeChange}
                   >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Cancelled">Cancelled</option>
                   </select>
               </div>
               <div className="flex flex-col gap-2 pb-1">
                   <label className={`flex items-center gap-2 cursor-pointer ${isCancelled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                       <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-gray-300 text-black focus:ring-black" checked={formData.isUntilFurtherNotice} disabled={isCancelled} onChange={(e) => { setFormData({...formData, isUntilFurtherNotice: e.target.checked}); if(e.target.checked) setErrors({...errors, endTime: false}); }} />
                       <span className="text-xs font-medium text-gray-700">Until Further Notice</span>
                   </label>
                   
                   <label className={`flex items-center gap-2 cursor-pointer ${isCancelled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                       <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-gray-300 text-purple-600 focus:ring-purple-600" checked={isPartGame} disabled={isCancelled} onChange={handlePartGameChange} />
                       <span className="text-xs font-bold text-purple-700">Part of the Game</span>
                   </label>

                   {isPartGame && (
                       <label className="flex items-center gap-2 cursor-pointer animate-in fade-in slide-in-from-left-2">
                           <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-gray-300 text-gray-600 focus:ring-gray-600" checked={formData.isInHouse || false} onChange={(e) => setFormData({...formData, isInHouse: e.target.checked})} />
                           <span className="text-xs font-medium text-gray-500">Restricted / In-House</span>
                       </label>
                   )}
               </div>
            </div>

            {isPartGame && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-500">Affected Games (One per line) *</label>
                        {providerHint && <a href={providerHint.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 flex items-center gap-1 hover:underline"><Info size={10}/> {providerHint.text}</a>}
                    </div>
                    <textarea 
                        className={`${inputStyle(errors.affectedGames)} h-24 font-mono text-xs`} 
                        placeholder="E.g.\nSweet Bonanza\nGate of Olympus"
                        value={formData.affectedGames || ''}
                        onChange={(e) => { setFormData({...formData, affectedGames: e.target.value}); setErrors({...errors, affectedGames: false}); }}
                    />
                </div>
            )}

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
            
            {showRescheduleSop && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><AlertCircle size={16} /></div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Reschedule Protocol</h4>
                    </div>
                    <div className="space-y-3">
                        <div onClick={() => setRescheduleChecklist(p => ({...p, internal: !p.internal}))} className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${rescheduleChecklist.internal ? 'bg-emerald-50/80 border-emerald-500 shadow-md' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${rescheduleChecklist.internal ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                    {rescheduleChecklist.internal ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">1</span>}
                                </div>
                                <div className="flex-1"><span className={`block text-xs font-bold transition-colors ${rescheduleChecklist.internal ? 'text-emerald-900' : 'text-gray-700'}`}>Notify Internal Group</span></div>
                            </div>
                            <div className="mt-3 pl-12 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-500 truncate select-all">{getInternalUpdateMsg()}</div>
                                <CopyButton text={getInternalUpdateMsg()} label="COPY" />
                            </div>
                        </div>
                        <div onClick={() => setRescheduleChecklist(p => ({...p, boSync: !p.boSync}))} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${rescheduleChecklist.boSync ? 'bg-emerald-50/80 border-emerald-500 shadow-md' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${rescheduleChecklist.boSync ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                {rescheduleChecklist.boSync ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">2</span>}
                            </div>
                            <span className={`text-xs font-bold transition-colors ${rescheduleChecklist.boSync ? 'text-emerald-900' : 'text-gray-700'}`}>Update BO8.2 & Sync BO8.7</span>
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* RIGHT PANEL: SCRIPTS & SOPs - UPDATED CLASSNAME */}
          <div className={`w-1/2 p-6 flex flex-col ${isUrgent ? 'overflow-y-auto bg-red-50' : 'overflow-hidden bg-gray-50'}`}>
              
              {isUrgent ? (
                  // --- URGENT LAYOUT ---
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-red-200">
                          <div className="bg-red-100 p-1.5 rounded text-red-600"><AlertCircle size={16} /></div>
                          <h3 className="text-xs font-bold text-red-800 uppercase tracking-widest">Urgent SOP & Scripts</h3>
                      </div>

                      {/* --- CHECKLIST --- */}
                      <div className="bg-white border border-red-100 rounded-lg p-3 shadow-sm space-y-2">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Required SOP Actions</h4>
                          
                          {/* Item 1: Notify Internal */}
                          <div onClick={() => setUrgentChecks(prev => ({...prev, internal: !prev.internal}))} className={`flex flex-col gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.internal ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200'}`}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.internal ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                                      {urgentChecks.internal && <Check size={10} className="text-white" strokeWidth={4} />}
                                  </div>
                                  
                                  {/* --- UPDATE THIS SPAN --- */}
                                  <span className={`text-xs ${urgentChecks.internal ? 'text-red-900 font-medium' : 'text-gray-600'}`}>
                                      {isPartGame ? "Notify Leader (Lobby Remains Open)" : "Notify Leader & Request Open/Close"}
                                  </span>
                                  {/* ------------------------ */}

                              </div>
                              <div className="pl-7 mt-1" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Message to Group</label>
                                <div className="flex gap-2 mt-1">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-600 truncate select-all">{getUrgentInternalMsg()}</div>
                                    <CopyButton text={getUrgentInternalMsg()} label="COPY" />
                                </div>
                              </div>
                          </div>

                          {/* Item 2: BO 8.2 (Changed if In-House) */}
                          <div onClick={() => setUrgentChecks(prev => ({...prev, bo82: !prev.bo82}))} className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.bo82 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200'}`}>
                              <div className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.bo82 ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                                  {urgentChecks.bo82 && <Check size={10} className="text-white" strokeWidth={4} />}
                              </div>
                              {/* --- IN-HOUSE LOGIC: Change Instruction --- */}
                              <span className={`text-xs ${urgentChecks.bo82 ? 'text-red-900 font-medium' : 'text-gray-600'}`}>
                                  {formData.isInHouse ? <>Notify <b>Internal Maintenance Group</b> (No BO8.2)</> : <>Create <b>BO 8.2</b> (Do NOT Sync 8.7)</>}
                              </span>
                          </div>

                          {/* Item 3: Redmine */}
                          <div onClick={() => setUrgentChecks(prev => ({...prev, redmine: !prev.redmine}))} className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.redmine ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200'}`}>
                              <div className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.redmine ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                                  {urgentChecks.redmine && <Check size={10} className="text-white" strokeWidth={4} />}
                              </div>
                              <span className={`text-xs ${urgentChecks.redmine ? 'text-red-900 font-medium' : 'text-gray-600'}`}>Create <b>Redmine</b> Ticket (Attach Screenshot)</span>
                          </div>
                      </div>

                      {/* Title Script */}
                      <div className="space-y-1">
                          <div className="flex justify-between items-end">
                              <label className="text-[10px] font-bold text-red-400">TITLE (BO & Redmine)</label>
                              <CopyButton text={urgentScript.title} />
                          </div>
                          <div className="bg-white border border-red-200 rounded p-3 text-xs font-mono text-gray-800 break-words shadow-sm">
                              {urgentScript.title || <span className="text-gray-300 italic">Select provider & time...</span>}
                          </div>
                      </div>

                      {/* Message Script */}
                      <div className="space-y-1">
                          <div className="flex justify-between items-end">
                              <label className="text-[10px] font-bold text-red-400">ANNOUNCEMENT (Robot, Redmine, BO8.2)</label>
                              <CopyButton text={urgentScript.startMessage} />
                          </div>
                          <div className="bg-white border border-red-200 rounded p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap shadow-sm min-h-[120px]">
                              {urgentScript.startMessage || <span className="text-gray-300 italic">Waiting for input...</span>}
                          </div>
                      </div>
                  </div>
              ) : (
                  // --- SCHEDULED / CANCELLED / PART OF GAME LAYOUT ---
                  <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generated Script</span>
                        {formData.isInHouse ? <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">INTERNAL ONLY</span> : <span className="text-[10px] font-mono text-gray-400">READ-ONLY</span>}
                    </div>
                    
                    <div className="group relative">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-semibold text-gray-400">TITLE</label>
                            <CopyButton text={generateScheduledScript('title')} />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 break-words h-12">
                            {generateScheduledScript('title')}
                        </div>
                    </div>
                    
                    {/* FIXED: BODY SCRIPT CONTAINER */}
                    <div className="group relative flex-1 min-h-0 flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-semibold text-gray-400">BODY</label>
                            <CopyButton text={generateScheduledScript('body')} />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap flex-1 overflow-y-auto">
                            {generateScheduledScript('body')}
                        </div>
                    </div>
                  </div>
              )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition-colors">Cancel</button>
          <button 
            onClick={validateAndConfirm} 
            disabled={
                loading || 
                (showRescheduleSop && (!rescheduleChecklist.internal || !rescheduleChecklist.boSync)) ||
                isUrgentLocked
            } 
            className={`px-4 py-2 text-xs font-bold text-white rounded-sm shadow-sm transition-colors flex items-center gap-2 ${
                (loading || (showRescheduleSop && (!rescheduleChecklist.internal || !rescheduleChecklist.boSync)) || isUrgentLocked) 
                ? 'bg-gray-300 cursor-not-allowed' 
                : isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
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