import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function NavBar() {
  const [role, setRole] = useState<string>('user');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Pull the role we set in the auth metadata (defaults to 'user' if not found)
      const userRole = session.user.user_metadata?.role || 'user';
      setRole(userRole);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav style={{ background: '#1e293b', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
        Residence System
      </div>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        
        {/* CONDITIONAL ROUTING: Admins see Dashboard, Users see Home */}
        {role === 'admin' ? (
          <Link to="/dashboard" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 'bold' }}>
            📊 Dashboard
          </Link>
        ) : (
          <Link to="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 'bold' }}>
            🏠 Home
          </Link>
        )}
        
        {/* Standard Links for Everyone */}
        <Link to="/facilities" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Facilities</Link>
        <Link to="/guests" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Guests</Link>
        <Link to="/parking" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Parking</Link>
        <Link to="/bills" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Billing</Link>
        <Link to="/residents" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Directory</Link>
        <Link to="/contacts" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>Contacts</Link>
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout} 
          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}