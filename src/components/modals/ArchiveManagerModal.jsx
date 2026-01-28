import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Adjust path as needed
import { X, CheckCircle, AlertTriangle, ExternalLink, Trash2, Loader2, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

const ArchiveManagerModal = ({ isOpen, onClose, userProfile }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (isOpen) fetchLogs();
    }, [isOpen]);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('archival_logs')
            .select('*')
            .order('period_start', { ascending: false });
        
        if (!error) setLogs(data || []);
        setLoading(false);
    };

    const handleConfirmPurge = async (log) => {
        if (!window.confirm(`⚠️ WARNING: This will PERMANENTLY DELETE maintenance records for ${log.month_name}.\n\nHave you verified the Google Sheet data is correct?`)) return;

        setProcessingId(log.id);
        
        // Call the Secure RPC function we created
        const { error } = await supabase.rpc('confirm_and_purge_archive', {
            p_log_id: log.id,
            p_admin_name: userProfile?.work_name || userProfile?.email || 'Admin'
        });

        if (error) {
            alert('Error purging data: ' + error.message);
        } else {
            fetchLogs(); // Refresh list
        }
        setProcessingId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Trash2 size={20} className="text-red-600" />
                            Data Archival Manager
                        </h2>
                        <p className="text-xs text-gray-500">Verify exported data before deleting it from the database.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X size={20}/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 italic">No archival logs found.</div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map(log => (
                                <div key={log.id} className={`border rounded-lg p-4 flex flex-col gap-3 shadow-sm transition-all ${log.status === 'COMPLETED' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-orange-200 ring-1 ring-orange-100'}`}>
                                    
                                    {/* Top Row: Info */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${log.status === 'COMPLETED' ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-600'}`}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">{log.month_name} Archive</h3>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {dayjs(log.period_start).format('MMM D')} - {dayjs(log.period_end).format('MMM D, YYYY')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {log.status === 'COMPLETED' ? 'Purged' : 'Pending Verification'}
                                            </span>
                                            <div className="text-xs text-gray-500 mt-1">{log.record_count || '?'} records</div>
                                        </div>
                                    </div>

                                    {/* Middle Row: Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <a href={log.sheet_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline hover:text-blue-800">
                                            <ExternalLink size={12} /> View Google Sheet
                                        </a>

                                        {log.status === 'PENDING_VERIFICATION' ? (
                                            <button 
                                                onClick={() => handleConfirmPurge(log)}
                                                disabled={processingId === log.id}
                                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-md shadow-sm transition-colors"
                                            >
                                                {processingId === log.id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
                                                CONFIRM & DELETE DB RECORDS
                                            </button>
                                        ) : (
                                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <CheckCircle size={10} />
                                                Verified by {log.verified_by} on {dayjs(log.verified_at).format('MM/DD HH:mm')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchiveManagerModal;