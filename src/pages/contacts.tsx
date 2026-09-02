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
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading contact directory...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Management & Emergency Contacts</h1>
        <p className="text-slate-500">Official directory for the Joint Management Body and Security Guardhouse.</p>
      </div>

      {/* Auto-filling Responsive Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        
        {contacts.map((contact, index) => {
          
          let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
          if (contact.department === 'Security') badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
          if (contact.department === 'Management') badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
          if (contact.department === 'Maintenance') badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";

          return (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                contact.department === 'Security' ? 'bg-rose-500' :
                contact.department === 'Management' ? 'bg-indigo-500' :
                contact.department === 'Maintenance' ? 'bg-amber-500' : 'bg-slate-500'
              }`}></div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                  {contact.department}
                </span>

                {/* EDIT BUTTON (ADMIN ONLY) */}
                {userRole === 'admin' && (
                  <button 
                    onClick={() => openEditModal(contact)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight">{contact.name}</h2>
              <p className="text-sm font-bold text-slate-500 mb-6">{contact.role}</p>
              
              <div className="bg-slate-50 p-4 rounded-lg flex flex-col gap-3 border border-slate-100 mt-auto">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📞</span>
                  <span className={`text-sm ${contact.phone ? 'font-bold text-slate-900' : 'italic text-slate-400'}`}>
                    {contact.phone || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">✉️</span>
                  <span className={`text-sm break-all ${contact.email ? 'font-bold text-slate-900' : 'italic text-slate-400'}`}>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Edit Contact</h2>
            <p className="text-slate-500 text-sm mb-6">Update details for <strong className="text-slate-700">{activeContact.name}</strong>.</p>
            
            <form onSubmit={handleUpdateContact} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Name / Title</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                <input 
                  type="text" 
                  placeholder="e.g. Head Security Guard"
                  required 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                <select 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Security">Security</option>
                  <option value="Management">Management</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email (Optional)</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}