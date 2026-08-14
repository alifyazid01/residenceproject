import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Residents() {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  // State variables for the Resident form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    unit_number: '',
    phone_number: '',
    email: '',
    role: 'Resident'
  });

  // NEW: State variables for the Family Management Modal
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [activeResident, setActiveResident] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyFormData, setFamilyFormData] = useState({
    full_name: '',
    relationship: 'Spouse',
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

  // --- RESIDENT CRUD LOGIC ---
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this resident? (This will also delete their family members)")) return;

    try {
      const { error } = await supabase.from('residents').delete().eq('id', id);
      if (error) throw error;
      setResidents(residents.filter(resident => resident.id !== id));
    } catch (error: any) {
      alert("Error deleting resident: " + error.message);
    }
  };

  const openEditForm = (resident: any) => {
    setFormData({
      full_name: resident.full_name,
      unit_number: resident.unit_number,
      phone_number: resident.phone_number,
      email: resident.email || '',
      role: resident.role || 'Resident'
    });
    setEditingId(resident.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { data, error } = await supabase.from('residents').update(formData).eq('id', editingId).select();
        if (error) throw error;
        if (data) setResidents(residents.map(r => r.id === editingId ? data[0] : r));
      } else {
        const { data, error } = await supabase.from('residents').insert([formData]).select();
        if (error) throw error;
        if (data) setResidents([...residents, data[0]]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ full_name: '', unit_number: '', phone_number: '', email: '', role: 'Resident' });
    } catch (error: any) {
      alert("Error saving resident: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FAMILY MANAGEMENT LOGIC ---
  const openFamilyModal = async (resident: any) => {
    setActiveResident(resident);
    setShowFamilyModal(true);
    try {
      // Fetch family members specifically linked to this resident
      const { data, error } = await supabase.from('family_members').select('*').eq('resident_id', resident.id);
      if (error) throw error;
      if (data) setFamilyMembers(data);
    } catch (error: any) {
      console.error("Error fetching family:", error.message);
    }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([{ ...familyFormData, resident_id: activeResident.id }])
        .select();

      if (error) throw error;
      if (data) {
        setFamilyMembers([...familyMembers, data[0]]);
        setFamilyFormData({ full_name: '', relationship: 'Spouse', phone_number: '' });
      }
    } catch (error: any) {
      alert("Error adding family member: " + error.message);
    }
  };

  const handleDeleteFamily = async (id: number) => {
    if (!window.confirm("Remove this family member?")) return;
    try {
      const { error } = await supabase.from('family_members').delete().eq('id', id);
      if (error) throw error;
      setFamilyMembers(familyMembers.filter(member => member.id !== id));
    } catch (error: any) {
      alert("Error removing family member: " + error.message);
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
            setFormData({ full_name: '', unit_number: '', phone_number: '', email: '', role: 'Resident' });
            setShowForm(true);
          }}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add Resident
        </button>
      </div>

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
              
              <p style={{ margin: '0 0 5px 0', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {resident.role}
              </p>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>
                📞 {resident.phone_number}
              </p>
              <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                ✉️ {resident.email || 'No email provided'}
              </p>
            </div>

            {/* Manage Family Button added here */}
            <button 
                onClick={() => openFamilyModal(resident)}
                style={{ width: '100%', marginBottom: '15px', padding: '8px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                👪 Manage Family
            </button>

            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <button onClick={() => openEditForm(resident)} style={{ flex: 1, padding: '8px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Edit
              </button>
              <button onClick={() => handleDelete(resident.id)} style={{ flex: 1, padding: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- RESIDENT POP-UP FORM --- */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{editingId ? 'Edit Resident' : 'Register New Resident'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Full Name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Unit Number" value={formData.unit_number} onChange={(e) => setFormData({...formData, unit_number: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Phone Number" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                <option value="Resident">Resident</option>
                <option value="Tenant">Tenant</option>
              </select>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'Saving...' : (editingId ? 'Update Record' : 'Save Resident')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FAMILY MANAGEMENT POP-UP FORM --- */}
      {showFamilyModal && activeResident && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Household Members</h2>
            <p style={{ color: '#64748b', marginTop: 0, marginBottom: '20px' }}>Unit {activeResident.unit_number} - {activeResident.full_name}</p>
            
            {/* List existing family members */}
            <div style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
              {familyMembers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No family members added yet.</p>
              ) : (
                familyMembers.map((member, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '5px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{member.full_name} <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px' }}>{member.relationship}</span></div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{member.phone_number || 'No phone'}</div>
                    </div>
                    <button onClick={() => handleDeleteFamily(member.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✖</button>
                  </div>
                ))
              )}
            </div>

            {/* Add new family member form */}
            <form onSubmit={handleFamilySubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" placeholder="Name" value={familyFormData.full_name} onChange={(e) => setFamilyFormData({...familyFormData, full_name: e.target.value})} required style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={familyFormData.relationship} onChange={(e) => setFamilyFormData({...familyFormData, relationship: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Parent">Parent</option>
                <option value="Other">Other</option>
              </select>
              <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
            </form>

            <button onClick={() => setShowFamilyModal(false)} style={{ width: '100%', padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Close Window
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}