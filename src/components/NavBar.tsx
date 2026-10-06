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
    const { count: annCount } = await supabase.from('announcements').select('*', { count: 'exact', head: true }).gt('created_at', lastReadAnn);
    setUnreadAnnouncements(annCount || 0);

    if (currentRole === 'admin') {
      const lastReadComp = localStorage.getItem('last_read_complaints') || '2000-01-01T00:00:00.000Z';
      const { count: compCount } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).gt('created_at', lastReadComp);
      setUnreadComplaints(compCount || 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    navigate('/welcome');
  };

  const hideNavBarPaths = ['/welcome', '/login', '/forgot-password', '/update-password'];
  if (hideNavBarPaths.includes(location.pathname)) return null;

  const adminUnreadTotal = unreadAnnouncements + unreadComplaints;
  const userUnreadTotal = unreadAnnouncements;

  return (
    <nav className="bg-black text-white sticky top-0 z-50 border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          <div className="flex-shrink-0 font-black text-2xl uppercase tracking-tighter">
            KEKWA RESIDENCE
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {role === 'admin' && (
              <>
                <Link to="/dashboard" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Overview</Link>
                <Link to="/outstanding" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Ledger</Link>
                <Link to="/bills" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Billing</Link>
                <Link to="/expenses" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Expenses</Link>
                <Link to="/contacts" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Directory</Link>
                <Link to="/audit" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Audit</Link>
                <Link to="/announcements" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                  Notice Board
                  {adminUnreadTotal > 0 && <span className="bg-white text-black px-1.5 py-0.5 text-[9px]">{adminUnreadTotal}</span>}
                </Link>
              </>
            )}
            {role === 'user' && (
              <>
                <Link to="/" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Outstanding</Link>
                <Link to="/announcements" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                  Notice Board
                  {userUnreadTotal > 0 && <span className="bg-white text-black px-1.5 py-0.5 text-[9px]">{userUnreadTotal}</span>}
                </Link>
                <Link to="/contacts" className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">Directory</Link>
              </>
            )}
          </div>

          <div className="hidden md:block">
            {role === 'admin' ? (
              <button onClick={handleLogout} className="text-[11px] font-bold uppercase tracking-widest border border-neutral-700 px-6 py-2 hover:bg-white hover:text-black transition-colors">Logout</button>
            ) : (
              <Link to="/welcome" className="text-[11px] font-bold uppercase tracking-widest border border-neutral-700 px-6 py-2 hover:bg-white hover:text-black transition-colors">Switch User</Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-neutral-800 w-full px-4 py-6 space-y-4">
           {role === 'admin' && (
              <>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" className="block text-sm font-bold uppercase tracking-widest text-white">Overview</Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/outstanding" className="block text-sm font-bold uppercase tracking-widest text-white">Ledger</Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/bills" className="block text-sm font-bold uppercase tracking-widest text-white">Billing</Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/expenses" className="block text-sm font-bold uppercase tracking-widest text-white">Expenses</Link>
              </>
            )}
            {/* Added a solid logout block for mobile */}
            <div className="pt-6 border-t border-neutral-800">
               {role === 'admin' ? (
                <button onClick={handleLogout} className="text-sm font-bold uppercase tracking-widest text-neutral-400">Logout</button>
              ) : (
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/welcome" className="text-sm font-bold uppercase tracking-widest text-neutral-400">Switch User</Link>
              )}
            </div>
        </div>
      )}
    </nav>
  );
}