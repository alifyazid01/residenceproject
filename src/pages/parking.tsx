import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Parking() {
  const [loading, setLoading] = useState(true);
  const [bays, setBays] = useState<any[]>([]);
  
  // Form state for updating a bay's vehicle details
  const [showForm, setShowForm] = useState(false);
  const [activeBay, setActiveBay] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    resident_name: '',
    vehicle_plate: '',
    vehicle_model: ''
  });

  useEffect(() => {
    fetchParkingBays();
  }, []);

  const fetchParkingBays = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_bays')
        .select('*')
        .order('unit_number', { ascending: true })
        .order('bay_number', { ascending: true });
        
      if (error) throw error;
      if (data) setBays(data);
    } catch (error: any) {
      console.error("Error fetching parking data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateForm = (bay: any) => {
    setActiveBay(bay);
    setFormData({
      resident_name: bay.resident_name || '',
      vehicle_plate: bay.vehicle_plate || '',
      vehicle_model: bay.vehicle_model || ''
    });
    setShowForm(true);
  };

  const handleClearBay = async (id: number) => {
    if (!window.confirm("Are you sure you want to unregister this vehicle? The bay will be marked as empty.")) return;

    try {
      const { error } = await supabase
        .from('parking_bays')
        .update({ vehicle_plate: null, vehicle_model: null, resident_name: null })
        .eq('id', id);

      if (error) throw error;
      
      setBays(bays.map(bay => bay.id === id ? { ...bay, vehicle_plate: null, vehicle_model: null, resident_name: null } : bay));
    } catch (error: any) {
      alert("Error clearing bay: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('parking_bays')
        .update({
          resident_name: formData.resident_name,
          vehicle_plate: formData.vehicle_plate,
          vehicle_model: formData.vehicle_model,
          last_updated: new Date().toISOString()
        })
        .eq('id', activeBay.id)
        .select();

      if (error) throw error;

      if (data) {
        setBays(bays.map(bay => bay.id === activeBay.id ? data[0] : bay));
      }
      
      setShowForm(false);
      setActiveBay(null);
    } catch (error: any) {
      alert("Error updating vehicle details: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading parking records...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Vehicle & Parking Management</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {bays.map((bay, index) => (
          <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Assigned To</span>
                  <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px' }}>Unit {bay.unit_number}</h3>
                </div>
                <div style={{ background: '#1e293b', color: 'white', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px' }}>
                  {bay.bay_number}
                </div>
              </div>
              
              <div style={{ background: bay.vehicle_plate ? '#f8fafc' : '#fef2f2', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${bay.vehicle_plate ? '#e2e8f0' : '#fca5a5'}` }}>
                {bay.vehicle_plate ? (
                  <>
                    <p style={{ margin: '0 0 5px 0', color: '#3b82f6', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>
                      {bay.vehicle_plate}
                    </p>
                    <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '14px' }}>
                      🚗 {bay.vehicle_model}
                    </p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                      👤 Registered to: <strong>{bay.resident_name}</strong>
                    </p>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#ef4444', padding: '10px 0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Empty Bay</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>No vehicle registered</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => openUpdateForm(bay)}
                style={{ flex: 2, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {bay.vehicle_plate ? 'Update Vehicle' : 'Register Vehicle'}
              </button>
              
              {bay.vehicle_plate && (
                <button 
                  onClick={() => handleClearBay(bay.id)}
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Clear
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* Update Vehicle Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Register Vehicle</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
              Updating Bay <strong>{activeBay?.bay_number}</strong> for Unit <strong>{activeBay?.unit_number}</strong>
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="License Plate (e.g. JQM 1234)" 
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', textTransform: 'uppercase' }}
              />
              <input 
                type="text" 
                placeholder="Vehicle Model (e.g. Honda Wave 125)" 
                value={formData.vehicle_model}
                onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Resident / Owner Name" 
                value={formData.resident_name}
                onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}