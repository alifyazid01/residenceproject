import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: JSX.Element, 
  allowedRoles?: string[] 
}) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black text-sm">
        Verifying Access...
      </div>
    );
  }
  // 1. Check if logged in
  if (!session) {
    return <Navigate to="/welcome" replace />;
  }

  // 2. Check if the user has the correct role (if roles are restricted)
  if (allowedRoles) {
    const userRole = session.user.user_metadata?.role || 'user';
    if (!allowedRoles.includes(userRole)) {
      // If a resident tries to access an admin page, kick them back to their home page
      return <Navigate to="/" replace />;
    }
  }

  return children;
}