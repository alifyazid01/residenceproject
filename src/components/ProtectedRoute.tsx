import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if a user is currently logged in right now
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for any future login or logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Verifying access...</div>;
  }

  // 3. The Bouncer: If no session exists, kick them to the login page
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 4. If they are logged in, let them through to the page
  return children;
}