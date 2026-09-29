import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Bills() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  
  // --- ISSUE BILL: FILTER STATES ---
  const [issueTargetType, setIssueTargetType] = useState<'UNIT' | 'FLOOR' | 'BLOCK' | 'ALL'>('UNIT');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: '' });

  // --- TABLE SEARCH & FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilterType, setTableFilterType] = useState<'ALL' | 'BLOCK' | 'FLOOR' | 'UNIT'>('ALL');
  const [tableSelectedBlock, setTableSelectedBlock] = useState('');
  const [tableSelectedFloor, setTableSelectedFloor] = useState('');
  const [tableSelectedUnit, setTableSelectedUnit] = useState('');

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
      setRole(currentRole);

      if (currentRole === 'admin') {
        const [billsData, residentsData] = await Promise.all([
          // Added .limit(10000) to fetch all historical dummy bills
          supabase.from('bills').select('*').order('issued_at', { ascending: false }).limit(10000),
          supabase.from('residents').select('*').limit(1000)
        ]);
        if (billsData.data) setBills(billsData.data);
        if (residentsData.data) setResidents(residentsData.data);
      }
    }
    setLoading(false);
  };

  // --- DYNAMIC DROPDOWN LOGIC WITH CUSTOM SORTING ---
  const availableBlocks = Array.from(new Set(residents.map(r => r.unit_number?.split('-')[0]).filter(Boolean)))
    .sort((a, b) => parseInt(a.replace('B', ''), 10) - parseInt(b.replace('B', ''), 10));
  
  const availableFloors = selectedBlock 
    ? Array.from(new Set(residents
        .filter(r => r.unit_number?.startsWith(`${selectedBlock}-`))
        .map(r => r.unit_number?.split('-')[1])
        .filter(Boolean)))
        .sort((a, b) => {
          if (a === 'G') return -1;
          if (b === 'G') return 1;
          return parseInt(a, 10) - parseInt(b, 10);
        })
    : [];
    
  const availableUnits = (selectedBlock && selectedFloor) 
    ? residents
        .filter(r => r.unit_number?.startsWith(`${selectedBlock}-${selectedFloor}-`))
        .sort((a,b) => a.unit_number.localeCompare(b.unit_number)) 
    : [];

  // Table Available Floors/Units (for the Table Filter)
  const tableAvailableFloors = tableSelectedBlock 
    ? Array.from(new Set(residents
        .filter(r => r.unit_number?.startsWith(`${tableSelectedBlock}-`))
        .map(r => r.unit_number?.split('-')[1])
        .filter(Boolean)))
        .sort((a, b) => {
          if (a === 'G') return -1;
          if (b === 'G') return 1;
          return parseInt(a, 10) - parseInt(b, 10);
        })
    : [];

  const tableAvailableUnits = (tableSelectedBlock && tableSelectedFloor) 
    ? residents
        .filter(r => r.unit_number?.startsWith(`${tableSelectedBlock}-${tableSelectedFloor}-`))
        .sort((a,b) => a.unit_number.localeCompare(b.unit_number)) 
    : [];

  // --- FILTER BILLS LIST LOGIC ---
  const filteredBills = bills.filter(bill => {
    // Text Search
    const matchesSearch = searchQuery === '' || 
                          bill.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bill.resident_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Dropdown Filter
    let matchesDropdown = true;
    if (tableFilterType === 'BLOCK' && tableSelectedBlock) {
       matchesDropdown = bill.unit_number?.startsWith(`${tableSelectedBlock}-`);
    } else if (tableFilterType === 'FLOOR' && tableSelectedBlock && tableSelectedFloor) {
       matchesDropdown = bill.unit_number?.startsWith(`${tableSelectedBlock}-${tableSelectedFloor}-`);
    } else if (tableFilterType === 'UNIT' && tableSelectedUnit) {
       matchesDropdown = bill.unit_number === tableSelectedUnit;
    }

    return matchesSearch && matchesDropdown;
  });

  const handleIssueBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let targetResidents: any[] = [];

      if (issueTargetType === 'ALL') {
        targetResidents = residents;
        if (targetResidents.length === 0) throw new Error("No residents found.");
      } 
      else if (issueTargetType === 'BLOCK') {
        if (!selectedBlock) throw new Error("Please select a Block.");
        targetResidents = residents.filter(r => r.unit_number?.startsWith(`${selectedBlock}-`));
      } 
      else if (issueTargetType === 'FLOOR') {
        if (!selectedBlock || !selectedFloor) throw new Error("Please select a Block and Floor.");
        targetResidents = residents.filter(r => r.unit_number?.startsWith(`${selectedBlock}-${selectedFloor}-`));
      } 
      else if (issueTargetType === 'UNIT') {
        if (!selectedUnit) throw new Error("Please select a specific Unit.");
        targetResidents = residents.filter(r => r.unit_number === selectedUnit);
      }

      if (targetResidents.length === 0) {
        throw new Error("No residents matched your selected filters.");
      }

      const billsToInsert = targetResidents.map(r => ({
         unit_number: r.unit_number ? String(r.unit_number) : 'N/A',
         resident_name: r.name ? String(r.name) : 'Resident',
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
      
      alert(`Successfully issued bill to ${targetResidents.length} unit(s)!`);
      
      setFormData({ description: '', amount: '' });
      setSelectedBlock('');
      setSelectedFloor('');
      setSelectedUnit('');
      
    } catch (error: any) {
      alert(error.message);
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

      if (paymentMethod === 'online' && paymentFile) {
        const fileExt = paymentFile.name.split('.').pop();
        const fileName = `bill_${paymentModal.bill.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, paymentFile);

        if (uploadError) throw new Error("Failed to upload receipt. Details: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        uploadedReceiptUrl = publicUrlData.publicUrl;
      }

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

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading billing data...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Billing Operations</h1>
          <p className="text-slate-600 font-medium">Issue invoices, reconcile offline payments, and generate official receipts.</p>
        </div>

        {/* ADMIN VIEW: ISSUE BILL FORM WITH CASCADING DROPDOWNS */}
        <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-5">Issue New Bill</h3>
          
          <form onSubmit={handleIssueBill} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="w-full md:w-1/4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Target Scope</label>
                <select 
                  value={issueTargetType} 
                  onChange={(e) => {
                    setIssueTargetType(e.target.value as any);
                    setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit('');
                  }} 
                  className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-bold transition-all shadow-sm"
                >
                  <option value="UNIT">Single Unit</option>
                  <option value="FLOOR">Entire Floor</option>
                  <option value="BLOCK">Entire Block</option>
                  <option value="ALL">All Residents</option>
                </select>
              </div>

              {issueTargetType !== 'ALL' && (
                <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Block</label>
                    <select 
                      value={selectedBlock} 
                      onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }}
                      className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white outline-none text-slate-800 transition-all shadow-sm"
                    >
                      <option value="">-- Block --</option>
                      {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {['FLOOR', 'UNIT'].includes(issueTargetType) && (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Floor</label>
                      <select 
                        value={selectedFloor} 
                        onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }}
                        disabled={!selectedBlock}
                        className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white outline-none text-slate-800 transition-all shadow-sm disabled:opacity-50"
                      >
                        <option value="">-- Floor --</option>
                        {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                      </select>
                    </div>
                  )}

                  {issueTargetType === 'UNIT' && (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Unit</label>
                      <select 
                        value={selectedUnit} 
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        disabled={!selectedFloor}
                        className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white outline-none text-slate-800 transition-all shadow-sm disabled:opacity-50"
                      >
                        <option value="">-- Unit --</option>
                        {availableUnits.map(u => (
                          <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]} ({u.name})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-[3] w-full">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Description</label>
                <input type="text" placeholder="e.g. Monthly Maintenance Fee" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm" />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Amount (RM)</label>
                <input type="number" min="1" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="w-full p-3 rounded-xl bg-white/50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm" />
              </div>
              <div className="w-full md:w-auto">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md disabled:opacity-70 h-[50px] whitespace-nowrap">
                  {isSubmitting ? 'Issuing...' : 'Issue Bill'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* --- TABLE SEARCH ENGINE & FILTERS --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
          
          <div className="flex-1 w-full relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Search by resident name or exact unit (e.g. B1-G-01)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 p-3.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 shadow-sm transition-all font-medium"
            />
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
             <select 
               value={tableFilterType}
               onChange={(e) => {
                 setTableFilterType(e.target.value as any);
                 setTableSelectedBlock(''); setTableSelectedFloor(''); setTableSelectedUnit('');
               }}
               className="p-3.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 focus:bg-white outline-none text-slate-800 shadow-sm text-sm font-bold flex-1"
             >
               <option value="ALL">All Bills</option>
               <option value="BLOCK">Filter by Block</option>
               <option value="FLOOR">Filter by Floor</option>
               <option value="UNIT">Filter by Unit</option>
             </select>

             {tableFilterType !== 'ALL' && (
               <select 
                 value={tableSelectedBlock}
                 onChange={(e) => { setTableSelectedBlock(e.target.value); setTableSelectedFloor(''); setTableSelectedUnit(''); }}
                 className="p-3.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 focus:bg-white outline-none text-slate-800 shadow-sm text-sm flex-1 font-bold"
               >
                 <option value="">Block</option>
                 {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
               </select>
             )}

             {['FLOOR', 'UNIT'].includes(tableFilterType) && (
               <select 
                 value={tableSelectedFloor}
                 onChange={(e) => { setTableSelectedFloor(e.target.value); setTableSelectedUnit(''); }}
                 disabled={!tableSelectedBlock}
                 className="p-3.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 focus:bg-white outline-none text-slate-800 shadow-sm text-sm disabled:opacity-50 flex-1 font-bold"
               >
                 <option value="">Floor</option>
                 {tableAvailableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
               </select>
             )}

             {tableFilterType === 'UNIT' && (
               <select 
                 value={tableSelectedUnit}
                 onChange={(e) => setTableSelectedUnit(e.target.value)}
                 disabled={!tableSelectedFloor}
                 className="p-3.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 focus:bg-white outline-none text-slate-800 shadow-sm text-sm disabled:opacity-50 flex-1 font-bold"
               >
                 <option value="">Unit</option>
                 {tableAvailableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]}</option>)}
               </select>
             )}
          </div>
        </div>

        {/* SHARED VIEW: BILLS TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-sm overflow-hidden mb-12">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[750px] relative">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white/90 backdrop-blur-xl border-b border-white/50 text-sm text-slate-700 shadow-sm">
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Date Issued</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Resident</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Description</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500 font-bold text-lg bg-white/30">
                      No matching bills found in the system.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                      <td className="p-5 text-slate-700 text-sm font-medium">{new Date(bill.issued_at).toLocaleDateString()}</td>
                      <td className="p-5">
                        <div className="font-bold text-slate-900">Unit {bill.unit_number}</div>
                        <div className="text-xs text-slate-600">{bill.resident_name}</div>
                      </td>
                      <td className="p-5 font-bold text-slate-900">{bill.description}</td>
                      <td className="p-5 font-extrabold text-slate-900">RM {parseFloat(bill.amount).toFixed(2)}</td>
                      <td className="p-5">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${bill.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/30' : 'bg-amber-500/20 text-amber-800 border-amber-500/30'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-5 text-right space-x-2">
                        {bill.status === 'Pending' && (
                          <button onClick={() => setPaymentModal({show: true, bill})} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm">
                            Mark Paid
                          </button>
                        )}
                        
                        {bill.status === 'Paid' && (
                          <div className="flex justify-end gap-2">
                            {bill.receipt_url && (
                              <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-1">
                                📎 Proof
                              </a>
                            )}
                            <button onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }} className="bg-white/50 text-slate-800 border border-white/60 px-5 py-2 rounded-xl font-bold text-xs hover:bg-white transition-all shadow-sm">
                              Receipt
                            </button>
                          </div>
                        )}

                        {bill.status === 'Pending' && (
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

        {/* PAYMENT VERIFICATION MODAL */}
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

        {/* OFFICIAL RECEIPT MODAL */}
        {showReceiptModal && selectedBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #receipt-print-area, #receipt-print-area * { visibility: visible; }
                #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; }
              }
            `}</style>

            <div id="receipt-print-area" className="bg-white p-8 w-full max-w-2xl border-4 border-purple-500 shadow-2xl text-black font-sans relative print:border-4 print:border-purple-500" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
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