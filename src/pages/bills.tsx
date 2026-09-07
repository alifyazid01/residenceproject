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
        // STEP 1: Find the resident profile (either as primary OR as a family member)
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .or(`email.eq.${currentEmail},family_members.cs.[{"email":"${currentEmail}"}]`)
          .maybeSingle();

        if (residentData) {
          // STEP 2: Fetch the bills using the primary resident's email
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

  // --- ADMIN FUNCTION: ISSUE BILL(S) ---
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

  // --- ADMIN FUNCTION: DELETE BILL ---
  const handleDeleteBill = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this bill? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      setBills(bills.filter(b => b.id !== id));
    } catch (error: any) {
      alert("Error deleting bill: " + error.message);
    }
  };

  // --- USER FUNCTION: PROCESS PAYMENT(S) ---
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
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-slate-500 font-medium animate-pulse">Loading billing data...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">
          {role === 'admin' ? 'Management Billing Portal' : 'My Billing & Invoices'}
        </h1>
        <p className="text-slate-500">Manage invoices, payments, and electronic receipts.</p>
      </div>

      {/* ADMIN VIEW: ISSUE BILL FORM */}
      {role === 'admin' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Issue New Bill</h3>
          
          <form onSubmit={handleIssueBill} className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-[2]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Select Resident(s)</label>
              <select 
                value={formData.resident_email} 
                onChange={(e) => setFormData({...formData, resident_email: e.target.value})} 
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Choose Target --</option>
                <option value="ALL" className="font-bold text-blue-600">📢 Issue to ALL Residents</option>
                {residents.map(r => (
                  <option key={r.id} value={r.email}>Unit {r.unit_number} - {r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-[3]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Description</label>
              <input 
                type="text" 
                placeholder="e.g. Monthly Maintenance Fee" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Amount (RM)</label>
              <input 
                type="number" 
                min="1"
                step="0.01"
                placeholder="0.00" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 h-[46px]"
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
            className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-emerald-600 transition-colors"
          >
            Pay All Pending (RM {totalPendingAmount.toFixed(2)})
          </button>
        </div>
      )}

      {/* SHARED VIEW: BILLS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
              <th className="p-4 font-semibold">Date Issued</th>
              {role === 'admin' && <th className="p-4 font-semibold">Resident</th>}
              <th className="p-4 font-semibold">Description</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No bills found.</td></tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600 text-sm">{new Date(bill.issued_at).toLocaleDateString()}</td>
                  
                  {role === 'admin' && (
                    <td className="p-4">
                      <div className="font-bold text-slate-900">Unit {bill.unit_number}</div>
                      <div className="text-xs text-slate-500">{bill.resident_name}</div>
                    </td>
                  )}
                  
                  <td className="p-4 font-bold text-slate-900">{bill.description}</td>
                  <td className="p-4 font-bold text-blue-600">RM {parseFloat(bill.amount).toFixed(2)}</td>
                  
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {bill.status}
                    </span>
                  </td>

                  <td className="p-4 text-right space-x-2">
                    
                    {bill.status === 'Pending' && role === 'user' && (
                      <button 
                        onClick={() => { setSelectedBill(bill); setPayingAll(false); setShowPaymentModal(true); }} 
                        className="bg-emerald-500 text-white px-4 py-1.5 rounded-md font-bold text-xs hover:bg-emerald-600 transition-colors"
                      >
                        Pay Now
                      </button>
                    )}

                    {bill.status === 'Paid' && (
                      <button 
                        onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }} 
                        className="bg-slate-100 text-slate-700 border border-slate-200 px-4 py-1.5 rounded-md font-bold text-xs hover:bg-slate-200 transition-colors"
                      >
                        E-Receipt
                      </button>
                    )}

                    {bill.status === 'Pending' && role === 'admin' && (
                      <span className="text-slate-400 text-xs italic mr-2">Awaiting User</span>
                    )}

                    {role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteBill(bill.id)} 
                        className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-md font-bold text-xs hover:bg-rose-200 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAYMENT GATEWAY MODAL (USER ONLY) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Secure Checkout</h2>
            <p className="text-slate-500 text-sm mb-6">
              {payingAll ? 'Bulk Payment for All Pending Bills' : selectedBill?.description}
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-6 text-center border border-slate-100">
              <span className="text-slate-500 text-sm">Total Amount Due</span>
              <h1 className="text-4xl font-extrabold text-blue-600 mt-1">
                RM {payingAll ? totalPendingAmount.toFixed(2) : parseFloat(selectedBill?.amount).toFixed(2)}
              </h1>
            </div>

            <form onSubmit={handlePayment} className="flex flex-col gap-4">
              <input type="text" placeholder="Cardholder Name" required className="p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="text" placeholder="Card Number (Mock)" required className="p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="flex gap-4">
                <input type="text" placeholder="MM/YY" required className="flex-1 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="text" placeholder="CVC" required className="flex-1 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] p-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors disabled:opacity-70">
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-RECEIPT MODAL (SHARED) */}
      {showReceiptModal && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-emerald-700">Payment Successful</h2>
              <p className="text-slate-500 text-sm">Official E-Receipt</p>
            </div>

            <div className="border-y-2 border-dashed border-slate-200 py-6 mb-6 space-y-3">
              <p className="flex justify-between text-sm"><span className="text-slate-500">Bill ID:</span> <strong className="text-slate-900">#INV-{selectedBill.id.toString().padStart(4, '0')}</strong></p>
              <p className="flex justify-between text-sm"><span className="text-slate-500">Paid By:</span> <strong className="text-slate-900">Unit {selectedBill.unit_number}</strong></p>
              <p className="flex justify-between text-sm"><span className="text-slate-500">Description:</span> <strong className="text-slate-900">{selectedBill.description}</strong></p>
              <p className="flex justify-between text-sm"><span className="text-slate-500">Date Paid:</span> <strong className="text-slate-900">{new Date(selectedBill.paid_at).toLocaleString()}</strong></p>
              
              <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
                <span className="text-slate-900 font-bold">Total Paid</span>
                <span className="text-blue-600 font-extrabold text-lg">RM {parseFloat(selectedBill.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowReceiptModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors">Close</button>
              <button onClick={() => window.print()} className="flex-1 p-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex justify-center items-center gap-2">
                <span>🖨️</span> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}