import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Residents() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  // Admin Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_number: '',
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchSessionAndData();
  }, []);

  const fetchSessionAndData = async () => {
    setLoading(true);
    // 1. Get user role
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setRole(session.user.user_metadata?.role || 'user');
    }

    // 2. Fetch all residents from the database
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('unit_number', { ascending: true });
      
    if (error) {
      console.error("Error fetching residents:", error.message);
    } else if (data) {
      setResidents(data);
    }
    setLoading(false);
  };

  // --- ADMIN FUNCTION: ADD A RESIDENT TO A UNIT ---
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('residents')
        .insert([{
          unit_number: formData.unit_number,
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }])
        .select();

      if (error) {
        // Handle the unique email error gracefully
        if (error.code === '23505') throw new Error("This email is already assigned to a unit.");
        throw error;
      }
      
      if (data) {
        // Add the new resident to the list and sort by unit number
        const updatedList = [...residents, data[0]].sort((a, b) => a.unit_number.localeCompare(b.unit_number));
        setResidents(updatedList);
      }
      
      // Clear form
      setFormData({ unit_number: '', name: '', email: '', phone: '' });
      alert("Resident successfully assigned to unit!");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ADMIN FUNCTION: REMOVE RESIDENT ---
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the directory?`)) return;
    
    try {
      const { error } = await supabase.from('residents').delete().eq('id', id);
      if (error) throw error;
      setResidents(residents.filter(r => r.id !== id));
    } catch (error: any) {
      alert("Error removing resident: " + error.message);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading directory...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Resident Directory</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>
          {role === 'admin' ? 'Manage property units and assign resident accounts.' : 'Official property directory.'}
        </p>
      </div>

      {/* ADMIN ONLY: Form to assign units to emails */}
      {role === 'admin' && (
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Assign Unit Profile</h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '-10px', marginBottom: '20px' }}>
            Enter the exact email the resident used to register their account to link their data.
          </p>
          
          <form onSubmit={handleAddResident} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Unit Number</label>
              <input type="text" placeholder="e.g. A-12-04" value={formData.unit_number} onChange={(e) => setFormData({...formData, unit_number: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Full Name</label>
              <input type="text" placeholder="Resident Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Registered Email</label>
              <input type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Phone (Optional)</label>
              <input type="text" placeholder="012-3456789" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}>
              {isSubmitting ? 'Saving...' : 'Add Resident'}
            </button>
          </form>
        </div>
      )}

      {/* SHARED VIEW: The Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {residents.length === 0 ? (
          <p style={{ color: '#64748b' }}>No residents have been assigned to units yet.</p>
        ) : (
          residents.map((resident) => (
            <div key={resident.id} style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px' }}>
                  {resident.unit_number}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 3px 0', color: '#0f172a' }}>{resident.name}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Resident Profile</p>
                </div>
              </div>

              {/* Only Admins can see contact info for privacy */}
              {role === 'admin' && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#475569', marginBottom: '15px' }}>
                  <div style={{ marginBottom: '5px' }}>📧 {resident.email}</div>
                  <div>📞 {resident.phone || 'Not provided'}</div>
                </div>
              )}

              {/* Admin Delete Button */}
              {role === 'admin' && (
                <button 
                  onClick={() => handleDelete(resident.id, resident.name)}
                  style={{ width: '100%', background: '#fee2e2', color: '#991b1b', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  Remove from Directory
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}