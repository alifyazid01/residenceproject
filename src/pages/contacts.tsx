import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Contacts() {
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', department: 'Management', phone: '', email: '' });

  useEffect(() => {
    fetchSessionAndContacts();
  }, []);

  const fetchSessionAndContacts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserRole(session.user.user_metadata?.role || 'user');

      const { data, error } = await supabase.from('contacts').select('*').order('department', { ascending: false });
      if (error) throw error;
      if (data) setContacts(data);
    } catch (error: any) {
      console.error("Error fetching contacts:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (contact: any) => {
    setActiveContact(contact);
    setFormData({ name: contact.name || '', role: contact.role || '', department: contact.department || 'Management', phone: contact.phone || '', email: contact.email || '' });
    setShowEditModal(true);
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({ name: formData.name.trim(), role: formData.role.trim(), department: formData.department, phone: formData.phone.trim(), email: formData.email.trim() })
        .eq('id', activeContact.id)
        .select();

      if (error) throw error;
      if (data) setContacts(contacts.map(c => c.id === activeContact.id ? data[0] : c));
      setShowEditModal(false);
      setActiveContact(null);
    } catch (error: any) {
      alert("Error updating contact: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-50 flex justify-center items-center font-bold uppercase tracking-widest text-black text-sm">Loading Directory...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="border-b-2 border-black pb-8 mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-black uppercase tracking-tighter mb-2">Directory.</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Management & Emergency Contacts</p>
        </div>

        {/* Directory Grid - Sharp, High Contrast Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {contacts.map((contact, index) => (
            <div key={index} className="bg-white p-8 border-2 border-neutral-200 hover:border-black transition-colors flex flex-col h-full rounded-none">
              
              <div className="flex justify-between items-start mb-6">
                <span className="border-2 border-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black">
                  {contact.department}
                </span>

                {userRole === 'admin' && (
                  <button onClick={() => openEditModal(contact)} className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors underline">
                    Edit
                  </button>
                )}
              </div>
              
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-1">{contact.name}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-8">{contact.role}</p>
              
              <div className="flex flex-col gap-4 mt-auto pt-6 border-t-2 border-neutral-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">TEL //</span>
                  <span className={`text-sm ${contact.phone ? 'font-black text-black tracking-tight' : 'font-bold text-neutral-300 uppercase text-xs'}`}>
                    {contact.phone || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">MAIL //</span>
                  <span className={`text-sm break-all ${contact.email ? 'font-black text-black tracking-tight' : 'font-bold text-neutral-300 uppercase text-xs'}`}>
                    {contact.email || 'N/A'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* ADMIN EDIT MODAL */}
        {showEditModal && activeContact && (
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-10 border-2 border-black w-full max-w-lg rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-2">Edit Contact.</h2>
              <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px] mb-8">Update Details For {activeContact.name}</p>
              
              <form onSubmit={handleUpdateContact} className="space-y-6">
                
                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Name / Title</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Role</label>
                  <input type="text" required value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Department</label>
                  <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none cursor-pointer">
                    <option value="Security">Security</option>
                    <option value="Management">Management</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Phone (Optional)</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Email (Optional)</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none" />
                  </div>
                </div>

                <div className="flex gap-4 pt-6 mt-4 border-t-2 border-neutral-100">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-transparent text-black border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}