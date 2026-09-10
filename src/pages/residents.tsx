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
    email: '' 
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
        email: familyForm.email.toLowerCase().trim() 
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading directory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            Resident Directory
          </h1>
          <p className="text-slate-600 font-medium">Manage property units, primary owners, and independent household members.</p>
        </div>

        {/* ADMIN VIEW: REGISTER PRIMARY RESIDENT */}
        {role === 'admin' && (
          <div className="bg-white/40 backdrop-blur-2xl p-6 md:p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] mb-10 transition-all hover:bg-white/50">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Register Primary Resident</h3>
            <form onSubmit={handleAddResident} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Unit</label>
                <input type="text" value={formData.unit_number} onChange={(e) => setFormData({...formData, unit_number: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium uppercase shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Primary Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Phone</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" />
              </div>
              <div>
                <button type="submit" disabled={isSubmitting} className="w-full px-4 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none h-[50px]">
                  Add Primary
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RESIDENTS DIRECTORY GRID */}
        {residents.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-2xl p-12 rounded-3xl border border-white/60 text-center text-slate-600 font-medium">
            No residents found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {residents.map((resident) => {
              const familyMembers = resident.family_members || [];
              return (
                <div key={resident.id} className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col relative overflow-hidden hover:bg-white/50 transition-all group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-700 to-slate-900"></div>

                  <div className="flex items-start gap-4 mb-5 mt-2 border-b border-white/50 pb-5">
                    <div className="bg-white/60 text-slate-900 p-3 rounded-2xl font-extrabold text-xl border border-white/80 min-w-[75px] text-center shadow-sm">
                      {resident.unit_number}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight group-hover:translate-x-1 transition-transform">{resident.name}</h3>
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mt-1.5">Primary Owner</p>
                    </div>
                  </div>

                  <div className="flex-grow mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Household ({familyMembers.length})</span>
                      {role === 'admin' && (
                        <button onClick={() => { setActiveResident(resident); setShowFamilyModal(true); }} className="text-xs font-bold text-slate-800 bg-white/50 hover:bg-white border border-white/60 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                          + Add Member
                        </button>
                      )}
                    </div>
                    
                    <ul className="space-y-3 mt-3">
                      {familyMembers.map((member: any) => (
                        <li key={member.id} className="bg-white/30 p-3.5 rounded-2xl border border-white/50 flex justify-between items-center shadow-inner">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{member.name}</div>
                            <div className="text-xs font-medium text-slate-600 mt-0.5">{member.relationship} • <span className="italic">{member.email || 'No login'}</span></div>
                          </div>
                          {role === 'admin' && (
                            <button onClick={() => handleRemoveFamilyMember(resident.id, member.id)} className="text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 p-2 rounded-lg transition-colors" title="Remove Member">
                              ✕
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {role === 'admin' && (
                    <div className="mt-auto border-t border-white/50 pt-5">
                      <div className="bg-white/40 p-4 rounded-2xl text-xs font-medium text-slate-700 mb-4 border border-white/60 shadow-inner flex flex-col gap-2">
                        <div className="truncate flex items-center gap-2"><span className="opacity-70">📧</span> {resident.email}</div>
                        <div className="flex items-center gap-2"><span className="opacity-70">📞</span> {resident.phone || 'N/A'}</div>
                      </div>
                      <button onClick={() => handleDelete(resident.id, resident.name)} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/20 py-3 rounded-xl font-bold text-sm transition-all">
                        Delete Household
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ADD HOUSEHOLD MEMBER MODAL */}
        {showFamilyModal && activeResident && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-white/60">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Add Household Member</h2>
              <p className="text-slate-600 text-sm mb-6 font-medium">Adding to Unit <strong className="text-slate-900 bg-white/50 px-2 py-0.5 rounded-md border border-white/60">{activeResident.unit_number}</strong></p>
              
              <form onSubmit={handleAddFamilyMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input type="text" required value={familyForm.name} onChange={(e) => setFamilyForm({...familyForm, name: e.target.value})} className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium transition-all shadow-sm" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Registered Email (For App Access)</label>
                  <input type="email" required value={familyForm.email} onChange={(e) => setFamilyForm({...familyForm, email: e.target.value})} placeholder="member@example.com" className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium transition-all shadow-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Relationship</label>
                  <select value={familyForm.relationship} onChange={(e) => setFamilyForm({...familyForm, relationship: e.target.value})} className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium transition-all shadow-sm">
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Tenant / Roommate">Tenant / Roommate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Phone (Optional)</label>
                  <input type="text" value={familyForm.phone} onChange={(e) => setFamilyForm({...familyForm, phone: e.target.value})} className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium transition-all shadow-sm" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowFamilyModal(false)} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors shadow-sm">Cancel</button>
                  <button type="submit" disabled={isFamilySubmitting} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none">Add Member</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}