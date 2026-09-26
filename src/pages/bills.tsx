import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Bills() {
  const [role, setRole] = useState<string>('user');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    resident_email: '', 
    description: '',
    amount: ''
  });

  const [paymentModal, setPaymentModal] = useState<{show: boolean, bill: any | null}>({show: false, bill: null});
  const [paymentMethod, setPaymentMethod] = useState<'walk-in' | 'online'>('walk-in');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

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

  const handleIssueBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.resident_email === 'ALL') {
        if (!residents || residents.length === 0) throw new Error("No residents found.");
        
        const billsToInsert = residents.map(r => ({
           unit_number: r.unit_number ? String(r.unit_number) : 'N/A',
           resident_name: r.name ? String(r.name) : (r.full_name ? String(r.full_name) : 'Resident'),
           resident_email: r.email ? String(r.email) : 'no-email@error.com',
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
        const resident = residents.find(r => r.email === formData.resident_email);
        if (!resident) throw new Error("Please select a valid resident.");

        const singleBill = {
            unit_number: resident.unit_number ? String(resident.unit_number) : 'N/A',
            resident_name: resident.name ? String(resident.name) : (resident.full_name ? String(resident.full_name) : 'Resident'),
            resident_email: resident.email ? String(resident.email) : 'no-email@error.com',
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

  const handleProcessPayment = async () => {
    if (!paymentModal.bill) return;

    if (paymentMethod === 'online' && !paymentFile) {
      alert("Authorization Denied: You must attach the user's online payment receipt to verify this transaction.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      let uploadedReceiptUrl = null;

      // 1. Upload File to Supabase Storage if Online Transfer
      if (paymentMethod === 'online' && paymentFile) {
        const fileExt = paymentFile.name.split('.').pop();
        const fileName = `bill_${paymentModal.bill.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, paymentFile);

        if (uploadError) {
          throw new Error("Failed to upload receipt. Please ensure you created the 'receipts' bucket in Supabase. Details: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        uploadedReceiptUrl = publicUrlData.publicUrl;
      }

      // 2. Update the Database with the payment info and file URL
      const { data, error } = await supabase
        .from('bills')
        .update({ 
          status: 'Paid', 
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
          receipt_url: uploadedReceiptUrl 
        })
        .eq('id', paymentModal.bill.id)
        .select();

      if (error) throw error;
      
      if (data) {
        setBills(bills.map(b => b.id === paymentModal.bill.id ? data[0] : b));
        setSelectedBill(data[0]);
        setPaymentModal({show: false, bill: null});
        setPaymentFile(null);
        setPaymentMethod('walk-in');
        setShowReceiptModal(true); 
      }
    } catch (error: any) {
      alert("Error processing payment: " + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

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

  const pendingBills = bills.filter(b => b.status === 'Pending');
  const totalPendingAmount = pendingBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
      <div className="text-slate-600 font-medium animate-pulse text-lg">Loading billing data...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            {role === 'admin' ? 'Billing Operations' : 'My Outstanding Bills'}
          </h1>
          <p className="text-slate-600 font-medium">
            {role === 'admin' ? 'Issue invoices, reconcile offline payments, and generate official receipts.' : 'View your pending balances and contact management to settle payments.'}
          </p>
        </div>

        {/* ADMIN VIEW: ISSUE BILL */}
        {role === 'admin' && (
          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] mb-8 transition-all hover:bg-white/50">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Issue New Bill</h3>
            <form onSubmit={handleIssueBill} className="flex flex-col md:flex-row gap-5 md:items-end">
              <div className="flex-[2]">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Select Resident(s)</label>
                <select value={formData.resident_email} onChange={(e) => setFormData({...formData, resident_email: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm">
                  <option value="">-- Choose Target --</option>
                  <option value="ALL" className="font-bold text-slate-900">📢 Issue to ALL Residents</option>
                  {residents.map(r => <option key={r.id} value={r.email}>Unit {r.unit_number} - {r.name}</option>)}
                </select>
              </div>
              <div className="flex-[3]">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Description</label>
                <input type="text" placeholder="e.g. Monthly Maintenance Fee" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"/>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Amount (RM)</label>
                <input type="number" min="1" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"/>
              </div>
              <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all transform hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 h-[50px]">
                {isSubmitting ? 'Issuing...' : 'Issue Bill(s)'}
              </button>
            </form>
          </div>
        )}

        {/* SHARED VIEW: BILLS TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
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
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${bill.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/30' : 'bg-amber-500/20 text-amber-800 border-amber-500/30'}`}>
                          {bill.status}
                        </span>
                      </td>

                      <td className="p-5 text-right space-x-2">
                        {bill.status === 'Pending' && role === 'user' && (
                          <Link to="/contacts" className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-sm inline-flex items-center gap-1.5 ml-auto">
                            <span>📞</span> Contact to Pay
                          </Link>
                        )}
                        {bill.status === 'Pending' && role === 'admin' && (
                          <button onClick={() => setPaymentModal({show: true, bill})} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm">
                            Mark Paid
                          </button>
                        )}
                        
                        {/* If Paid, show Receipt and Attachment Buttons */}
                        {bill.status === 'Paid' && (
                          <div className="flex justify-end gap-2">
                            {/* View Uploaded Proof (Admin Only) */}
                            {role === 'admin' && bill.receipt_url && (
                              <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-1">
                                📎 Proof
                              </a>
                            )}
                            <button onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }} className="bg-white/50 text-slate-800 border border-white/60 px-5 py-2 rounded-xl font-bold text-xs hover:bg-white transition-all shadow-sm">
                              {role === 'admin' ? 'Receipt' : 'E-Receipt'}
                            </button>
                          </div>
                        )}

                        {role === 'admin' && bill.status === 'Pending' && (
                          <button onClick={() => handleDeleteBill(bill.id)} className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-500/20 transition-all">
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

        {/* ADMIN VERIFICATION MODAL */}
        {paymentModal.show && paymentModal.bill && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/60 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Receive Payment</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">Unit {paymentModal.bill.unit_number} - RM {parseFloat(paymentModal.bill.amount).toFixed(2)}</p>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <button onClick={() => { setPaymentMethod('walk-in'); setPaymentFile(null); }} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentMethod === 'walk-in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    🚶‍♂️ Walk-In
                  </button>
                  <button onClick={() => setPaymentMethod('online')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentMethod === 'online' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    💻 Online
                  </button>
                </div>

                {paymentMethod === 'online' && (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Attach User Receipt (Required) *</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setPaymentFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all outline-none cursor-pointer" />
                    
                    {paymentFile && (
                      <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden bg-white relative p-2">
                        {paymentFile.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(paymentFile)} alt="Receipt Preview" className="mx-auto max-h-48 object-contain rounded" />
                        ) : (
                          <div className="py-8 text-center text-slate-600 font-bold bg-slate-100 rounded">📄 {paymentFile.name}</div>
                        )}
                        <button onClick={() => setPaymentFile(null)} className="absolute top-2 right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-600">✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setPaymentModal({show: false, bill: null}); setPaymentFile(null); setPaymentMethod('walk-in'); }} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors">Cancel</button>
                <button onClick={handleProcessPayment} disabled={isProcessingPayment || (paymentMethod === 'online' && !paymentFile)} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessingPayment ? 'Processing...' : 'Verify & Mark Paid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OFFICIAL RECEIPT MODAL (PRINT ENABLED) */}
        {showReceiptModal && selectedBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            
            {/* CSS Print Rules - Completely isolates this specific box when printing */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  box-shadow: none !important;
                }
              }
            `}</style>

            <div 
              id="receipt-print-area" 
              className="bg-white p-8 w-full max-w-2xl border-4 border-purple-500 shadow-2xl text-black font-sans relative print:border-4 print:border-purple-500" 
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex justify-between items-end border-b-[1.5px] border-black pb-2 mb-6">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl sm:text-5xl font-serif font-bold tracking-wider">RECEIPT</h2>
                  <span className="text-sm font-medium uppercase tracking-wide">INV NO: INV-{selectedBill.id.toString().padStart(4, '0')}</span>
                </div>
                <div className="flex items-end gap-2 w-48">
                  <span className="text-sm font-medium uppercase tracking-wide">DATE:</span>
                  <div className="border-b-[1.5px] border-black w-full text-center pb-1 text-sm font-bold">
                    {new Date(selectedBill.paid_at || new Date()).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 mb-6">
                <div className="flex gap-2 items-end">
                  <span className="text-sm font-medium uppercase tracking-wide whitespace-nowrap">NAME:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-bold text-sm">
                    {selectedBill.resident_name} (Unit {selectedBill.unit_number})
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <span className="text-sm font-medium uppercase tracking-wide whitespace-nowrap">AMOUNT:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-bold text-sm">
                    RM {parseFloat(selectedBill.amount).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex gap-8 mb-6 items-center pl-2">
                <label className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide">
                  <div className={`w-6 h-6 border-[1.5px] border-black flex items-center justify-center ${selectedBill.payment_method === 'walk-in' ? 'bg-black text-white' : 'bg-white'}`}>
                    {selectedBill.payment_method === 'walk-in' && '✓'}
                  </div>
                  CASH
                </label>
                <label className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide">
                  <div className={`w-6 h-6 border-[1.5px] border-black flex items-center justify-center ${selectedBill.payment_method === 'online' ? 'bg-black text-white' : 'bg-white'}`}>
                    {selectedBill.payment_method === 'online' && '✓'}
                  </div>
                  BANK TRANSFER
                </label>
              </div>

              <div className="border-b-[1.5px] border-black mb-6"></div>

              <div className="space-y-6 mb-10">
                <div className="flex gap-2 items-end">
                  <span className="text-sm font-medium uppercase tracking-wide whitespace-nowrap">PAYMENT FOR:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-bold text-sm">
                    {selectedBill.description}
                  </div>
                </div>
                <div className="flex gap-2 items-end w-2/3">
                  <span className="text-sm font-medium uppercase tracking-wide whitespace-nowrap">RECEIVED BY:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-bold text-sm">
                    Management
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 text-center py-4 text-sm font-bold text-slate-800 print:bg-slate-100">
                Thank You for Your Payment
              </div>

              <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4 print:hidden">
                <button onClick={() => setShowReceiptModal(false)} className="px-6 py-2.5 bg-white text-slate-800 border border-slate-300 rounded-lg font-bold hover:bg-slate-50 transition-colors shadow-sm">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2">
                  🖨️ Print Receipt
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}