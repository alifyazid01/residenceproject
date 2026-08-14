import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  // Check if a user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle the logout process
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Send them back to the login page
  };

  return (
    <nav style={{ 
      background: '#1e293b', 
      padding: '15px 30px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      color: 'white',
      fontFamily: 'sans-serif',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
        Residence System
      </div>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {session ? (
          <>
            <Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Dashboard
            </Link>
            
            <Link to="/residents" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Residents
            </Link>

            <Link to="/visitors" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Guests
            </Link>

            <Link to="/bills" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Billing
            </Link>

            <Link to="/facilities" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Facilities
            </Link>

            <Link to="/parking" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Parking
            </Link>

            <Link to="/contacts" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
              Contacts
            </Link>

            <button 
              onClick={handleLogout} 
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Logout
            </button>
          </>
        ) : (
          // What to show if the user IS NOT logged in
          <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}