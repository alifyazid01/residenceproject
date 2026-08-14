import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    residents: 0,
    parkingBays: 0,
    pendingBills: 0,
    pendingGuests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // 1. Count Residents
      const { count: residentCount } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true });

      // 2. Count Registered Vehicles in Parking Bays
      const { count: parkingCount } = await supabase
        .from('parking_bays')
        .select('*', { count: 'exact', head: true })
        .not('vehicle_plate', 'is', null);

      // 3. Count Pending Bills
      const { count: billsCount } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      // 4. Count Pending Guest Invites
      const { count: guestsCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      setStats({
        residents: residentCount || 0,
        parkingBays: parkingCount || 0,
        pendingBills: billsCount || 0,
        pendingGuests: guestsCount || 0
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading system overview...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px', textAlign: 'center' }}>System Overview</h1>
      
      {/* 4-Column Responsive Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '20px' 
      }}>
        
        {/* Card 1: Residents */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '15px' }}>Registered Residents</h3>
          <p style={{ margin: 0, color: '#3b82f6', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.residents}
          </p>
        </div>

        {/* Card 2: Parking */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '15px' }}>Active Vehicles</h3>
          <p style={{ margin: 0, color: '#10b981', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.parkingBays}
          </p>
        </div>

        {/* Card 3: Bills */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '15px' }}>Pending Bills</h3>
          <p style={{ margin: 0, color: '#f59e0b', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.pendingBills}
          </p>
        </div>

        {/* Card 4: Guests */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '15px' }}>Pending Guests</h3>
          <p style={{ margin: 0, color: '#8b5cf6', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.pendingGuests}
          </p>
        </div>

      </div>
    </div>
  );
}