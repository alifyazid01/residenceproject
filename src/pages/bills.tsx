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

  // User Payment Gateway & Receipt State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [payingAll, setPayingAll] = useState(false);
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
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .or(`email.eq.${currentEmail},family_members.cs.[{"email":"${currentEmail}"}]`)
          .maybeSingle();

        if (residentData) {
          const primaryEmail = residentData.email;
          const { data } = await supabase
            .from('bills')
            .select('*')
            .eq('resident_email', primaryEmail)
            .order('issued_at', { ascending: false });
            
          if (data) setBills(data);
        }
      }
    }
    setLoading(false);
  };

  // --- ADMIN: ISSUE BILL ---
  const handleIssueBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.resident_email === 'ALL') {
        if (!residents || residents.length === 0) {
          throw new Error("No residents found in the directory. Please add residents first.");
        }
        
        const billsToInsert = residents.map(r => {
           const safeUnit = r.unit_number ? String(r.unit_number) : 'N/A';
           const safeName = r.name ? String(r.name) : (r.full_name ? String(r.full_name) : 'Resident');
           const safeEmail = r.email ? String(r.email) : 'no-email@error.com';

           return {
             unit_number: safeUnit,
             resident_name: safeName,
             resident_email: safeEmail,
             description: formData.description,
             amount: parseFloat(formData.amount),
             status: 'Pending'
           };
        });

        const { data, error } = await supabase.from('bills').insert(billsToInsert).select();
        
        if (error) throw error;
        
        if (data) {
          const updatedBills = [...data, ...bills].sort((a,b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
          setBills(updatedBills);
        }
        alert(`Successfully issued bills to all ${residents.length} residents!`);
        
      } else {
        const resident = residents.find(r => r.email === formData.resident_email);
        if (!resident) throw new Error("Please select a valid resident.");

        const safeUnit = resident.unit_number ? String(resident.unit_number) : 'N/A';
        const safeName = resident.name ? String(resident.name) : (resident.full_name ? String(resident.full_name) : 'Resident');
        const safeEmail = resident.email ? String(resident.email) : 'no-email@error.com';

        const singleBill = {
            unit_number: safeUnit,
            resident_name: safeName,
            resident_email: safeEmail,
            description: formData.description,
            amount: parseFloat(formData.amount),
            status: 'Pending'
        };

        const { data, error } = await supabase.from('bills').insert([singleBill]).select();

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

  // --- ADMIN: MANUALLY MARK AS PAID ---
  const handleMarkAsPaid = async (billId: number) => {
    if (!window.confirm("Confirm that management has received this payment via cash/bank transfer?")) return;
    
    try {
      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'Paid', paid_at: new Date().toISOString() })
        .eq('id', billId)
        .select();

      if (error) throw error;
      if (data) {
        setBills(bills.map(b => b.id === billId ? data[0] : b));
        setSelectedBill(data[0]);
        setShowReceiptModal(true); // Pop up the receipt instantly for the admin to print
      }
    } catch (error: any) {
      alert("Error processing payment: " + error.message);
    }
  };

  // --- ADMIN: DELETE BILL ---
  const handleDeleteBill = async (id: number) => {
    if (!window.confirm("Are you sure you want to void this bill? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      setBills(bills.filter(b => b.id !== id));
    } catch (error: any) {
      alert("Error deleting bill: " + error.message);
    }
  };

  // --- USER: MOCK PAYMENT GATEWAY ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        if (payingAll) {
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

  const pendingBills = bills.filter(b => b.status === 'Pending');
  const totalPendingAmount = pendingBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
      <div className="text-slate-600 font-medium animate-pulse text-lg">Loading billing data...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            {role === 'admin' ? 'Billing Operations' : 'My Billing & Invoices'}
          </h1>
          <p className="text-slate-600 font-medium">
            {role === 'admin' ? 'Issue invoices, reconcile offline payments, and generate official receipts.' : 'Manage invoices, payments, and electronic receipts in one place.'}
          </p>
        </div>

        {/* ADMIN VIEW: ISSUE BILL FORM */}
        {role === 'admin' && (
          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] mb-8 transition-all hover:bg-white/50">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Issue New Bill</h3>
            
            <form onSubmit={handleIssueBill} className="flex flex-col md:flex-row gap-5 md:items-end">
              <div className="flex-[2]">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Select Resident(s)</label>
                <select 
                  value={formData.resident_email} 
                  onChange={(e) => setFormData({...formData, resident_email: e.target.value})} 
                  required
                  className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
                >
                  <option value="">-- Choose Target --</option>
                  <option value="ALL" className="font-bold text-slate-900">📢 Issue to ALL Residents</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.email}>Unit {r.unit_number} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-[3]">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Maintenance Fee" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Amount (RM)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  placeholder="0.00" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all transform hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none h-[50px]"
              >
                {isSubmitting ? 'Issuing...' : 'Issue Bill(s)'}
              </button>
            </form>
          </div>
        )}

        {/* USER VIEW: PAY ALL BUTTON */}
        {role === 'user' && pendingBills.length > 1 && (
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => { setPayingAll(true); setShowPaymentModal(true); }}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-black transition-all transform hover:scale-105"
            >
              Pay All Pending (RM {totalPendingAmount.toFixed(2)})
            </button>
          </div>
        )}

        {/* SHARED VIEW: BILLS TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/30 border-b border-white/50 text-sm text-slate-700">
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Date Issued</th>
                  {role === 'admin' && <th className="p-5 font-bold uppercase tracking-wider text-xs">Resident</th>}
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Description</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">No bills found.</td></tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                      <td className="p-5 text-slate-700 text-sm font-medium">{new Date(bill.issued_at).toLocaleDateString()}</td>
                      
                      {role === 'admin' && (
                        <td className="p-5">
                          <div className="font-bold text-slate-900">Unit {bill.unit_number}</div>
                          <div className="text-xs text-slate-600">{bill.resident_name}</div>
                        </td>
                      )}
                      
                      <td className="p-5 font-bold text-slate-900">{bill.description}</td>
                      <td className="p-5 font-extrabold text-slate-900">RM {parseFloat(bill.amount).toFixed(2)}</td>
                      
                      <td className="p-5">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                          bill.status === 'Paid' 
                            ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-800 border-amber-500/30'
                        }`}>
                          {bill.status}
                        </span>
                      </td>

                      <td className="p-5 text-right space-x-2">
                        
                        {/* USER ACTION: Pay Now */}
                        {bill.status === 'Pending' && role === 'user' && (
                          <button 
                            onClick={() => { setSelectedBill(bill); setPayingAll(false); setShowPaymentModal(true); }} 
                            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all transform hover:scale-105 shadow-sm"
                          >
                            Pay Now
                          </button>
                        )}

                        {/* ADMIN ACTION: Manually Reconcile Payment */}
                        {bill.status === 'Pending' && role === 'admin' && (
                          <button 
                            onClick={() => handleMarkAsPaid(bill.id)} 
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            Mark Paid
                          </button>
                        )}

                        {/* SHARED ACTION: View Receipt */}
                        {bill.status === 'Paid' && (
                          <button 
                            onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }} 
                            className="bg-white/50 text-slate-800 border border-white/60 px-5 py-2 rounded-xl font-bold text-xs hover:bg-white transition-all shadow-sm"
                          >
                            {role === 'admin' ? 'Receipt' : 'E-Receipt'}
                          </button>
                        )}

                        {/* ADMIN ACTION: Void / Delete Bill */}
                        {role === 'admin' && (
                          <button 
                            onClick={() => handleDeleteBill(bill.id)} 
                            className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-500/20 transition-all"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT GATEWAY MODAL (USER ONLY) */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/60">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Secure Checkout</h2>
              <p className="text-slate-600 text-sm mb-6 font-medium">
                {payingAll ? 'Bulk Payment for All Pending Bills' : selectedBill?.description}
              </p>
              
              <div className="bg-white/50 p-6 rounded-2xl mb-6 text-center border border-white/60 shadow-inner">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wide">Total Amount Due</span>
                <h1 className="text-4xl font-extrabold text-slate-900 mt-2">
                  RM {payingAll ? totalPendingAmount.toFixed(2) : parseFloat(selectedBill?.amount).toFixed(2)}
                </h1>
              </div>

              <form onSubmit={handlePayment} className="flex flex-col gap-4">
                <input type="text" placeholder="Cardholder Name" required className="p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm" />
                <input type="text" placeholder="Card Number (Mock)" required className="p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm" />
                <div className="flex gap-4">
                  <input type="text" placeholder="MM/YY" required className="flex-1 p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm" />
                  <input type="text" placeholder="CVC" required className="flex-1 p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-105 disabled:opacity-70 disabled:transform-none shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    {isProcessing ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* E-RECEIPT MODAL (SHARED) */}
        {showReceiptModal && selectedBill && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            
            <div className="print-area bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/60">
              
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {role === 'admin' ? 'Official Receipt' : 'Payment Successful'}
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  {role === 'admin' ? 'Management Acknowledged Payment' : 'Official E-Receipt'}
                </p>
              </div>

              <div className="border-y-2 border-dashed border-slate-300 py-6 mb-6 space-y-4">
                <p className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Receipt No:</span> <strong className="text-slate-900">#REC-{selectedBill.id.toString().padStart(4, '0')}</strong></p>
                <p className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Paid By:</span> <strong className="text-slate-900">Unit {selectedBill.unit_number}</strong></p>
                <p className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Description:</span> <strong className="text-slate-900">{selectedBill.description}</strong></p>
                <p className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Date Paid:</span> <strong className="text-slate-900">{new Date(selectedBill.paid_at).toLocaleString()}</strong></p>
                
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
                  <span className="text-slate-900 font-bold uppercase text-xs tracking-wider">Total Paid</span>
                  <span className="text-slate-900 font-extrabold text-2xl">RM {parseFloat(selectedBill.amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6 print:hidden">
                <button onClick={() => setShowReceiptModal(false)} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors">Close</button>
                <button onClick={() => window.print()} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex justify-center items-center gap-2">
                  <span>🖨️</span> Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}