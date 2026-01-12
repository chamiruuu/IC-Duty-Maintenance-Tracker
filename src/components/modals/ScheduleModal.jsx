import React from 'react';
import { X, Plus, Calendar, ExternalLink, Check, AlertCircle, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isToday as checkIsToday } from 'date-fns';
import { getChecklistForDate } from '../../lib/scheduleRules';

const REDMINE_BASE_URL = "https://bugtracking.ickwbase.com/issues/"; 

const ScheduleModal = ({ isOpen, onClose, maintenances, onOpenEntryModal }) => {
  if (!isOpen) return null;

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  // Helper to format Redmine ID
  const getRedmineId = (ticket) => ticket ? `CS-${ticket.toString().replace(/\D/g, '')}` : 'Ticket';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header Section */}
        <div className="px-8 py-6 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-gray-500" />
              Weekly Schedule
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Maintenance compliance overview for <span className="text-gray-900 font-bold">{format(startOfCurrentWeek, 'MMM d')} - {format(addDays(startOfCurrentWeek, 6), 'MMM d, yyyy')}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Grid Canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {weekDays.map((date, i) => {
              const checklist = getChecklistForDate(date, maintenances);
              const isToday = checkIsToday(date);
              const isPast = date < new Date().setHours(0,0,0,0);
              const isEmpty = checklist.length === 0;

              // Optional: Render empty days as "No Tasks" placeholders or hide them. 
              // We will render them for a complete calendar look, but greyed out if empty.
              
              return (
                <div 
                  key={i} 
                  className={`flex flex-col rounded-xl border transition-all duration-200 
                    ${isToday 
                      ? 'bg-white border-gray-900 shadow-md ring-1 ring-gray-900' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    } ${isPast && !isToday ? 'opacity-70 bg-gray-50' : ''}`}
                >
                  {/* Card Header: Date */}
                  <div className={`px-5 py-4 border-b flex items-baseline justify-between ${isToday ? 'border-gray-900/10 bg-gray-50/50' : 'border-gray-100'}`}>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                        {format(date, 'EEEE')}
                      </span>
                      <span className={`text-xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {format(date, 'MMM dd')}
                      </span>
                    </div>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Card Body: Tasks */}
                  <div className="p-4 space-y-3 flex-1">
                    {isEmpty ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 py-6">
                        <span className="text-xs italic">No Checks</span>
                      </div>
                    ) : (
                      checklist.map((item, idx) => (
                        <div key={idx} className="group">
                          {/* Task Row */}
                          <div className="flex flex-col gap-2 mb-2">
                            
                            {/* Top Line: Provider Name & Status Icon */}
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold ${item.status === 'ok' ? 'text-gray-700' : 'text-gray-900'}`}>
                                {item.provider}
                              </span>
                              
                              {item.status === 'ok' ? (
                                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <Check size={12} className="text-emerald-600" strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                              )}
                            </div>

                            {/* Bottom Line: Action Button OR Redmine Link */}
                            <div>
                              {item.status === 'missing' ? (
                                <button 
                                  onClick={() => onOpenEntryModal(item.provider, date)}
                                  className="w-full py-1.5 flex items-center justify-center gap-1.5 rounded border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-500 hover:text-gray-900 text-xs font-medium transition-all group-hover:border-solid"
                                >
                                  <Plus size={12} /> Create Entry
                                </button>
                              ) : (
                                // CONFIRMED STATE
                                <div className="flex items-center justify-between">
                                  {item.entry?.redmine_ticket ? (
                                    <a 
                                      href={`${REDMINE_BASE_URL}${item.entry.redmine_ticket}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 rounded text-[10px] font-mono font-bold transition-colors w-full justify-center"
                                      title="View on Redmine"
                                    >
                                      {getRedmineId(item.entry.redmine_ticket)}
                                      <ExternalLink size={10} />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium w-full text-center">
                                      Confirmed
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Extra Note (e.g. Night Shift) */}
                          {item.note && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 pl-1">
                              <Clock size={10} /> {item.note}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScheduleModal;