import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Residents() {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  // State variables for the pop-up form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // Tracks if we are updating
  const [formData, setFormData] = useState({
    full_name: '',
    unit_number: '',
    phone_number: ''
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase.from('residents').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) setResidents(data);
    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. DELETE FUNCTION
  const handleDelete = async (id: number) => {
    // Add a quick confirmation so we don't accidentally delete someone!
    if (!window.confirm("Are you sure you want to remove this resident?")) return;

    try {
      const { error } = await supabase.from('residents').delete().eq('id', id);
      if (error) throw error;
      
      // Instantly remove them from the screen
      setResidents(residents.filter(resident => resident.id !== id));
    } catch (error: any) {
      alert("Error deleting resident: " + error.message);
    }
  };

  // 2. OPEN EDIT FORM FUNCTION
  const openEditForm = (resident: any) => {
    setFormData({
      full_name: resident.full_name,
      unit_number: resident.unit_number,
      phone_number: resident.phone_number
    });
    setEditingId(resident.id);
    setShowForm(true);
  };

  // 3. CREATE & UPDATE FUNCTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        // UPDATE MODE
        const { data, error } = await supabase
          .from('residents')
          .update(formData)
          .eq('id', editingId)
          .select();

        if (error) throw error;
        if (data) {
          setResidents(residents.map(r => r.id === editingId ? data[0] : r));
        }
      } else {
        // CREATE MODE
        const { data, error } = await supabase
          .from('residents')
          .insert([formData])
          .select();

        if (error) throw error;
        if (data) {
          setResidents([...residents, data[0]]);
        }
      }
      
      // Close and reset form
      setShowForm(false);
      setEditingId(null);
      setFormData({ full_name: '', unit_number: '', phone_number: '' });
    } catch (error: any) {
      alert("Error saving resident: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading directory...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Resident Directory</h1>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ full_name: '', unit_number: '', phone_number: '' });
            setShowForm(true);
          }}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add Resident
        </button>
      </div>

      {/* Grid of Resident Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {residents.map((resident, index) => (
          <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>{resident.full_name}</h3>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                  Unit {resident.unit_number}
                </span>
              </div>
              <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                📞 {resident.phone_number}
              </p>
            </div>

            {/* Edit and Delete Buttons */}
            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <button 
                onClick={() => openEditForm(resident)}
                style={{ flex: 1, padding: '8px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Edit
              </button>
              <button 
                onClick={() => handleDelete(resident.id)}
                style={{ flex: 1, padding: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Delete
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* The Pop-up Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
              {editingId ? 'Edit Resident' : 'Register New Resident'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Unit Number (e.g. A-02)" 
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Phone Number (e.g. 012-3456789)" 
                value={formData.phone_number}
                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Record' : 'Save Resident')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}