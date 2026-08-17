import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Bills() {
  const [role, setRole] = useState<string>('user');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  
  // Admin Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    resident_email: '', 
    description: '',
    amount: ''
  });

  // User Payment Gateway State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [payingAll, setPayingAll] = useState(false); // Tracks if the user is paying one or all
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSessionAndData();
  }, []);

  const fetchSessionAndData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const currentRole = session.user.user_metadata?.role || 'user';
      const currentEmail = session.user.email || '';
      
      setRole(currentRole);
      setUserEmail(currentEmail);

      if (currentRole === 'admin') {
        const [billsData, residentsData] = await Promise.all([
          supabase.from('bills').select('*').order('issued_at', { ascending: false }),
          supabase.from('residents').select('*')
        ]);
        if (billsData.data) setBills(billsData.data);
        if (residentsData.data) setResidents(residentsData.data);
      } else {
        const { data } = await supabase.from('bills').select('*').eq('resident_email', currentEmail).order('issued_at', { ascending: false });
        if (data) setBills(data);
      }
    }
    setLoading(false);
  };

  // --- ADMIN FUNCTION: ISSUE BILL(S) ---
    const handleIssueBill = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        if (formData.resident_email === 'ALL') {
          // BULK INSERT: Issue to everyone
          if (residents.length === 0) throw new Error("No residents found to issue bills to.");
          
          const billsToInsert = residents.map(r => ({
            unit_number: r.unit_number || 'N/A',
            // Added fallback logic below to check for full_name or default to 'Resident' if null
            resident_name: r.name || r.full_name || 'Resident', 
            resident_email: r.email,
            description: formData.description,
            amount: parseFloat(formData.amount),
            status: 'Pending'
          }));

          const { data, error } = await supabase.from('bills').insert(billsToInsert).select();
          if (error) throw error;
          
          if (data) {
            const updatedBills = [...data, ...bills].sort((a,b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
            setBills(updatedBills);
          }
          alert(`Successfully issued bills to all ${residents.length} residents!`);
          
        } else {
          // SINGLE INSERT: Issue to one resident
          const resident = residents.find(r => r.email === formData.resident_email);
          if (!resident) throw new Error("Please select a valid resident.");

          const { data, error } = await supabase
            .from('bills')
            .insert([{
              unit_number: resident.unit_number || 'N/A',
              // Added fallback logic here too
              resident_name: resident.name || resident.full_name || 'Resident', 
              resident_email: resident.email,
              description: formData.description,
              amount: parseFloat(formData.amount),
              status: 'Pending'
            }])
            .select();

          if (error) throw error;
          if (data) setBills([data[0], ...bills]);
          alert("Bill issued successfully!");
        }
        
        setFormData({ resident_email: '', description: '', amount: '' });
      } catch (error: any) {
        alert("Error issuing bill: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    };

  // --- USER FUNCTION: PROCESS PAYMENT(S) ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        if (payingAll) {
          // BULK UPDATE: Pay all pending bills
          const pendingIds = pendingBills.map(b => b.id);
          const { error } = await supabase
            .from('bills')
            .update({ status: 'Paid', paid_at: new Date().toISOString() })
            .in('id', pendingIds);

          if (error) throw error;

          setBills(bills.map(b => pendingIds.includes(b.id) ? { ...b, status: 'Paid', paid_at: new Date().toISOString() } : b));
          setShowPaymentModal(false);
          setPayingAll(false);
          alert("All pending bills have been successfully paid!");

        } else {
          // SINGLE UPDATE: Pay selected bill
          const { error } = await supabase
            .from('bills')
            .update({ status: 'Paid', paid_at: new Date().toISOString() })
            .eq('id', selectedBill.id);

          if (error) throw error;

          setBills(bills.map(b => b.id === selectedBill.id ? { ...b, status: 'Paid', paid_at: new Date().toISOString() } : b));
          setShowPaymentModal(false);
          setShowReceiptModal(true); 
        }
      } catch (error: any) {
        alert("Payment failed: " + error.message);
      } finally {
        setIsProcessing(false);
      }
    }, 1500); 
  };

  // Helper variables for user logic
  const pendingBills = bills.filter(b => b.status === 'Pending');
  const totalPendingAmount = pendingBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading billing data...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>
        {role === 'admin' ? 'Management Billing Portal' : 'My Billing & Invoices'}
      </h1>

      {/* ======================================= */}
      {/* ADMIN VIEW: ISSUE BILL FORM             */}
      {/* ======================================= */}
      {role === 'admin' && (
        <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Issue New Bill</h3>
          <form onSubmit={handleIssueBill} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Select Resident(s)</label>
              <select 
                value={formData.resident_email} 
                onChange={(e) => setFormData({...formData, resident_email: e.target.value})} 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Choose Target --</option>
                <option value="ALL" style={{ fontWeight: 'bold', color: '#2563eb' }}>📢 Issue to ALL Residents</option>
                {residents.map(r => (
                  <option key={r.id} value={r.email}>Unit {r.unit_number} - {r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 3, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Description</label>
              <input 
                type="text" 
                placeholder="e.g. Monthly Maintenance Fee" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Amount (RM)</label>
              <input 
                type="number" 
                min="1"
                placeholder="0.00" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}>
              {isSubmitting ? 'Issuing...' : 'Issue Bill(s)'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================= */}
      {/* USER VIEW: PAY ALL BUTTON               */}
      {/* ======================================= */}
      {role === 'user' && pendingBills.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button 
            onClick={() => { setPayingAll(true); setShowPaymentModal(true); }}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
          >
            Pay All Pending (RM {totalPendingAmount.toFixed(2)})
          </button>
        </div>
      )}

      {/* ======================================= */}
      {/* SHARED VIEW: BILLS TABLE                */}
      {/* ======================================= */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '14px' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Date Issued</th>
              {role === 'admin' && <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Resident</th>}
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Description</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Amount</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No bills found.</td></tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '15px 12px', color: '#475569' }}>{new Date(bill.issued_at).toLocaleDateString()}</td>
                  
                  {role === 'admin' && (
                    <td style={{ padding: '15px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                      Unit {bill.unit_number} <br/>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>{bill.resident_name}</span>
                    </td>
                  )}
                  
                  <td style={{ padding: '15px 12px', fontWeight: 'bold', color: '#0f172a' }}>{bill.description}</td>
                  <td style={{ padding: '15px 12px', fontWeight: 'bold', color: '#3b82f6' }}>RM {parseFloat(bill.amount).toFixed(2)}</td>
                  
                  <td style={{ padding: '15px 12px' }}>
                    <span style={{ 
                      background: bill.status === 'Paid' ? '#dcfce7' : '#fef3c7', 
                      color: bill.status === 'Paid' ? '#166534' : '#b45309', 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
                      {bill.status}
                    </span>
                  </td>

                  <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                    {bill.status === 'Pending' && role === 'user' ? (
                      <button 
                        onClick={() => { setSelectedBill(bill); setPayingAll(false); setShowPaymentModal(true); }}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        Pay Now
                      </button>
                    ) : bill.status === 'Paid' ? (
                      <button 
                        onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }}
                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        E-Receipt
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Awaiting User</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================= */}
      {/* PAYMENT GATEWAY MODAL (USER ONLY)       */}
      {/* ======================================= */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Secure Checkout</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
              {payingAll ? 'Bulk Payment for All Pending Bills' : selectedBill?.description}
            </p>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>Total Amount Due</span>
              <h1 style={{ margin: 0, color: '#2563eb' }}>
                RM {payingAll ? totalPendingAmount.toFixed(2) : parseFloat(selectedBill?.amount).toFixed(2)}
              </h1>
            </div>

            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Cardholder Name" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Card Number (Fake)" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="MM/YY" required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="CVC" required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ flex: 2, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* E-RECEIPT MODAL (SHARED)                */}
      {/* ======================================= */}
      {showReceiptModal && selectedBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <h2 style={{ margin: 0, color: '#166534' }}>Payment Successful</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>Official E-Receipt</p>
            </div>

            <div style={{ borderTop: '2px dashed #e2e8f0', borderBottom: '2px dashed #e2e8f0', padding: '20px 0', marginBottom: '20px' }}>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 10px 0', fontSize: '14px' }}><span style={{ color: '#64748b' }}>Bill ID:</span> <strong>#INV-{selectedBill.id.toString().padStart(4, '0')}</strong></p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 10px 0', fontSize: '14px' }}><span style={{ color: '#64748b' }}>Paid By:</span> <strong>Unit {selectedBill.unit_number}</strong></p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 10px 0', fontSize: '14px' }}><span style={{ color: '#64748b' }}>Description:</span> <strong>{selectedBill.description}</strong></p>
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 10px 0', fontSize: '14px' }}><span style={{ color: '#64748b' }}>Date Paid:</span> <strong>{new Date(selectedBill.paid_at).toLocaleString()}</strong></p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ color: '#0f172a', fontWeight: 'bold' }}>Total Paid</span>
                <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>RM {parseFloat(selectedBill.amount).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowReceiptModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Print Receipt</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}