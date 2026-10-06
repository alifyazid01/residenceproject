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
    
    const now = new Date().toISOString();
    localStorage.setItem('last_read_announcements', now);
    if (currentRole === 'admin') localStorage.setItem('last_read_complaints', now);
    window.dispatchEvent(new Event('read_notifications'));

    setLoading(false);
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('portal_uploads').upload(fileName, file);
    if (uploadError) throw new Error("Failed to upload: " + uploadError.message);
    const { data } = supabase.storage.from('portal_uploads').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let image_url = null;
      if (announcementFile) image_url = await uploadFile(announcementFile, 'announcements');

      const payload = { ...announcementForm, image_url };
      const { data, error } = await supabase.from('announcements').insert([payload]).select();
      
      if (error) throw error;
      if (data) setAnnouncements([data[0], ...announcements]);
      
      setAnnouncementForm({ title: '', content: '' });
      setAnnouncementFile(null);
    } catch (error: any) {
      alert("Error: " + error.message);
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
      if (complaintFile) attachment_url = await uploadFile(complaintFile, 'complaints');

      const payload = { ...complaintForm, attachment_url };
      const { error } = await supabase.from('complaints').insert([payload]);
      
      if (error) throw error;
      
      setComplaintForm({ unit_number: '', subject: '', description: '' });
      setComplaintFile(null);
      alert("Report submitted successfully.");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveComplaint = async (id: number) => {
    await supabase.from('complaints').update({ status: 'Resolved' }).eq('id', id);
    setComplaints(complaints.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading Board...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        
        {/* LEFT COLUMN: ANNOUNCEMENTS */}
        <div>
          <div className="border-b-2 border-black pb-6 mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tighter uppercase mb-2">Notice Board.</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Official Broadcasts</p>
          </div>

          {role === 'admin' && (
            <form onSubmit={handlePostAnnouncement} className="bg-white border-2 border-black p-8 mb-12">
              <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6">Broadcast New Notice</h3>
              
              <input type="text" placeholder="TITLE" required value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full mb-4 p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-400" />
              
              <textarea placeholder="Write the details here..." required rows={4} value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full mb-6 p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold transition-colors rounded-none placeholder-neutral-400"></textarea>
              
              <div className="mb-8 border-t border-neutral-200 pt-6">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Attach Image (Optional)</label>
                <input 
                  type="file" accept="image/*" onChange={(e) => setAnnouncementFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-3 file:px-6 file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-neutral-200 file:text-black hover:file:bg-neutral-300 transition-colors cursor-pointer outline-none"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Posting...' : 'Publish'}
              </button>
            </form>
          )}

          <div className="space-y-8">
            {announcements.length === 0 ? (
              <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No announcements broadcasted.</p>
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className="bg-white border-2 border-neutral-200 group relative">
                  {role === 'admin' && (
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="absolute top-4 right-4 bg-red-600 text-white hover:bg-red-700 px-4 py-2 font-bold uppercase tracking-widest text-[10px] transition-colors z-10">Delete</button>
                  )}
                  {ann.image_url && (
                    <div className="w-full h-48 sm:h-72 bg-neutral-100 overflow-hidden border-b-2 border-neutral-200">
                      <img src={ann.image_url} alt="Notice" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-8">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">{new Date(ann.created_at).toLocaleDateString()}</div>
                    <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-4">{ann.title}</h3>
                    <p className="text-black font-medium leading-relaxed">{ann.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REPORTS */}
        <div>
          <div className="border-b-2 border-black pb-6 mb-10 mt-16 lg:mt-0">
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tighter uppercase mb-2">Reports.</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">{role === 'admin' ? 'Action Required' : 'Submit Management Request'}</p>
          </div>

          {role === 'user' ? (
            <form onSubmit={handleSubmitComplaint} className="bg-white border-2 border-black p-8 sm:p-10">
              <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Submit Report</h3>
              
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Unit Number</label>
              <input type="text" placeholder="E.G. A-12-04" required value={complaintForm.unit_number} onChange={e => setComplaintForm({...complaintForm, unit_number: e.target.value})} className="w-full mb-6 p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-400" />
              
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Subject</label>
              <input type="text" placeholder="NATURE OF ISSUE" required value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} className="w-full mb-6 p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-400" />
              
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Description</label>
              <textarea placeholder="Please describe in detail..." required rows={5} value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} className="w-full mb-8 p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold transition-colors rounded-none placeholder-neutral-400"></textarea>
              
              <div className="mb-10 border-t border-neutral-200 pt-6">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Attach File (Optional)</label>
                <input 
                  type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setComplaintFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-3 file:px-6 file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-neutral-200 file:text-black hover:file:bg-neutral-300 transition-colors cursor-pointer outline-none"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Send Report'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {complaints.length === 0 ? (
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No pending reports.</p>
              ) : (
                complaints.map(comp => (
                  <div key={comp.id} className="bg-white p-8 border-2 border-neutral-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="inline-block bg-black text-white font-bold text-[10px] uppercase tracking-widest px-2 py-1 mb-3">Unit {comp.unit_number}</span>
                        <h4 className="text-xl font-black text-black uppercase tracking-tight">{comp.subject}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest border-2 ${comp.status === 'Resolved' ? 'border-black text-black' : 'border-red-600 text-red-600'}`}>
                        {comp.status}
                      </span>
                    </div>
                    
                    <p className="text-black font-medium mb-6">{comp.description}</p>
                    
                    {comp.attachment_url && (
                      <div className="mb-6">
                        <a href={comp.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex px-4 py-2 border-2 border-black text-black hover:bg-neutral-100 font-bold uppercase tracking-widest text-[10px] transition-colors">
                          View Attachment
                        </a>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t-2 border-neutral-100 pt-4 mt-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{new Date(comp.created_at).toLocaleString()}</span>
                      {comp.status === 'Pending' && (
                        <button onClick={() => handleResolveComplaint(comp.id)} className="font-bold text-black uppercase tracking-widest text-[10px] hover:underline">Mark Resolved</button>
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