import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [parkingData, setParkingData] = useState<any[]>([]);
  const [stats, setStats] = useState({ residents: 0, parking: 0, bills: 0 });
  
  // New state variables for the pop-up form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    resident_name: '',
    vehicle_plate: '',
    spot_number: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch parking data
      const { data: parking, error: parkingError } = await supabase.from('parking').select('*');
      if (parkingError) throw parkingError;

      // 2. Fetch residents data
      const { data: residents, error: residentsError } = await supabase.from('residents').select('*');
      if (residentsError) throw residentsError;

      // 3. Fetch only the pending bills
      const { data: pendingBills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('status', 'Pending');
      if (billsError) throw billsError;

      if (parking) {
        setParkingData(parking);
      }

      // Update all three stats cards!
      setStats({
        residents: residents ? residents.length : 0,
        parking: parking ? parking.length : 0,
        bills: pendingBills ? pendingBills.length : 0 // Now pulling real data!
      });

    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle submitting the new form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('parking')
        .insert([formData])
        .select();

      if (error) throw error;

      if (data) {
        // Add the new row to the table instantly without refreshing
        setParkingData([...parkingData, data[0]]);
        setStats(prev => ({ ...prev, parking: prev.parking + 1 }));
        
        // Close the form and reset it
        setShowForm(false);
        setFormData({ resident_name: '', vehicle_plate: '', spot_number: '' });
      }
    } catch (error: any) {
      alert("Error adding record: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading system data...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>System Overview</h1>
      
      {/* Statistics Cards Grid */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', background: '#f8fafc', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '16px' }}>Registered Residents</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.residents}</p>
        </div>
        <div style={{ flex: '1 1 250px', background: '#f8fafc', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '16px' }}>Active Parking Spaces</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.parking}</p>
        </div>
        <div style={{ flex: '1 1 250px', background: '#f8fafc', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '16px' }}>Pending Bills</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.bills}</p>
        </div>
      </div>

      {/* Main Data Table Section */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Parking Records</h2>
          <button 
            onClick={() => setShowForm(true)}
            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add New
          </button>
        </div>
        
        {parkingData.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>ID</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Resident Name</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Vehicle Plate</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Spot Number</th>
              </tr>
            </thead>
            <tbody>
              {parkingData.map((spot, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px', color: '#64748b' }}>{spot.id}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{spot.resident_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', letterSpacing: '1px', fontFamily: 'monospace' }}>
                      {spot.vehicle_plate}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {spot.spot_number}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '8px' }}>
            No parking data found.
          </div>
        )}
      </div>

      {/* The Pop-up Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Register New Vehicle</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="Resident Name" 
                value={formData.resident_name}
                onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Vehicle Plate (e.g. JWA 1234)" 
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Spot Number (e.g. D-14)" 
                value={formData.spot_number}
                onChange={(e) => setFormData({...formData, spot_number: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}