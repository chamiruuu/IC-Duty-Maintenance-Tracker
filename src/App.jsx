import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-bold text-gray-400 animate-pulse">LOADING SYSTEM...</div>
      </div>
    );
  }

  // If no session, show Login. If session exists, show Dashboard.
  return (
    <>
      {!session ? (
        <Login onLogin={setSession} />
      ) : (
        <Dashboard key={session.user.id} session={session} />
      )}
    </>
  );
}

export default App;