import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Clock, ArrowRight, Check, Send, CheckSquare, AlertTriangle, Users, PlayCircle, FileText } from 'lucide-react';
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
      // Initialize picker with current China time (Visual)
      const nowChina = dayjs().tz("Asia/Shanghai");
      const visualNow = dayjs(nowChina.format('YYYY-MM-DD HH:mm:ss'));
      setCompletionTime(visualNow);
      
      // Reset checks
      setSopChecks({});
    }
  }, [isOpen, setSopChecks]);

  if (!isOpen || !item) return null;

  // --- LOGIC: DETECT TYPE & EARLY ---
  const isUrgent = item.type && item.type.toLowerCase().includes('urgent');
  const isNotice = item.is_until_further_notice;
  const showRobotNotify = isUrgent || isNotice;
  
  // --- DETECT EXTENDED MAINTENANCE ---
  const isExtended = item.type === 'Extended Maintenance' || item.is_until_further_notice;

  // --- NEW: DETECT SINGLE GAME MAINTENANCE ---
  const isSingleGame = item.type === 'Single Game Maintenance';

  // --- FIXED EARLY DETECTION LOGIC ---
  const scheduledEnd = item.end_time 
    ? dayjs(dayjs(item.end_time).tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm:ss')) 
    : null;

  const isEarly = scheduledEnd && completionTime && completionTime.isBefore(scheduledEnd);
  
  // Calculate total minutes early
  const totalEarlyMinutes = isEarly ? scheduledEnd.diff(completionTime, 'minute') : 0;

  // --- SMART DURATION FORMATTER ---
  const getFormattedEarlyTime = () => {
      if (totalEarlyMinutes < 60) return `${totalEarlyMinutes} mins`;
      const hours = Math.floor(totalEarlyMinutes / 60);
      const minutes = totalEarlyMinutes % 60;
      return minutes > 0 ? `${hours} hrs ${minutes} mins` : `${hours} hrs`;
  };

  // --- 1. SCRIPT GENERATION (UPDATED) ---
  const getFinishContent = () => {
    // 1. Single/Multiple Game Logic (Highest Priority)
    if (isSingleGame) {
        const games = (item.affected_games || '').split('\n').filter(g => g.trim());
        const isMultiple = games.length > 1;
        
        // If Multiple: "Provider-part of the game"
        // If Single: "Provider-GameName" (Take the first line of affected_games)
        const gameName = games[0] ? games[0].trim() : "Game";
        const subjectSuffix = isMultiple ? "part of the game" : gameName;
        const subject = `${item.provider}-${subjectSuffix}`;
        
        const typeText = isUrgent ? 'urgent maintenance' : 'scheduled maintenance';

        return `Hello there,\n\nPlease be informed that 【${subject}】 ${typeText} has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }

    // 2. Extended Maintenance Logic
    if (isExtended) {
        return `Hello there\nPlease be informed that 【${item.provider}】 extend maintenance has been completed.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    }

    // 3. Standard Scheduled / Urgent Logic
    const typeText = isUrgent ? 'urgent maintenance' : 'scheduled maintenance';
    return `Hello there, \nPlease be informed that 【${item.provider}】 ${typeText} has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
  };

  const getManualOpenMsg = () => {
      // Update: Dynamic message. If early, say "before scheduled time". If just extended, say "completed".
      const reason = isEarly ? "have completed before the scheduled end time" : "maintenance has been completed";
      return `maintenance for ${item.provider}, ${reason}. Please help to open. Thank You.`;
  };

  // --- 2. CONFIRM HANDLER ---
  const handleConfirm = () => {
    if (completionTime) {
        // Convert the "Visual" time back to a real Timezoned string for the DB
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
  const renderCheckItem = (key, title, desc, icon, copyText = null) => {
      const isChecked = sopChecks[key];
      const activeColor = isEarly ? 'border-orange-500 bg-orange-50/50' : 'border-emerald-500 bg-emerald-50/50';
      const iconBg = isEarly ? 'bg-orange-500' : 'bg-emerald-500';
      const textColor = isEarly ? 'text-orange-900' : 'text-emerald-900';

      return (
        <button 
            onClick={() => toggleCheck(key)}
            className={`w-full group flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${isChecked ? activeColor : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
        >
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isChecked ? `${iconBg} text-white shadow-sm` : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                {isChecked ? <Check size={16} strokeWidth={3} /> : icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className={`block text-sm font-bold ${isChecked ? textColor : 'text-gray-900'}`}>{title}</span>
                    {copyText && (
                        <div onClick={(e) => e.stopPropagation()} className="opacity-100" title="Copy Message">
                            <CopyButton text={copyText} size={14} className="text-gray-400 hover:text-black bg-white border border-gray-200 p-1 rounded-md shadow-sm" />
                        </div>
                    )}
                </div>
                <span className="text-xs text-gray-500 mt-0.5 block leading-relaxed">{desc}</span>
            </div>
        </button>
      );
  };

  // --- VALIDATION LOGIC ---
  let canConfirm = false;
  if (isEarly) {
      if (isSingleGame) {
          // Early Single Game: No manual open needed
          canConfirm = sopChecks.functionalCheck && sopChecks.announcements;
      } else {
          canConfirm = sopChecks.manualOpen && sopChecks.functionalCheck && sopChecks.announcements;
      }
  } else {
      // Normal Completion Validation
      if (isSingleGame) {
          // Single Game: No Manual Open required (as it wasn't closed)
          canConfirm = sopChecks.gameTest && 
                       sopChecks.documentation && 
                       (!showRobotNotify || sopChecks.robotNotify);
      } else {
          // Standard Logic
          canConfirm = sopChecks.gameTest && 
                       sopChecks.documentation && 
                       (!showRobotNotify || sopChecks.robotNotify) &&
                       (!isExtended || sopChecks.manualOpen);
      }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
         
         {/* Header */}
         <div className={`px-6 py-5 border-b border-gray-200 shrink-0 ${isEarly ? 'bg-orange-50' : (isUrgent ? 'bg-amber-50' : 'bg-gray-50')}`}>
             <div className="flex items-start justify-between">
                <div>
                   <h3 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isEarly ? 'text-orange-800' : (isUrgent ? 'text-amber-800' : 'text-gray-900')}`}>
                     {isEarly ? <AlertTriangle size={20} className="text-orange-600"/> : (isUrgent ? <AlertTriangle size={20} className="text-amber-600"/> : <ShieldCheck className="text-emerald-600" size={20} />)} 
                     {isEarly ? 'Early Completion Warning' : (isUrgent ? 'Urgent Completion' : 'Verify Completion')}
                   </h3>
                   <p className="text-xs text-gray-500 mt-1">
                      {isEarly 
                        ? <>Closing at <span className="font-bold font-mono text-orange-700">{completionTime ? completionTime.format('HH:mm') : ''}</span> ({getFormattedEarlyTime()} early). Manual verification required.</>
                        : `Finalizing maintenance for ${item.provider}.`}
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

             {/* 2. SOP Action Cards (DYNAMIC) */}
             <div className="space-y-3">
                 <h5 className={`text-xs font-bold uppercase ${isEarly ? 'text-orange-700' : 'text-gray-900'}`}>
                    {isEarly ? 'Manual Intervention Required (SOP)' : 'SOP Checklist'}
                 </h5>
                 
                 {isEarly ? (
                     <>
                        {/* Hide Manual Open if Single Game */}
                        {!isSingleGame && renderCheckItem(
                            'manualOpen', 
                            'Manual Game Open (Note 1)', 
                            'Contacted personnel & manually opened game.', 
                            <PlayCircle size={16} />,
                            getManualOpenMsg()
                        )}
                        {renderCheckItem(
                            'functionalCheck', 
                            'Functional Check', 
                            'Confirmed game is open & transfers are working normally.', 
                            <ShieldCheck size={16} />
                        )}
                        {renderCheckItem(
                            'announcements', 
                            'Update Announcements (Note 4)', 
                            'Updated BO8.2 (End Announcement) & Redmine.', 
                            <FileText size={16} />
                        )}
                     </>
                 ) : (
                     <>
                        {/* Standard Manual Open: Only if NOT Single Game and IS Extended */}
                        {!isSingleGame && isExtended && renderCheckItem(
                            'manualOpen', 
                            'Manual Game Open (Note 1)', 
                            'Maintenance was extended. Manually open game & confirm.', 
                            <PlayCircle size={16} />,
                            getManualOpenMsg()
                        )}

                        {renderCheckItem(
                            'gameTest', 
                            'Game & Transfer Test', 
                            isSingleGame 
                                ? 'Game was not closed. Confirmed transfers are working normally.' 
                                : 'Manual open successful. Game loading and transfers are normal on WEB.', 
                            <Activity size={16} />
                        )}

                        {showRobotNotify && renderCheckItem(
                            'robotNotify', 
                            'Notify Merchants (Robot BO)', 
                            'Send "Maintenance Completed" announcement to 【IC-Maintenance&Promo】 group.', 
                            <Users size={16} />
                        )}

                        {renderCheckItem(
                            'documentation', 
                            'Update BO8.2 & Redmine', 
                            isUrgent 
                                ? 'Add "Completed" to BO title. Update Redmine Note. Assign to Carmen.' 
                                : 'Add "Completed" to BO title. Update Redmine Note & Schedule.',
                            <CheckSquare size={16} />
                        )}
                     </>
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
                   className={`flex-[2] py-3 text-xs font-bold text-white rounded-lg shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2 ${!canConfirm ? 'bg-gray-300 cursor-not-allowed' : (isEarly ? 'bg-orange-600 hover:bg-orange-700' : 'bg-black hover:bg-gray-800')}`}
                >
                   {isEarly ? 'Confirm Early Completion' : 'Confirm Completion'} <ArrowRight size={14} />
                </button>
             </div>
         </div>
       </div>
    </div>
  );
};

export default CompletionModal;