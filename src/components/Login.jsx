import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Successful login
      onLogin(data.session);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-100 bg-white text-center">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-200">
            <span className="text-white font-bold text-sm">IC</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Maintenance Control</h2>
          <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-wider">Authorized Personnel Only</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-3 rounded flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="email" 
                required
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md pl-10 pr-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                required
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md pl-10 pr-3 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold text-sm py-3 rounded-md transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium">
            Protected System • IP Logs Active
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;