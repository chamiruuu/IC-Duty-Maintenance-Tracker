import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 1. Add a state to toggle the "Forgot Password" view
  const [isResetMode, setIsResetMode] = useState(false);

  // Standard Login Function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert(error.message);
    } else {
      onLogin(data.session);
    }
    setLoading(false);
  };

  // 2. THIS IS WHERE YOUR NEW CODE GOES
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      // NOTE: Update this port to match your local Vite server (usually 5173)
      redirectTo: 'http://localhost:5173/reset-password', 
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Password reset link sent! Please check your email inbox.");
      setIsResetMode(false); // Go back to login screen
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-center mb-6">
          {isResetMode ? 'Reset Password' : 'Login to System'}
        </h2>

        {/* 3. Render either the Reset Form OR the Login Form */}
        {isResetMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-bold"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-800 text-center mt-2"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-bold"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}