import { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight, Shield } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Ensure the user actually has an active recovery session
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        console.log("Recovery session active!");
      }
    });
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsProcessing(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error("Reset Error:", error);
      setError(error.message);
    } else {
      setSuccess(true);
      // Wait 2 seconds so they can read the success message, then send to login
      setTimeout(() => navigate('/login'), 2000);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
          <p className="text-slate-500 text-sm mt-2">Please enter your new password below.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {success ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg text-center font-medium">
            Password updated successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}