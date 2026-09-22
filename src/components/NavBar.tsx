import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function NavBar() {
  const [role, setRole] = useState<string>('user');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const userRole = session.user.user_metadata?.role || 'user';
      setRole(userRole);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/welcome');
  };

  // 1. Define the routes where the NavBar should be hidden
   const hideNavBarPaths = ['/welcome', '/login', '/register', '/forgot-password'];

  // 2. If the current URL is in that list, don't render the NavBar
  if (hideNavBarPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex-shrink-0 font-bold text-xl tracking-tight text-blue-400">
            ResidenceSystem
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            
            {role === 'admin' ? (
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                Home
              </Link>
            ) : (
              <Link to="/residents" className="px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                directory
              </Link>
            )}
            <Link to="/bills" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Billing</Link>
            <Link to="/contacts" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Contacts</Link>
          </div>

          {/* Logout Button */}
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