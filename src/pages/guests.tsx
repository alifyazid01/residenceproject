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
}

export default function Guests() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentResident, setCurrentResident] = useState<{ name: string; unit_number: string } | null>(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_car_plate: '',
    visit_date: new Date().toISOString().split('T')[0]
  });

  // Modal / Access Pass State
  const [createdPass, setCreatedPass] = useState<Visitor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

      // 1. Fetch resident profile details for user
      const { data: residentData } = await supabase
        .from('residents')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (residentData) {
        setCurrentResident({
          name: residentData.name,
          unit_number: residentData.unit_number
        });
      }

      // 2. Fetch visitor records
      if (userRole === 'admin') {
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .order('visit_date', { ascending: false });

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

  // Generate unique pass code (e.g., GST-9482)
  const generateAccessCode = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `GST-${randomDigits}`;
  };

  // --- RESIDENT: REGISTER NEW VISITOR ---
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
        status: 'Pending' as const
      };

      const { data, error } = await supabase.from('visitors').insert([newVisitor]).select();

      if (error) throw error;

      if (data && data[0]) {
        setVisitors([data[0] as Visitor, ...visitors]);
        setCreatedPass(data[0] as Visitor);
      }

      setFormData({
        guest_name: '',
        guest_car_plate: '',
        visit_date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      alert('Error creating visitor pass: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ADMIN: UPDATE VISITOR STATUS ---
  const handleUpdateStatus = async (id: number, nextStatus: 'Arrived' | 'Departed') => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;

      setVisitors(visitors.map(v => (v.id === id ? { ...v, status: nextStatus } : v)));
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  };

  // --- ADMIN: DELETE VISITOR RECORD ---
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
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading visitor logs...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>
          {role === 'admin' ? 'Security & Visitor Control' : 'Guest Pre-Registration'}
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          {role === 'admin' 
            ? 'Verify visitor access codes and log gate check-ins.' 
            : `Generate visitor entry passes for Unit ${currentResident?.unit_number || '...'}`}
        </p>
      </div>

      {/* RESIDENT VIEW: PRE-REGISTER VISITOR FORM */}
      {role === 'user' && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Create Visitor Access Pass</h3>
          <form onSubmit={handleRegisterGuest} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Visitor Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.guest_name}
                onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Vehicle Plate (Optional)</label>
              <input
                type="text"
                placeholder="e.g. WXY 1234"
                value={formData.guest_car_plate}
                onChange={e => setFormData({ ...formData, guest_car_plate: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Expected Visit Date</label>
              <input
                type="date"
                value={formData.visit_date}
                onChange={e => setFormData({ ...formData, visit_date: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}
              >
                {isSubmitting ? 'Generating...' : '🎟️ Generate Pass'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH / FILTER BAR FOR ADMINS */}
      {role === 'admin' && (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Search by Access Code, Guest Name, or Unit Number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '450px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* VISITOR LOGS TABLE */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Pass Code</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Visitor</th>
              {role === 'admin' && <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Destination</th>}
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Visit Date</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Vehicle</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No visitor logs found.
                </td>
              </tr>
            ) : (
              filteredVisitors.map(v => {
                const badgeColor =
                  v.status === 'Arrived'
                    ? { bg: '#dcfce7', text: '#166534' }
                    : v.status === 'Departed'
                    ? { bg: '#f1f5f9', text: '#475569' }
                    : { bg: '#fef3c7', text: '#b45309' };

                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563eb', fontSize: '15px' }}>
                      {v.access_code}
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#0f172a' }}>{v.guest_name}</td>
                    {role === 'admin' && (
                      <td style={{ padding: '14px 12px', color: '#334155' }}>
                        Unit {v.unit_number} <br />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{v.resident_name}</span>
                      </td>
                    )}
                    <td style={{ padding: '14px 12px', color: '#475569' }}>{v.visit_date}</td>
                    <td style={{ padding: '14px 12px', color: '#475569' }}>{v.guest_car_plate || '—'}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ background: badgeColor.bg, color: badgeColor.text, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      {/* Security/Admin Check-in / Check-out controls */}
                      {role === 'admin' && (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {v.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'Arrived')}
                              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              Check In
                            </button>
                          )}
                          {v.status === 'Arrived' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'Departed')}
                              style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              Check Out
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVisitor(v.id)}
                            style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Resident View Pass Details Button */}
                      {role === 'user' && (
                        <button
                          onClick={() => setCreatedPass(v)}
                          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
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

      {/* SHAREABLE VISITOR PASS MODAL */}
      {createdPass && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '40px' }}>🎟️</span>
            <h2 style={{ margin: '8px 0 4px 0', color: '#0f172a' }}>Visitor Access Pass</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>Show this pass at the security guardhouse upon arrival.</p>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '2px dashed #cbd5e1', marginBottom: '20px' }}>
              <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Security Code</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '2px', margin: '6px 0 14px 0' }}>
                {createdPass.access_code}
              </div>

              <div style={{ textAlign: 'left', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Guest:</strong> {createdPass.guest_name}</div>
                <div><strong>Destination:</strong> Unit {createdPass.unit_number}</div>
                <div><strong>Vehicle:</strong> {createdPass.guest_car_plate || 'None'}</div>
                <div><strong>Date:</strong> {createdPass.visit_date}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setCreatedPass(null)}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Hi ${createdPass.guest_name}, here is your visitor access code for Unit ${createdPass.unit_number}: ${createdPass.access_code} on ${createdPass.visit_date}.`);
                  alert('Pass details copied to clipboard!');
                }}
                style={{ flex: 1.5, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📋 Copy Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}