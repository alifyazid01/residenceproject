import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      // If an older account doesn't have a role, default them to 'user'
      const userRole = user?.user_metadata?.role || 'user';
      setRole(userRole);
      setLoading(false);
    }
    fetchUserRole();
  }, []);

  // Updated array with Tailwind color classes instead of hex codes
  const adminApps = [
    { name: 'System Dashboard', icon: '📊', path: '/dashboard', theme: 'bg-sky-50 border-sky-200 hover:bg-sky-100' },
    { name: 'Issue Bills', icon: '💳', path: '/bills', theme: 'bg-rose-50 border-rose-200 hover:bg-rose-100' },
    { name: 'Manage Directory', icon: '📖', path: '/residents', theme: 'bg-slate-50 border-slate-200 hover:bg-slate-100' },
    { name: 'Manage Guests', icon: '👥', path: '/guests', theme: 'bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100' },
    { name: 'Facilities', icon: '🎾', path: '/facilities', theme: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
    { name: 'Parking', icon: '🚗', path: '/parking', theme: 'bg-orange-50 border-orange-200 hover:bg-orange-100' }
  ];

  const userApps = [
    { name: 'Facilities', icon: '🎾', path: '/facilities', theme: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
    { name: 'Guests', icon: '👥', path: '/guests', theme: 'bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100' },
    { name: 'Parking', icon: '🚗', path: '/parking', theme: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
    { name: 'Billing', icon: '💳', path: '/bills', theme: 'bg-rose-50 border-rose-200 hover:bg-rose-100' },
    { name: 'Directory', icon: '📖', path: '/residents', theme: 'bg-slate-50 border-slate-200 hover:bg-slate-100' },
    { name: 'Contacts', icon: '📞', path: '/contacts', theme: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 text-lg font-medium animate-pulse">
          Loading your portal...
        </div>
      </div>
    );
  }

  // Determine which apps to show based on the fetched role
  const displayApps = role === 'admin' ? adminApps : userApps;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {role === 'admin' ? 'Management Portal' : 'Resident Portal'}
      </h1>
      <p className="text-slate-500 mb-10">
        Tap an icon to launch the application
      </p>

      {/* Tailwind CSS Grid: 2 columns on mobile, 3 columns on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {displayApps.map((app, index) => (
          <Link key={index} to={app.path} className="block group outline-none">
            <div className={`flex flex-col items-center justify-center p-6 aspect-square rounded-2xl border-2 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 ${app.theme}`}>
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">
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
  );
}