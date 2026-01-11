import React, { useState } from 'react';
import { X, MessageSquarePlus, Bug, Lightbulb, Send, CheckCircle2, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';

// --- UPDATED KEYS (MATCHING YOUR SCREENSHOTS) ---
const SERVICE_ID = "service_h4fllz4";   // ✅ Updated to match your Gmail Service
const TEMPLATE_ID = "template_u0s042t"; // (This matches your screenshot)
const PUBLIC_KEY = "tnxQH5xnbRbiEF926"; // (This matches your screenshot)

const FeedbackModal = ({ isOpen, onClose, userName }) => {
  const [type, setType] = useState('Bug');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false); 

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setLoading(true);

    // 1. Prepare Data
    const templateParams = {
        user_name: userName,
        feedback_type: type,
        message: message,
    };

    console.log("🚀 Attempting to send feedback...", templateParams);

    try {
        // 2. Send via EmailJS
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        
        console.log("✅ SUCCESS!", response.status, response.text);
        
        setIsSuccess(true);
        
        setTimeout(() => {
            handleClose();
        }, 2500);

    } catch (error) {
        // 3. Log Exact Error
        console.error("❌ FAILED TO SEND:", error);
        
        // Error handling - parent should provide triggerNotification
        if (window.triggerNotification) {
            window.triggerNotification('Error', `Failed to send feedback: ${error.message || 'Unknown error'}`, 'error');
        }
    } finally {
        setLoading(false);
    }
  };

  const handleClose = () => {
      setIsSuccess(false);
      setMessage('');
      setType('Bug');
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 relative min-h-[320px] flex flex-col">
        
        {/* --- SUCCESS STATE --- */}
        {isSuccess ? (
            <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Feedback Sent!</h3>
                <p className="text-sm text-gray-500 text-center">
                    Thank you for helping us improve.<br/>
                    Our team has been notified.
                </p>
                <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 animate-[progress_2.5s_linear_forwards]" style={{width: '0%'}}></div>
                </div>
            </div>
        ) : (
            // --- FORM STATE ---
            <>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-1.5 rounded-full border border-gray-200 shadow-sm text-indigo-600">
                            <MessageSquarePlus size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Submit Feedback</h3>
                            <p className="text-[10px] text-gray-500">Report bugs or suggest features.</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-black transition-colors"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4 flex-1">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">I want to...</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setType('Bug')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold transition-all ${type === 'Bug' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Bug size={16} /> Report Bug
                            </button>
                            <button 
                                onClick={() => setType('Feature')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold transition-all ${type === 'Feature' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Lightbulb size={16} /> Suggest Feature
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Details</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full h-32 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                            placeholder={type === 'Bug' ? "What isn't working right?" : "How can we make this better?"}
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={handleClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading || !message.trim()}
                        className="px-6 py-2 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-lg shadow-lg shadow-black/10 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send Feedback</>}
                    </button>
                </div>
            </>
        )}
      </div>
      <style>{`@keyframes progress { from { width: 0%; } to { width: 100%; } }`}</style>
    </div>
  );
};

export default FeedbackModal;