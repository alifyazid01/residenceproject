import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function NavBar() {
  const [role, setRole] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Fetch the role when the component mounts
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setRole(session.user.user_metadata?.role || 'user');
      }
    };
    fetchUserRole();

    // 2. Listen for live login/logout events to update the navbar instantly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setRole(session.user.user_metadata?.role || 'user');
      } else {
        setRole('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/welcome');
  };

  const hideNavBarPaths = ['/welcome', '/login', '/register', '/forgot-password'];

  if (hideNavBarPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex-shrink-0 font-bold text-xl tracking-tight text-blue-400">
            ResidenceSystem
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            
            {/* Admin Links */}
            {role === 'admin' && (
              <>
                <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Admin Dashboard
                </Link>
                <Link to="/outstanding" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Total Outstanding
                </Link>
                <Link to="/bills" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Billing Ops
                </Link>
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Contacts Edit
                </Link>
                <Link to="/audit" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Audit Export
                </Link>
              </>
            )}

            {/* User Links */}
            {role === 'user' && (
              <>
                <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  User Dashboard
                </Link>
                <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                  Contacts
                </Link>
              </>
            )}

          </div>

          <div>
            <button 
              onClick={handleLogout} 
              className="ml-4 px-4 py-2 rounded-md text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}