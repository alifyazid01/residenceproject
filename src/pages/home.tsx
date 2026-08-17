import { Link } from 'react-router-dom';

export default function Home() {
  // Define our "Apps" with specific icons, paths, and pastel colors
  const apps = [
    { name: 'Admin Dashboard', icon: '🛡️', path: '/dashboard', color: '#f0f9ff', border: '#bae6fd' },
    { name: 'Facilities', icon: '🎾', path: '/facilities', color: '#f0fdf4', border: '#bbf7d0' },
    { name: 'Guests', icon: '👥', path: '/visitors', color: '#fdf4ff', border: '#fbcfe8' },
    { name: 'Parking', icon: '🚗', path: '/parking', color: '#fff7ed', border: '#fed7aa' },
    { name: 'Billing', icon: '💳', path: '/bills', color: '#fef2f2', border: '#fecaca' },
    { name: 'Directory', icon: '📖', path: '/residents', color: '#f8fafc', border: '#e2e8f0' },
    { name: 'Contacts', icon: '📞', path: '/contacts', color: '#fffbeb', border: '#fef08a' },
  ];

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#1e293b', fontSize: '28px', marginBottom: '5px' }}>Residence Apps</h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>Tap an icon to launch the application</p>

      {/* The App Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
        gap: '20px',
        padding: '10px'
      }}>
        {apps.map((app, index) => (
          <Link key={index} to={app.path} style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: app.color, 
              border: `2px solid ${app.border}`,
              borderRadius: '20px', // Creates that smooth Apple/Android app icon shape
              padding: '25px 10px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
              cursor: 'pointer', 
              transition: 'transform 0.2s, box-shadow 0.2s',
              aspectRatio: '1 / 1' // Forces the cards to be perfect squares
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