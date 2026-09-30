import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function NavBar() {
  const [role, setRole] = useState<string>('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadComplaints, setUnreadComplaints] = useState(0);

  useEffect(() => {
    const fetchUserRoleAndNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentRole = session ? (session.user.user_metadata?.role || 'user') : 'user';
      setRole(currentRole);
      
      checkUnreadNotifications(currentRole);
    };
    
    fetchUserRoleAndNotifications();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentRole = session ? (session.user.user_metadata?.role || 'user') : 'user';
      setRole(currentRole);
      checkUnreadNotifications(currentRole);
    });

    const clearNotifications = () => {
      setUnreadAnnouncements(0);
      setUnreadComplaints(0);
    };
    window.addEventListener('read_notifications', clearNotifications);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('read_notifications', clearNotifications);
    };
  }, []);

  const checkUnreadNotifications = async (currentRole: string) => {
    const lastReadAnn = localStorage.getItem('last_read_announcements') || '2000-01-01T00:00:00.000Z';
    const { count: annCount } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastReadAnn);
      
    setUnreadAnnouncements(annCount || 0);

    if (currentRole === 'admin') {
      const lastReadComp = localStorage.getItem('last_read_complaints') || '2000-01-01T00:00:00.000Z';
      const { count: compCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastReadComp);
        
      setUnreadComplaints(compCount || 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    navigate('/welcome');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const hideNavBarPaths = ['/welcome', '/login', '/forgot-password', '/update-password'];

  if (hideNavBarPaths.includes(location.pathname)) {
    return null;
  }

  const adminUnreadTotal = unreadAnnouncements + unreadComplaints;
  const userUnreadTotal = unreadAnnouncements;

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0 font-bold text-xl tracking-tight text-blue-400">
            ResidenceSystem
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {role === 'admin' && (
              <>
                <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Admin Dashboard</Link>
                <Link to="/outstanding" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Total Outstanding</Link>
                <Link to="/bills" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Bills</Link>
                <Link to="/expenses" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Money Out</Link>
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Contacts Edit</Link>
                <Link to="/audit" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Audit Export</Link>
                <Link to="/announcements" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                  Notice Board
                  {adminUnreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">{adminUnreadTotal}</span>
                  )}
                </Link>
              </>
            )}

            {role === 'user' && (
              <>
                <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Outstanding</Link>
                <Link to="/announcements" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                  Notice Board & Reports
                  {userUnreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">{userUnreadTotal}</span>
                  )}
                </Link>
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">JMB / Clerk Contacts</Link>
              </>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:block">
            {role === 'admin' ? (
              <button onClick={handleLogout} className="ml-4 px-4 py-2 rounded-md text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors">Logout</button>
            ) : (
              <Link to="/welcome" className="ml-4 px-4 py-2 rounded-md text-sm font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors">Switch User</Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white focus:outline-none p-2"
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 shadow-xl absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col">
            
            {role === 'admin' && (
              <>
                <Link onClick={closeMobileMenu} to="/dashboard" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Admin Dashboard</Link>
                <Link onClick={closeMobileMenu} to="/outstanding" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Total Outstanding</Link>
                <Link onClick={closeMobileMenu} to="/bills" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Bills</Link>
                <Link onClick={closeMobileMenu} to="/expenses" className="px-3 py-2 rounded-md text-sm font-medium text-rose-300 hover:text-white hover:bg-slate-700">Money Out</Link>
                <Link onClick={closeMobileMenu} to="/contacts" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Contacts Edit</Link>
                <Link onClick={closeMobileMenu} to="/audit" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Audit Export</Link>
                <Link onClick={closeMobileMenu} to="/announcements" className="flex items-center justify-between px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">
                  Notice Board
                  {adminUnreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">{adminUnreadTotal} New</span>
                  )}
                </Link>
              </>
            )}

            {role === 'user' && (
              <>
                <Link onClick={closeMobileMenu} to="/" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">Outstanding</Link>
                <Link onClick={closeMobileMenu} to="/announcements" className="flex items-center justify-between px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">
                  Notice Board & Reports
                  {userUnreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">{userUnreadTotal} New</span>
                  )}
                </Link>
                <Link onClick={closeMobileMenu} to="/contacts" className="block px-3 py-3 rounded-md text-base font-bold text-slate-300 hover:text-white hover:bg-slate-700">JMB / Clerk Contacts</Link>
              </>
            )}

            <div className="pt-4 mt-2 border-t border-slate-700">
              {role === 'admin' ? (
                <button onClick={handleLogout} className="w-full text-left px-3 py-3 rounded-md text-base font-bold text-rose-400 hover:text-white hover:bg-rose-600 transition-colors">Logout Admin</button>
              ) : (
                <Link onClick={closeMobileMenu} to="/welcome" className="block px-3 py-3 rounded-md text-base font-bold text-blue-400 hover:text-white hover:bg-blue-600 transition-colors">Switch User / Admin Login</Link>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}