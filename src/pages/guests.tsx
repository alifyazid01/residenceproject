import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Visitor {
  id: number;
  unit_number: string;
  resident_name: string;
  guest_name: string;
  guest_car_plate: string | null;
  visit_date: string;
  access_code: string;
  status: 'Pending' | 'Arrived' | 'Departed';
  created_at: string;
  ic_number?: string;
  ic_url?: string;
  category?: string;
}

export default function Guests() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentResident, setCurrentResident] = useState<{ name: string; unit_number: string } | null>(null);

  // Search and Modal States
  const [searchTerm, setSearchTerm] = useState('');
  const [createdPass, setCreatedPass] = useState<Visitor | null>(null);
  
  // --- RESIDENT FORM STATE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_car_plate: '',
    visit_date: new Date().toISOString().split('T')[0]
  });

  // --- ADMIN WALK-IN FORM STATE ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [isWalkInSubmitting, setIsWalkInSubmitting] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    guest_name: '',
    ic_number: '',
    ic_picture: null as File | null,
    guest_car_plate: '',
    unit_number: '',
    category: 'Visiting Resident'
  });

  useEffect(() => {
    fetchSessionAndData();
  }, []);

  const fetchSessionAndData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const userRole = session.user.user_metadata?.role || 'user';
      const userEmail = session.user.email || '';
      setRole(userRole);

      const { data: residentData } = await supabase
        .from('residents')
        .select('*')
        .or(`email.eq.${userEmail},family_members.cs.[{"email":"${userEmail}"}]`)
        .maybeSingle();

      if (residentData) {
        setCurrentResident({
          name: residentData.name,
          unit_number: residentData.unit_number
        });
      }

      if (userRole === 'admin') {
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) setVisitors(data as Visitor[]);
      } else {
        const unit = residentData?.unit_number || 'N/A';
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .eq('unit_number', unit)
          .order('created_at', { ascending: false });

        if (!error && data) setVisitors(data as Visitor[]);
      }
    }
    setLoading(false);
  };

  const generateAccessCode = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `GST-${randomDigits}`;
  };

  // --- RESIDENT: PRE-REGISTER VISITOR ---
  const handleRegisterGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const residentUnit = currentResident?.unit_number || 'Pending Unit';
    const residentName = currentResident?.name || 'Resident';
    const accessCode = generateAccessCode();

    try {
      const newVisitor = {
        unit_number: residentUnit,
        resident_name: residentName,
        guest_name: formData.guest_name.trim(),
        guest_car_plate: formData.guest_car_plate.trim().toUpperCase() || 'NO VEHICLE',
        visit_date: formData.visit_date,
        access_code: accessCode,
        category: 'Pre-Registered Guest',
        status: 'Pending' as const
      };

      const { data, error } = await supabase.from('visitors').insert([newVisitor]).select();
      if (error) throw error;

      if (data && data[0]) {
        setVisitors([data[0] as Visitor, ...visitors]);
        setCreatedPass(data[0] as Visitor);
      }

      setFormData({ guest_name: '', guest_car_plate: '', visit_date: new Date().toISOString().split('T')[0] });
    } catch (error: any) {
      alert('Error creating visitor pass: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ADMIN: REGISTER WALK-IN VISITOR ---
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsWalkInSubmitting(true);

    try {
      let uploadedIcUrl = null;

      // Upload IC Image to Supabase Storage (Bucket must be named 'guest_ic')
      if (walkInForm.ic_picture) {
        const fileExt = walkInForm.ic_picture.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('guest_ic')
          .upload(fileName, walkInForm.ic_picture);

        if (uploadError) {
          throw new Error('Failed to upload IC picture: ' + uploadError.message);
        }

        const { data } = supabase.storage.from('guest_ic').getPublicUrl(fileName);
        uploadedIcUrl = data.publicUrl;
      }

      const walkInVisitor = {
        unit_number: walkInForm.unit_number.toUpperCase().trim(),
        resident_name: 'Walk-In Destination', // Could be fetched dynamically if needed
        guest_name: walkInForm.guest_name.trim(),
        ic_number: walkInForm.ic_number.trim(),
        ic_url: uploadedIcUrl,
        category: walkInForm.category,
        guest_car_plate: walkInForm.guest_car_plate.trim().toUpperCase() || 'WALK-IN',
        visit_date: new Date().toISOString().split('T')[0], // Today
        access_code: `WALK-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Arrived' as const // Automatically marked as arrived
      };

      const { data, error } = await supabase.from('visitors').insert([walkInVisitor]).select();
      if (error) throw error;

      if (data && data[0]) {
        setVisitors([data[0] as Visitor, ...visitors]);
      }

      setShowWalkInModal(false);
      setWalkInForm({ guest_name: '', ic_number: '', ic_picture: null, guest_car_plate: '', unit_number: '', category: 'Visiting Resident' });
      alert("Walk-In Guest successfully registered and checked in.");

    } catch (error: any) {
      alert('Error registering walk-in: ' + error.message);
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  // --- ADMIN CONTROLS ---
  const handleUpdateStatus = async (id: number, nextStatus: 'Arrived' | 'Departed') => {
    try {
      const { error } = await supabase.from('visitors').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      setVisitors(visitors.map(v => (v.id === id ? { ...v, status: nextStatus } : v)));
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleDeleteVisitor = async (id: number) => {
    if (!window.confirm('Delete this visitor log?')) return;
    try {
      const { error } = await supabase.from('visitors').delete().eq('id', id);
      if (error) throw error;
      setVisitors(visitors.filter(v => v.id !== id));
    } catch (error: any) {
      alert('Error deleting log: ' + error.message);
    }
  };

  const filteredVisitors = visitors.filter(v => 
    v.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.access_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading visitor logs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            {role === 'admin' ? 'Security & Visitor Control' : 'Guest Pre-Registration'}
          </h1>
          <p className="text-slate-500">
            {role === 'admin' 
              ? 'Verify visitor access codes and register walk-ins.' 
              : `Generate visitor entry passes for Unit ${currentResident?.unit_number || '...'}`}
          </p>
        </div>
        
        {/* Walk-in Registration Button (Admin Only) */}
        {role === 'admin' && (
          <button 
            onClick={() => setShowWalkInModal(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>📝</span> Register Walk-In
          </button>
        )}
      </div>

      {/* RESIDENT VIEW: PRE-REGISTER VISITOR FORM */}
      {role === 'user' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Create Visitor Access Pass</h3>
          <form onSubmit={handleRegisterGuest} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Visitor Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.guest_name}
                onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Vehicle Plate (Optional)</label>
              <input
                type="text"
                placeholder="e.g. WXY 1234"
                value={formData.guest_car_plate}
                onChange={e => setFormData({ ...formData, guest_car_plate: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Expected Visit Date</label>
              <input
                type="date"
                value={formData.visit_date}
                onChange={e => setFormData({ ...formData, visit_date: e.target.value })}
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors h-[46px] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? 'Generating...' : <><span>🎟️</span> Generate Pass</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH BAR FOR ADMINS */}
      {role === 'admin' && (
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search Code, Name, or Unit..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
        </div>
      )}

      {/* VISITOR LOGS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">Pass / Type</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">Visitor Details</th>
              {role === 'admin' && <th className="p-4 font-semibold uppercase tracking-wider text-xs">Destination</th>}
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">Date / Vehicle</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No visitor logs found.
                </td>
              </tr>
            ) : (
              filteredVisitors.map(v => {
                const badgeColor =
                  v.status === 'Arrived'
                    ? 'bg-emerald-100 text-emerald-800'
                    : v.status === 'Departed'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-amber-100 text-amber-800';

                return (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    
                    <td className="p-4">
                      <div className="font-mono font-bold text-blue-600 text-sm">{v.access_code}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1">{v.category || 'Guest'}</div>
                    </td>
                    
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{v.guest_name}</div>
                      {/* Admin sees IC info if provided */}
                      {role === 'admin' && v.ic_number && (
                         <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                           IC: {v.ic_number}
                           {v.ic_url && <a href={v.ic_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">📸 View</a>}
                         </div>
                      )}
                    </td>
                    
                    {role === 'admin' && (
                      <td className="p-4">
                        <div className="font-bold text-slate-700">Unit {v.unit_number}</div>
                        <div className="text-xs text-slate-500">{v.resident_name}</div>
                      </td>
                    )}
                    
                    <td className="p-4">
                      <div className="text-slate-900 text-sm">{v.visit_date}</div>
                      <div className="text-slate-500 text-xs mt-1">{v.guest_car_plate || '—'}</div>
                    </td>
                    
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                        {v.status}
                      </span>
                    </td>
                    
                    <td className="p-4 text-right space-x-2">
                      {role === 'admin' && (
                        <div className="inline-flex gap-2">
                          {v.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'Arrived')}
                              className="bg-emerald-500 text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                              Check In
                            </button>
                          )}
                          {v.status === 'Arrived' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'Departed')}
                              className="bg-slate-500 text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-slate-600 transition-colors shadow-sm"
                            >
                              Check Out
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVisitor(v.id)}
                            className="bg-rose-100 text-rose-700 px-2 py-1.5 rounded-md font-bold text-xs hover:bg-rose-200 transition-colors"
                            title="Delete Log"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {role === 'user' && (
                        <button
                          onClick={() => setCreatedPass(v)}
                          className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md font-bold text-xs hover:bg-blue-100 transition-colors"
                        >
                          View Pass
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADMIN ONLY: WALK-IN REGISTRATION MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Manual Guard Registration</h2>
            <p className="text-slate-500 text-sm mb-6">Register a walk-in guest, courier, or contractor without a pre-generated code.</p>
            
            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Guest / Driver Name</label>
                  <input 
                    type="text" 
                    required 
                    value={walkInForm.guest_name}
                    onChange={(e) => setWalkInForm({...walkInForm, guest_name: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Destination Unit</label>
                  <input 
                    type="text" 
                    placeholder="e.g. A-12-04"
                    required 
                    value={walkInForm.unit_number}
                    onChange={(e) => setWalkInForm({...walkInForm, unit_number: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select 
                    value={walkInForm.category}
                    onChange={(e) => setWalkInForm({...walkInForm, category: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Visiting Resident">Visiting Resident</option>
                    <option value="Courier / Delivery">Courier / Delivery</option>
                    <option value="Food Delivery">Food Delivery</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Vehicle Plate</label>
                  <input 
                    type="text" 
                    placeholder="Leave blank if walking"
                    value={walkInForm.guest_car_plate}
                    onChange={(e) => setWalkInForm({...walkInForm, guest_car_plate: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Identity Verification</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">IC / Passport Number</label>
                    <input 
                      type="text" 
                      required
                      value={walkInForm.ic_number}
                      onChange={(e) => setWalkInForm({...walkInForm, ic_number: e.target.value})}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Upload ID Photo (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setWalkInForm({...walkInForm, ic_picture: e.target.files ? e.target.files[0] : null})}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowWalkInModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isWalkInSubmitting} className="flex-[2] p-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70">
                  {isWalkInSubmitting ? 'Registering...' : 'Register & Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHAREABLE VISITOR PASS MODAL (For pre-registered users) */}
      {createdPass && (
         // ... Keeping your existing receipt modal the exact same
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
            <div className="text-5xl mb-2">🎟️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Visitor Access Pass</h2>
            <p className="text-slate-500 text-xs mb-6">Show this pass at the security guardhouse upon arrival.</p>

            <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 mb-6">
              <div className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Security Code</div>
              <div className="text-3xl font-extrabold text-blue-600 tracking-widest font-mono mb-4">
                {createdPass.access_code}
              </div>

              <div className="text-left text-sm text-slate-700 space-y-2 border-t border-slate-200 pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Guest</span> 
                  <span className="font-bold">{createdPass.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Destination</span> 
                  <span className="font-bold">Unit {createdPass.unit_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Vehicle</span> 
                  <span className="font-bold">{createdPass.guest_car_plate || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Date</span> 
                  <span className="font-bold">{createdPass.visit_date}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCreatedPass(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors">Close</button>
              <button onClick={() => navigator.clipboard.writeText(`Code: ${createdPass.access_code}`)} className="flex-[1.5] p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">📋 Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}