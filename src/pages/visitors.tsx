import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import QRCode from 'react-qr-code';

export default function Visitors() {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    unit_number: '',
    resident_name: '',
    guest_name: '',
    guest_car_plate: '',
    visit_date: ''
  });

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setVisitors(data);
    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = () => {
    // Generates a random 6-character alphanumeric code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const accessCode = generateAccessCode();

    try {
      const { data, error } = await supabase
        .from('visitors')
        .insert([{ ...formData, access_code: accessCode }])
        .select();

      if (error) throw error;
      if (data) {
        setVisitors([data[0], ...visitors]);
      }
      
      setShowForm(false);
      setFormData({ unit_number: '', resident_name: '', guest_name: '', guest_car_plate: '', visit_date: '' });
    } catch (error: any) {
      alert("Error saving visitor: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Guest Invitations</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Invite Guest
        </button>
      </div>

      {/* Grid of Digital Passes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {visitors.map((visitor, index) => (
          <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Unit {visitor.unit_number}</span>
              <span style={{ 
                background: visitor.status === 'Pending' ? '#fef08a' : visitor.status === 'Arrived' ? '#bbf7d0' : '#e2e8f0',
                color: visitor.status === 'Pending' ? '#854d0e' : visitor.status === 'Arrived' ? '#166534' : '#475569',
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
              }}>
                {visitor.status}
              </span>
            </div>

            <h2 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{visitor.guest_name}</h2>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
              🚗 {visitor.guest_car_plate || 'No vehicle'} | 📅 {visitor.visit_date}
            </p>

            {/* The Generated QR Code */}
            <div style={{ background: 'white', padding: '10px', border: '2px solid #f1f5f9', borderRadius: '8px', marginBottom: '15px' }}>
              <QRCode value={visitor.access_code} size={120} />
            </div>
            
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Access Code</p>
            <h3 style={{ margin: '5px 0 0 0', color: '#2563eb', letterSpacing: '2px' }}>{visitor.access_code}</h3>
            
          </div>
        ))}
      </div>

      {/* Guest Invitation Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Generate Entry Pass</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Unit (e.g. A-01)" value={formData.unit_number} onChange={(e) => setFormData({...formData, unit_number: e.target.value})} required style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <input type="text" placeholder="Your Name" value={formData.resident_name} onChange={(e) => setFormData({...formData, resident_name: e.target.value})} required style={{ flex: 2, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <input type="text" placeholder="Guest Full Name" value={formData.guest_name} onChange={(e) => setFormData({...formData, guest_name: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Guest Car Plate (Optional)" value={formData.guest_car_plate} onChange={(e) => setFormData({...formData, guest_car_plate: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="date" value={formData.visit_date} onChange={(e) => setFormData({...formData, visit_date: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'Generating...' : 'Create Pass'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}