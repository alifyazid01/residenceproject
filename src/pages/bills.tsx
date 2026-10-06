import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Bills() {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  
  const [issueTargetType, setIssueTargetType] = useState<'UNIT' | 'FLOOR' | 'BLOCK' | 'ALL'>('UNIT');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: '' });

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
          supabase.from('bills').select('*').order('issued_at', { ascending: false }).limit(10000),
          supabase.from('residents').select('*').limit(1000)
        ]);
        if (billsData.data) setBills(billsData.data);
        if (residentsData.data) setResidents(residentsData.data);
      }
    }
    setLoading(false);
  };

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

  const filteredBills = bills.filter(bill => {
    const matchesSearch = searchQuery === '' || 
                          bill.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bill.resident_name.toLowerCase().includes(searchQuery.toLowerCase());
    
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
      } else if (issueTargetType === 'BLOCK') {
        if (!selectedBlock) throw new Error("Please select a Block.");
        targetResidents = residents.filter(r => r.unit_number?.startsWith(`${selectedBlock}-`));
      } else if (issueTargetType === 'FLOOR') {
        if (!selectedBlock || !selectedFloor) throw new Error("Please select a Block and Floor.");
        targetResidents = residents.filter(r => r.unit_number?.startsWith(`${selectedBlock}-${selectedFloor}-`));
      } else if (issueTargetType === 'UNIT') {
        if (!selectedUnit) throw new Error("Please select a specific Unit.");
        targetResidents = residents.filter(r => r.unit_number === selectedUnit);
      }
      if (targetResidents.length === 0) throw new Error("No residents matched your selected filters.");

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
      setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit('');
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.bill) return;
    if (paymentMethod === 'online' && !paymentFile) {
      alert("Authorization Denied: You must attach the user's online payment receipt.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      let uploadedReceiptUrl = null;
      if (paymentMethod === 'online' && paymentFile) {
        const fileExt = paymentFile.name.split('.').pop();
        const fileName = `bill_${paymentModal.bill.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, paymentFile);
        if (uploadError) throw new Error("Failed to upload receipt: " + uploadError.message);
        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        uploadedReceiptUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'Paid', paid_at: new Date().toISOString(), payment_method: paymentMethod, receipt_url: uploadedReceiptUrl })
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

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading Database...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="border-b-2 border-black pb-8 mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-black uppercase tracking-tighter mb-2">Billing Ops.</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Issue Invoices // Reconcile Payments // Print Receipts</p>
        </div>

        {/* ADMIN VIEW: ISSUE BILL FORM */}
        <div className="bg-white border border-neutral-200 p-8 sm:p-10 mb-12">
          <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Issue New Bill</h3>
          
          <form onSubmit={handleIssueBill} className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-1/4">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Target Scope</label>
                <select 
                  value={issueTargetType} 
                  onChange={(e) => { setIssueTargetType(e.target.value as any); setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit(''); }} 
                  className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none cursor-pointer"
                >
                  <option value="UNIT">Single Unit</option>
                  <option value="FLOOR">Entire Floor</option>
                  <option value="BLOCK">Entire Block</option>
                  <option value="ALL">All Residents</option>
                </select>
              </div>

              {issueTargetType !== 'ALL' && (
                <div className="flex-1 flex flex-col sm:flex-row gap-6 w-full">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Block</label>
                    <select 
                      value={selectedBlock} 
                      onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }}
                      className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none cursor-pointer"
                    >
                      <option value="">-- Block --</option>
                      {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  {['FLOOR', 'UNIT'].includes(issueTargetType) && (
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Floor</label>
                      <select 
                        value={selectedFloor} 
                        onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }}
                        disabled={!selectedBlock}
                        className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 cursor-pointer"
                      >
                        <option value="">-- Floor --</option>
                        {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                      </select>
                    </div>
                  )}
                  {issueTargetType === 'UNIT' && (
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Unit</label>
                      <select 
                        value={selectedUnit} 
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        disabled={!selectedFloor}
                        className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 cursor-pointer"
                      >
                        <option value="">-- Unit --</option>
                        {availableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]} ({u.name})</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-[3] w-full">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Description</label>
                <input type="text" placeholder="e.g. Monthly Maintenance" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold transition-colors rounded-none" />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Amount (RM)</label>
                <input type="number" min="1" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold transition-colors rounded-none" />
              </div>
              <div className="w-full md:w-auto">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-70 whitespace-nowrap">
                  {isSubmitting ? 'Issuing...' : 'Issue Bill'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* --- TABLE SEARCH ENGINE & FILTERS --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="SEARCH BY RESIDENT OR UNIT..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-4 bg-white border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none placeholder-neutral-400"
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-4 w-full md:w-auto">
             <select value={tableFilterType} onChange={(e) => { setTableFilterType(e.target.value as any); setTableSelectedBlock(''); setTableSelectedFloor(''); setTableSelectedUnit(''); }} className="p-4 bg-white border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none flex-1 cursor-pointer">
               <option value="ALL">All Bills</option>
               <option value="BLOCK">Filter By Block</option>
               <option value="FLOOR">Filter By Floor</option>
               <option value="UNIT">Filter By Unit</option>
             </select>
             {tableFilterType !== 'ALL' && (
               <select value={tableSelectedBlock} onChange={(e) => { setTableSelectedBlock(e.target.value); setTableSelectedFloor(''); setTableSelectedUnit(''); }} className="p-4 bg-white border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none flex-1 cursor-pointer">
                 <option value="">Block</option>
                 {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
               </select>
             )}
             {['FLOOR', 'UNIT'].includes(tableFilterType) && (
               <select value={tableSelectedFloor} onChange={(e) => { setTableSelectedFloor(e.target.value); setTableSelectedUnit(''); }} disabled={!tableSelectedBlock} className="p-4 bg-white border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 flex-1 cursor-pointer">
                 <option value="">Floor</option>
                 {tableAvailableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
               </select>
             )}
             {tableFilterType === 'UNIT' && (
               <select value={tableSelectedUnit} onChange={(e) => setTableSelectedUnit(e.target.value)} disabled={!tableSelectedFloor} className="p-4 bg-white border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 flex-1 cursor-pointer">
                 <option value="">Unit</option>
                 {tableAvailableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]}</option>)}
               </select>
             )}
          </div>
        </div>

        {/* SHARED VIEW: BILLS TABLE */}
        <div className="bg-white border border-neutral-200 overflow-hidden mb-12">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px] relative">
              <thead className="sticky top-0 z-20">
                <tr className="bg-neutral-100 border-b-2 border-black text-[10px] text-black uppercase tracking-widest">
                  <th className="p-5 font-bold">Date Issued</th>
                  <th className="p-5 font-bold">Resident</th>
                  <th className="p-5 font-bold">Description</th>
                  <th className="p-5 font-bold">Amount</th>
                  <th className="p-5 font-bold">Status</th>
                  <th className="p-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-neutral-400 font-bold uppercase tracking-widest text-sm">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors">
                      <td className="p-5 text-neutral-500 font-bold text-xs uppercase tracking-widest">{new Date(bill.issued_at).toLocaleDateString()}</td>
                      <td className="p-5">
                        <div className="font-black text-black uppercase text-sm">Unit {bill.unit_number}</div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">{bill.resident_name}</div>
                      </td>
                      <td className="p-5 font-bold text-black uppercase text-sm">{bill.description}</td>
                      <td className="p-5 font-black text-black tracking-tight text-lg">RM {parseFloat(bill.amount).toFixed(2)}</td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 ${bill.status === 'Paid' ? 'border-black text-black' : 'border-red-600 text-red-600'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-5 text-right space-x-2">
                        {bill.status === 'Pending' && (
                          <button onClick={() => setPaymentModal({show: true, bill})} className="bg-black text-white px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-colors">
                            Mark Paid
                          </button>
                        )}
                        
                        {bill.status === 'Paid' && (
                          <div className="flex justify-end gap-2">
                            {bill.receipt_url && (
                              <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer" className="bg-transparent text-black border-2 border-black px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-100 transition-colors flex items-center gap-2">
                                Proof
                              </a>
                            )}
                            <button onClick={() => { setSelectedBill(bill); setShowReceiptModal(true); }} className="bg-black text-white px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-colors">
                              Receipt
                            </button>
                          </div>
                        )}

                        {bill.status === 'Pending' && (
                          <button onClick={() => handleDeleteBill(bill.id)} className="bg-transparent text-red-600 border-2 border-red-600 px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 transition-colors">
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
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-10 sm:p-12 border-2 border-black w-full max-w-lg relative max-h-[90vh] overflow-y-auto rounded-none">
              <h3 className="text-3xl font-black text-black uppercase tracking-tighter mb-2">Receive Payment.</h3>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-8">Unit {paymentModal.bill.unit_number} // RM {parseFloat(paymentModal.bill.amount).toFixed(2)}</p>

              <div className="space-y-6 mb-10">
                <div className="flex gap-4">
                  <button onClick={() => { setPaymentMethod('walk-in'); setPaymentFile(null); }} className={`flex-1 py-4 px-4 font-bold uppercase tracking-widest text-xs border-2 transition-colors ${paymentMethod === 'walk-in' ? 'border-black bg-black text-white' : 'border-neutral-300 bg-transparent text-neutral-500 hover:border-black'}`}>
                    Walk-In
                  </button>
                  <button onClick={() => setPaymentMethod('online')} className={`flex-1 py-4 px-4 font-bold uppercase tracking-widest text-xs border-2 transition-colors ${paymentMethod === 'online' ? 'border-black bg-black text-white' : 'border-neutral-300 bg-transparent text-neutral-500 hover:border-black'}`}>
                    Online
                  </button>
                </div>

                {paymentMethod === 'online' && (
                  <div className="bg-neutral-50 p-6 border-2 border-neutral-200">
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-4">Attach Bank Receipt *</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setPaymentFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-bold file:bg-black file:text-white hover:file:bg-neutral-800 transition-all outline-none cursor-pointer" />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => { setPaymentModal({show: false, bill: null}); setPaymentFile(null); setPaymentMethod('walk-in'); }} className="flex-1 py-4 bg-transparent text-black border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">Cancel</button>
                <button onClick={handleProcessPayment} disabled={isProcessingPayment || (paymentMethod === 'online' && !paymentFile)} className="flex-[2] py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  {isProcessingPayment ? 'Processing...' : 'Verify & Mark Paid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OFFICIAL RECEIPT MODAL */}
        {showReceiptModal && selectedBill && (
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #receipt-print-area, #receipt-print-area * { visibility: visible; }
                #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; box-shadow: none !important; }
              }
            `}</style>

            <div id="receipt-print-area" className="bg-white p-8 sm:p-12 w-full max-w-xl border-4 border-black text-black font-sans relative print:border-4 print:border-black">
              <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-8">
                <div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase">Receipt.</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">INV NO.</p>
                  <p className="font-black text-lg">INV-{selectedBill.id.toString().padStart(4, '0')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Billed To</p>
                  <p className="font-black uppercase text-xl">{selectedBill.resident_name}</p>
                  <p className="font-bold text-neutral-600 uppercase tracking-widest text-xs mt-1">Unit {selectedBill.unit_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Date Paid</p>
                  <p className="font-black uppercase text-xl">{new Date(selectedBill.paid_at || new Date()).toLocaleDateString()}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-10">
                <thead>
                  <tr className="border-b-2 border-black text-[10px] uppercase tracking-widest text-neutral-500">
                    <th className="py-4 font-bold">Description</th>
                    <th className="py-4 font-bold text-right">Method</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-6 font-bold text-black uppercase text-sm">{selectedBill.description}</td>
                    <td className="py-6 font-bold text-black uppercase text-sm text-right">{selectedBill.payment_method === 'walk-in' ? 'CASH' : 'ONLINE'}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-4 border-black">
                    <td className="py-6 font-black text-lg text-right uppercase tracking-tighter">Amount Paid:</td>
                    <td className="py-6 font-black text-2xl text-black text-right tracking-tighter">RM {parseFloat(selectedBill.amount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest print:hidden mt-8 mb-6">
                Official Proof of Payment // Residence System
              </div>

              <div className="flex justify-center gap-4 print:hidden">
                <button onClick={() => setShowReceiptModal(false)} className="px-8 py-4 bg-transparent text-black border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}