import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const [session, setSession] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Handle window resizing for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMenuOpen(false); // Auto-close menu if scaled back to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setMenuOpen(false); // Close menu on logout
    navigate('/login');
  };

  // Helper to close menu when a link is clicked on mobile
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav style={{ 
      background: '#1e293b', 
      padding: '15px 30px', 
      color: 'white',
      fontFamily: 'sans-serif',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'relative' // Needed for absolute positioning of mobile menu
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Brand Logo */}
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
          Kelantan Residence
        </div>

        {/* Mobile Hamburger Button */}
        {isMobile && session && (
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}
          >
            {menuOpen ? '✖' : '☰'}
          </button>
        )}

        {/* Desktop Navigation Links */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {session ? (
              <>
                <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', marginRight: '10px' }}>
                  🏠 Home
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderRight: '2px solid #475569', paddingRight: '20px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin</span>
                  <Link to="/dashboard" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }}>Dashboard</Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingLeft: '5px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>User</span>
                  <Link to="/facilities" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Facilities</Link>
                  <Link to="/visitors" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Guests</Link>
                  <Link to="/parking" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Parking</Link>
                  <Link to="/bills" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Billing</Link>
                  <Link to="/residents" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Directory</Link>
                  <Link to="/contacts" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>Contacts</Link>
                </div>

                <button 
                  onClick={handleLogout} 
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500' }}>
                Login
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobile && menuOpen && session && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px', 
          padding: '20px 0',
          borderTop: '1px solid #334155',
          marginTop: '15px'
        }}>
          <Link onClick={closeMenu} to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', padding: '10px', background: '#334155', borderRadius: '6px' }}>🏠 Home</Link>
          
          <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px' }}>Admin Portal</div>
          <Link onClick={closeMenu} to="/dashboard" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', paddingLeft: '10px' }}>Dashboard</Link>
          
          <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px' }}>Resident Portal</div>
          <Link onClick={closeMenu} to="/facilities" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Facilities</Link>
          <Link onClick={closeMenu} to="/visitors" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Guests</Link>
          <Link onClick={closeMenu} to="/parking" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Parking</Link>
          <Link onClick={closeMenu} to="/bills" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Billing</Link>
          <Link onClick={closeMenu} to="/residents" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Directory</Link>
          <Link onClick={closeMenu} to="/contacts" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: '500', paddingLeft: '10px' }}>Contacts</Link>
          
          <button 
            onClick={handleLogout} 
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}