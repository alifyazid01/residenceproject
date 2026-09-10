import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Contacts() {
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);

  // Edit Form State (Admin Only)
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: 'Management',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchSessionAndContacts();
  }, []);

  const fetchSessionAndContacts = async () => {
    setLoading(true);
    try {
      // 1. Fetch user role to determine if they are an Admin
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserRole(session.user.user_metadata?.role || 'user');
      }

      // 2. Fetch Contacts
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('department', { ascending: false });
        
      if (error) throw error;
      if (data) setContacts(data);
    } catch (error: any) {
      console.error("Error fetching contacts:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN FUNCTION: OPEN MODAL ---
  const openEditModal = (contact: any) => {
    setActiveContact(contact);
    setFormData({
      name: contact.name || '',
      role: contact.role || '',
      department: contact.department || 'Management',
      phone: contact.phone || '',
      email: contact.email || ''
    });
    setShowEditModal(true);
  };

  // --- ADMIN FUNCTION: SAVE UPDATES ---
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          name: formData.name.trim(),
          role: formData.role.trim(),
          department: formData.department,
          phone: formData.phone.trim(),
          email: formData.email.trim()
        })
        .eq('id', activeContact.id)
        .select();

      if (error) throw error;

      if (data) {
        // Update the specific contact in the state array so the UI refreshes instantly
        setContacts(contacts.map(c => c.id === activeContact.id ? data[0] : c));
      }

      setShowEditModal(false);
      setActiveContact(null);
    } catch (error: any) {
      alert("Error updating contact: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading contact directory...</div>
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
            Management & Emergency Contacts
          </h1>
          <p className="text-slate-600 font-medium">Official directory for the Joint Management Body and Security Guardhouse.</p>
        </div>

        {/* Auto-filling Responsive Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          
          {contacts.map((contact, index) => {
            
            // Premium Glass Badges for Departments
            let badgeStyle = "bg-slate-500/20 text-slate-800 border-slate-500/30";
            if (contact.department === 'Security') badgeStyle = "bg-rose-500/20 text-rose-800 border-rose-500/30";
            if (contact.department === 'Management') badgeStyle = "bg-indigo-500/20 text-indigo-800 border-indigo-500/30";
            if (contact.department === 'Maintenance') badgeStyle = "bg-amber-500/20 text-amber-800 border-amber-500/30";

            return (
              <div 
                key={index} 
                className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col hover:bg-white/50 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Thin Colored Top Bar for quick visual scanning */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${
                  contact.department === 'Security' ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
                  contact.department === 'Management' ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' :
                  contact.department === 'Maintenance' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-slate-400 to-slate-600'
                }`}></div>

                <div className="flex justify-between items-start mb-4 mt-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                    {contact.department}
                  </span>

                  {/* EDIT BUTTON (ADMIN ONLY) */}
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => openEditModal(contact)}
                      className="text-xs font-bold text-slate-800 hover:text-black bg-white/50 hover:bg-white px-3 py-1.5 rounded-lg border border-white/60 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight group-hover:transform group-hover:-translate-y-0.5 transition-transform">{contact.name}</h2>
                <p className="text-sm font-bold text-slate-500 mb-6">{contact.role}</p>
                
                {/* Glass Inner Box for Contact Info */}
                <div className="bg-white/30 p-4 rounded-2xl flex flex-col gap-3 border border-white/50 mt-auto shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="text-lg opacity-80">📞</span>
                    <span className={`text-sm ${contact.phone ? 'font-bold text-slate-800' : 'italic text-slate-400'}`}>
                      {contact.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg opacity-80">✉️</span>
                    <span className={`text-sm break-all ${contact.email ? 'font-bold text-slate-800' : 'italic text-slate-400'}`}>
                      {contact.email || 'Not provided'}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* ADMIN EDIT MODAL */}
        {showEditModal && activeContact && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-white/60">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Edit Contact</h2>
              <p className="text-slate-600 font-medium text-sm mb-6">Update details for <strong className="text-slate-800">{activeContact.name}</strong>.</p>
              
              <form onSubmit={handleUpdateContact} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Name / Title</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Head Security Guard"
                    required 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Department</label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all"
                  >
                    <option value="Security">Security</option>
                    <option value="Management">Management</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Phone (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Email (Optional)</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors shadow-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none">
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