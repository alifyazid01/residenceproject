import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function NavBar() {
  const [role, setRole] = useState<string>('user');
  const navigate = useNavigate();
  const location = useLocation();

  // Notification States
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

    // Listen for the custom event fired when the user opens the announcements page
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
    // 1. Check Unread Announcements (For Everyone)
    const lastReadAnn = localStorage.getItem('last_read_announcements') || '2000-01-01T00:00:00.000Z';
    const { count: annCount } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastReadAnn);
      
    setUnreadAnnouncements(annCount || 0);

    // 2. Check Unread Complaints (For Admins Only)
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
    navigate('/welcome');
  };

  const hideNavBarPaths = ['/welcome', '/login', '/forgot-password', '/update-password'];

  if (hideNavBarPaths.includes(location.pathname)) {
    return null;
  }

  // Calculate total badge numbers based on role
  const adminUnreadTotal = unreadAnnouncements + unreadComplaints;
  const userUnreadTotal = unreadAnnouncements;

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex-shrink-0 font-bold text-xl tracking-tight text-blue-400">
            ResidenceSystem
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            
            {role === 'admin' && (
              <>
                <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Admin Dashboard</Link>
                <Link to="/outstanding" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Total Outstanding</Link>
                <Link to="/bills" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Billing Ops</Link>
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Contacts Edit</Link>
                <Link to="/audit" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Audit Export</Link>
                
                <Link to="/announcements" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                  Notice Board
                  {adminUnreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">
                      {adminUnreadTotal}
                    </span>
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
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">
                      {userUnreadTotal}
                    </span>
                  )}
                </Link>
                
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">JMB / Clerk Contacts</Link>
              </>
            )}

          </div>

          <div>
            {role === 'admin' ? (
              <button onClick={handleLogout} className="ml-4 px-4 py-2 rounded-md text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors">Logout</button>
            ) : (
              <Link to="/welcome" className="ml-4 px-4 py-2 rounded-md text-sm font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors">Switch User</Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}