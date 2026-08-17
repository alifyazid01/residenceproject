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

const adminApps = [
    { name: 'System Dashboard', icon: '📊', path: '/dashboard', color: '#f0f9ff', border: '#bae6fd' },
    { name: 'Issue Bills', icon: '💳', path: '/bills', color: '#fef2f2', border: '#fecaca' },
    { name: 'Manage Directory', icon: '📖', path: '/residents', color: '#f8fafc', border: '#e2e8f0' },
    { name: 'Manage Guests', icon: '👥', path: '/visitors', color: '#fdf4ff', border: '#fbcfe8' },
    { name: 'Facilities', icon: '🎾', path: '/facilities', color: '#f0fdf4', border: '#bbf7d0' },
    { name: 'Parking', icon: '🚗', path: '/parking', color: '#fff7ed', border: '#fed7aa' }
];

  const userApps = [
    { name: 'Facilities', icon: '🎾', path: '/facilities', color: '#f0fdf4', border: '#bbf7d0' },
    { name: 'Guests', icon: '👥', path: '/visitors', color: '#fdf4ff', border: '#fbcfe8' },
    { name: 'Parking', icon: '🚗', path: '/parking', color: '#fff7ed', border: '#fed7aa' },
    { name: 'Billing', icon: '💳', path: '/bills', color: '#fef2f2', border: '#fecaca' },
    { name: 'Directory', icon: '📖', path: '/residents', color: '#f8fafc', border: '#e2e8f0' },
    { name: 'Contacts', icon: '📞', path: '/contacts', color: '#fffbeb', border: '#fef08a' },
  ];

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>Loading your portal...</div>;
  }

  // Determine which apps to show based on the fetched role
  const displayApps = role === 'admin' ? adminApps : userApps;

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#1e293b', fontSize: '28px', marginBottom: '5px' }}>
        {role === 'admin' ? 'Management Portal' : 'Resident Portal'}
      </h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>Tap an icon to launch the application</p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
        gap: '20px',
        padding: '10px',
        justifyContent: 'center' // Centers the grid if there's only one app (like the Admin view)
      }}>
        {displayApps.map((app, index) => (
          <Link key={index} to={app.path} style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: app.color, 
              border: `2px solid ${app.border}`,
              borderRadius: '20px', 
              padding: '25px 10px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
              cursor: 'pointer', 
              transition: 'transform 0.2s, box-shadow 0.2s',
              aspectRatio: '1 / 1' 
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
            }}
            >
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>{app.icon}</div>
              <h3 style={{ color: '#0f172a', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{app.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}