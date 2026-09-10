import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role || 'user';
      setRole(userRole);
      setLoading(false);
    }
    fetchUserRole();
  }, []);

  const adminApps = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { name: 'Issue Bills', icon: '💳', path: '/bills' },
    { name: 'Directory', icon: '📖', path: '/residents' },
    { name: 'Manage Guests', icon: '👥', path: '/guests' },
    { name: 'Facilities', icon: '🎾', path: '/facilities' },
    { name: 'Parking', icon: '🚗', path: '/parking' }
  ];

  const userApps = [
    { name: 'Facilities', icon: '🎾', path: '/facilities' },
    { name: 'Guests', icon: '👥', path: '/guests' },
    { name: 'Parking', icon: '🚗', path: '/parking' },
    { name: 'Billing', icon: '💳', path: '/bills' },
    { name: 'Directory', icon: '📖', path: '/residents' },
    { name: 'Contacts', icon: '📞', path: '/contacts' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading your portal...</div>
      </div>
    );
  }

  const displayApps = role === 'admin' ? adminApps : userApps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative overflow-hidden flex flex-col justify-center pb-20">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-400/20 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 w-full text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-3 tracking-tight">
          {role === 'admin' ? 'Management Portal' : 'Resident Portal'}
        </h1>
        <p className="text-slate-600 font-medium mb-12 text-lg">
          Tap an icon to launch the application
        </p>

        {/* Apple-style Glassmorphism Launchpad */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {displayApps.map((app, index) => (
            <Link key={index} to={app.path} className="block group outline-none">
              <div className="flex flex-col items-center justify-center p-8 aspect-square rounded-[2rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] hover:bg-white/60 transform hover:-translate-y-2">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                  {app.icon}
                </div>
                <h3 className="text-slate-900 font-bold text-sm sm:text-base tracking-wide">
                  {app.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}