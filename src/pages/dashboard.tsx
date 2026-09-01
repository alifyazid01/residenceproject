import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeVisitors: 0,
    pendingBills: 0,
    totalUnits: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // 1. Count total registered residents
      const { count: residentCount } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true });

      // 2. Count visitors expected today or currently in the building
      const { count: visitorCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pending', 'Arrived']);

      // 3. Count unpaid/pending bills
      const { count: billCount } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending'); // Adjust to match your exact bill status string

      // 4. Count total property units
      const { count: unitCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalResidents: residentCount || 0,
        activeVisitors: visitorCount || 0,
        pendingBills: billCount || 0,
        totalUnits: unitCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Live Statistics...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Admin Command Center</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Live overview of your residence system data.</p>
      </div>

      {/* KPI STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Residents Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Residents</span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', margin: '10px 0' }}>{stats.totalResidents}</span>
          <Link to="/residents" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>View Directory →</Link>
        </div>

        {/* Units Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Registered Units</span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', margin: '10px 0' }}>{stats.totalUnits}</span>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Database capacity</span>
        </div>

        {/* Visitors Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Active/Pending Guests</span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', margin: '10px 0' }}>{stats.activeVisitors}</span>
          <Link to="/guests" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>Manage Access →</Link>
        </div>

        {/* Bills Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Pending Bills</span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444', margin: '10px 0' }}>{stats.pendingBills}</span>
          <Link to="/bills" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>View Finances →</Link>
        </div>

      </div>

      {/* QUICK ACTIONS SECTION */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>System Modules</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link to="/facilities" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', color: '#334155', textDecoration: 'none', fontWeight: 'bold' }}>🎾 Facilities</Link>
          <Link to="/parking" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', color: '#334155', textDecoration: 'none', fontWeight: 'bold' }}>🚗 Parking</Link>
          <Link to="/contacts" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', color: '#334155', textDecoration: 'none', fontWeight: 'bold' }}>📞 Contacts</Link>
        </div>
      </div>
    </div>
  );
}