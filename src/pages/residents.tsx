import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Residents() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_number: '',
    name: '',
    email: '',
    phone: ''
  });

  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [activeResident, setActiveResident] = useState<any>(null);
  const [isFamilySubmitting, setIsFamilySubmitting] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relationship: 'Spouse',
    phone: '',
    email: '' // Added independent email field
  });

  useEffect(() => {
    fetchSessionAndData();
  }, []);

  const fetchSessionAndData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setRole(session.user.user_metadata?.role || 'user');
    }

    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('unit_number', { ascending: true });
      
    if (!error && data) setResidents(data);
    setLoading(false);
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('residents')
        .insert([{
          unit_number: formData.unit_number.toUpperCase().trim(),
          name: formData.name,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone,
          family_members: [] 
        }])
        .select();

      if (error) {
        if (error.code === '23505') throw new Error("This email is already assigned.");
        throw error;
      }
      
      if (data) {
        const updatedList = [...residents, data[0]].sort((a, b) => a.unit_number.localeCompare(b.unit_number));
        setResidents(updatedList);
      }
      
      setFormData({ unit_number: '', name: '', email: '', phone: '' });
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} and their household entirely?`)) return;
    try {
      await supabase.from('residents').delete().eq('id', id);
      setResidents(residents.filter(r => r.id !== id));
    } catch (error: any) {
      alert("Error removing resident: " + error.message);
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFamilySubmitting(true);

    try {
      const newMember = {
        id: Date.now().toString(), 
        name: familyForm.name.trim(),
        relationship: familyForm.relationship,
        phone: familyForm.phone.trim(),
        email: familyForm.email.toLowerCase().trim() // Saving the independent login email
      };

      const currentMembers = activeResident.family_members || [];
      const updatedMembers = [...currentMembers, newMember];

      const { data, error } = await supabase
        .from('residents')
        .update({ family_members: updatedMembers })
        .eq('id', activeResident.id)
        .select();

      if (error) throw error;
      if (data) setResidents(residents.map(r => r.id === activeResident.id ? data[0] : r));

      setShowFamilyModal(false);
      setFamilyForm({ name: '', relationship: 'Spouse', phone: '', email: '' });
    } catch (error: any) {
      alert("Error adding family member: " + error.message);
    } finally {
      setIsFamilySubmitting(false);
    }
  };

  const handleRemoveFamilyMember = async (residentId: number, memberId: string) => {
    if (!window.confirm("Remove this person from the household?")) return;
    try {
      const residentToUpdate = residents.find(r => r.id === residentId);
      const updatedMembers = (residentToUpdate.family_members || []).filter((m: any) => m.id !== memberId);

      const { data, error } = await supabase
        .from('residents')
        .update({ family_members: updatedMembers })
        .eq('id', residentId)
        .select();

      if (error) throw error;
      if (data) setResidents(residents.map(r => r.id === residentId ? data[0] : r));
    } catch (error: any) {
      alert("Error removing member: " + error.message);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh] animate-pulse">Loading directory...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Resident Directory</h1>
        <p className="text-slate-500">Manage property units, primary owners, and independent household members.</p>
      </div>

      {role === 'admin' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Register Primary Resident</h3>
          </div>
          <form onSubmit={handleAddResident} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Unit</label>
              <input type="text" value={formData.unit_number} onChange={(e) => setFormData({...formData, unit_number: e.target.value})} required className="w-full p-2.5 rounded-lg border border-slate-300 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Primary Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" />
            </div>
            <div>
              <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 h-[46px]">
                Add Primary
              </button>
            </div>
          </form>
        </div>
      )}

      {residents.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border text-center text-slate-500">No residents found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {residents.map((resident) => {
            const familyMembers = resident.family_members || [];
            return (
              <div key={resident.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>

                <div className="flex items-start gap-4 mb-4 mt-2 border-b border-slate-100 pb-4">
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg font-bold text-lg border min-w-[70px] text-center">
                    {resident.unit_number}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{resident.name}</h3>
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mt-1">Primary Owner</p>
                  </div>
                </div>

                <div className="flex-grow mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Household ({familyMembers.length})</span>
                    {role === 'admin' && (
                      <button onClick={() => { setActiveResident(resident); setShowFamilyModal(true); }} className="text-xs font-bold text-blue-600">
                        + Add
                      </button>
                    )}
                  </div>
                  
                  <ul className="space-y-2 mt-2">
                    {familyMembers.map((member: any) => (
                      <li key={member.id} className="bg-slate-50 p-2.5 rounded-lg border flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.relationship} • {member.email || 'No login'}</div>
                        </div>
                        {role === 'admin' && (
                          <button onClick={() => handleRemoveFamilyMember(resident.id, member.id)} className="text-rose-500 p-1">✕</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {role === 'admin' && (
                  <div className="mt-auto">
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 mb-3 border">
                      <div className="truncate">📧 {resident.email}</div>
                      <div>📞 {resident.phone || 'N/A'}</div>
                    </div>
                    <button onClick={() => handleDelete(resident.id, resident.name)} className="w-full bg-rose-50 text-rose-600 border py-2 rounded-lg font-bold text-sm">
                      Delete Household
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showFamilyModal && activeResident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Add Household Member</h2>
            <p className="text-slate-500 text-sm mb-6">Unit <strong className="text-slate-700">{activeResident.unit_number}</strong></p>
            
            <form onSubmit={handleAddFamilyMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
                <input type="text" required value={familyForm.name} onChange={(e) => setFamilyForm({...familyForm, name: e.target.value})} className="w-full p-2.5 rounded-lg border outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Registered Email (For App Access)</label>
                <input type="email" required value={familyForm.email} onChange={(e) => setFamilyForm({...familyForm, email: e.target.value})} className="w-full p-2.5 rounded-lg border outline-none" placeholder="member@example.com" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Relationship</label>
                <select value={familyForm.relationship} onChange={(e) => setFamilyForm({...familyForm, relationship: e.target.value})} className="w-full p-2.5 rounded-lg border outline-none">
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Tenant / Roommate">Tenant / Roommate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phone (Optional)</label>
                <input type="text" value={familyForm.phone} onChange={(e) => setFamilyForm({...familyForm, phone: e.target.value})} className="w-full p-2.5 rounded-lg border outline-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowFamilyModal(false)} className="flex-1 p-3 bg-slate-100 rounded-lg font-bold text-slate-600">Cancel</button>
                <button type="submit" disabled={isFamilySubmitting} className="flex-[2] p-3 bg-blue-600 text-white rounded-lg font-bold">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}