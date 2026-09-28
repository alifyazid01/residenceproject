import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Announcements() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);
  
  const [complaintForm, setComplaintForm] = useState({ unit_number: '', subject: '', description: '' });
  const [complaintFile, setComplaintFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const currentRole = session ? (session.user.user_metadata?.role || 'user') : 'user';
    setRole(currentRole);

    const { data: aData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (aData) setAnnouncements(aData);

    if (currentRole === 'admin') {
      const { data: cData } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (cData) setComplaints(cData);
    }
    
    // === NOTIFICATION MARK AS READ LOGIC ===
    const now = new Date().toISOString();
    localStorage.setItem('last_read_announcements', now);
    if (currentRole === 'admin') {
      localStorage.setItem('last_read_complaints', now);
    }
    // Instantly tell the NavBar to clear the red badges
    window.dispatchEvent(new Event('read_notifications'));
    // =======================================

    setLoading(false);
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('portal_uploads')
      .upload(fileName, file);

    if (uploadError) throw new Error("Failed to upload file: " + uploadError.message);

    const { data } = supabase.storage.from('portal_uploads').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let image_url = null;
      if (announcementFile) {
        image_url = await uploadFile(announcementFile, 'announcements');
      }

      const payload = { ...announcementForm, image_url };
      const { data, error } = await supabase.from('announcements').insert([payload]).select();
      
      if (error) throw error;
      if (data) setAnnouncements([data[0], ...announcements]);
      
      setAnnouncementForm({ title: '', content: '' });
      setAnnouncementFile(null);
      alert("Announcement posted successfully!");
    } catch (error: any) {
      alert("Error posting: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if(!window.confirm("Delete this announcement?")) return;
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let attachment_url = null;
      if (complaintFile) {
        attachment_url = await uploadFile(complaintFile, 'complaints');
      }

      const payload = { ...complaintForm, attachment_url };
      const { error } = await supabase.from('complaints').insert([payload]);
      
      if (error) throw error;
      
      setComplaintForm({ unit_number: '', subject: '', description: '' });
      setComplaintFile(null);
      alert("Report submitted successfully. The JMB will review it shortly.");
    } catch (error: any) {
      alert("Error submitting report: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveComplaint = async (id: number) => {
    await supabase.from('complaints').update({ status: 'Resolved' }).eq('id', id);
    setComplaints(complaints.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading module...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans pb-20 pt-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* LEFT COLUMN: ANNOUNCEMENTS FEED */}
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notice Board</h1>
            <p className="text-slate-600">Latest updates from the Management.</p>
          </div>

          {/* Admin Posting Form */}
          {role === 'admin' && (
            <form onSubmit={handlePostAnnouncement} className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm mb-8">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><span>📢</span> Post New Announcement</h3>
              
              <input type="text" placeholder="Announcement Title" required value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full mb-3 p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500" />
              
              <textarea placeholder="Write the details here..." required rows={4} value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full mb-4 p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500"></textarea>
              
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Attach Media (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setAnnouncementFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 outline-none cursor-pointer"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50">
                {isSubmitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>
          )}

          {/* Announcements List */}
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-slate-500 italic">No announcements posted yet.</p>
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  {role === 'admin' && (
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="absolute top-4 right-4 text-white bg-rose-500/80 hover:bg-rose-600 px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-bold text-xs z-10 shadow-sm">Delete</button>
                  )}
                  
                  {ann.image_url && (
                    <div className="w-full h-48 sm:h-64 bg-slate-100 overflow-hidden">
                      <img src={ann.image_url} alt="Announcement" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="text-xs font-bold text-blue-500 mb-2 uppercase tracking-wider">{new Date(ann.created_at).toLocaleDateString()}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{ann.title}</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{ann.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: COMPLAINTS / REPORTS */}
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reports & Complaints</h1>
            <p className="text-slate-600">{role === 'admin' ? 'Manage resident submissions.' : 'Submit an issue to the management.'}</p>
          </div>

          {/* User Submit Form */}
          {role === 'user' ? (
            <form onSubmit={handleSubmitComplaint} className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Submit a Report</h3>
              
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your Unit Number</label>
              <input type="text" placeholder="e.g. A-12-04" required value={complaintForm.unit_number} onChange={e => setComplaintForm({...complaintForm, unit_number: e.target.value})} className="w-full mb-5 p-3 rounded-xl border border-slate-300 outline-none focus:border-slate-900 bg-slate-50" />
              
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subject</label>
              <input type="text" placeholder="What is the issue about?" required value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} className="w-full mb-5 p-3 rounded-xl border border-slate-300 outline-none focus:border-slate-900 bg-slate-50" />
              
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
              <textarea placeholder="Please describe the problem in detail..." required rows={5} value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} className="w-full mb-6 p-3 rounded-xl border border-slate-300 outline-none focus:border-slate-900 bg-slate-50"></textarea>
              
              <div className="mb-8 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Attach Evidence (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setComplaintFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 outline-none cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-2">Upload a photo or document related to the issue.</p>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Send to Management'}
              </button>
            </form>
          ) : (
            /* Admin Complaints Inbox */
            <div className="space-y-4">
              {complaints.length === 0 ? (
                <p className="text-slate-500 italic">No complaints received.</p>
              ) : (
                complaints.map(comp => (
                  <div key={comp.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs rounded-full mb-2">Unit {comp.unit_number}</span>
                        <h4 className="font-bold text-slate-900">{comp.subject}</h4>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${comp.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {comp.status}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-4">{comp.description}</p>
                    
                    {comp.attachment_url && (
                      <div className="mb-4">
                        <a 
                          href={comp.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          📎 View Attachment
                        </a>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3 mt-2">
                      <span className="text-slate-400">{new Date(comp.created_at).toLocaleString()}</span>
                      {comp.status === 'Pending' && (
                        <button onClick={() => handleResolveComplaint(comp.id)} className="font-bold text-emerald-600 hover:text-emerald-800 transition-colors">Mark Resolved</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}