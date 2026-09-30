import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  // Cascading Dropdown States
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  
  const [userStats, setUserStats] = useState({ outstandingAmount: 0, pendingCount: 0 });
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);

  const ADMIN_WHATSAPP = "60179812006"; 

  useEffect(() => {
    const fetchResidents = async () => {
      const { data } = await supabase.from('residents').select('*');
      if (data) setResidents(data);
      setLoading(false);
    };
    fetchResidents();
  }, []);

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

  useEffect(() => {
    if (!selectedUnit) {
      setUserStats({ outstandingAmount: 0, pendingCount: 0 });
      setPendingBills([]);
      return;
    }

    const fetchUnitBills = async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('unit_number', selectedUnit)
        .eq('status', 'Pending');
        
      if (!error && data) {
        const total = data.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
        setUserStats({ outstandingAmount: total, pendingCount: data.length });
        setPendingBills(data);
      }
    };
    
    fetchUnitBills();
  }, [selectedUnit]);

  // Group pending bills by year for the invoice
  const invoiceItems = useMemo(() => {
    if (!pendingBills.length) return [];
    
    const grouped = pendingBills.reduce((acc, bill) => {
      const year = new Date(bill.issued_at).getFullYear();
      if (!acc[year]) acc[year] = 0;
      acc[year] += parseFloat(bill.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(grouped)
      .map(year => ({
        year,
        description: `Maintenance Fee (${year})`,
        amount: grouped[year]
      }))
      .sort((a, b) => parseInt(b.year) - parseInt(a.year)); // Newest first
  }, [pendingBills]);

  const residentName = useMemo(() => {
    const res = residents.find(r => r.unit_number === selectedUnit);
    return res ? res.name : 'Resident';
  }, [selectedUnit, residents]);

  const handleWhatsAppPayment = () => {
    const text = `Hello Management, I would like to make an online transfer for Unit ${selectedUnit}.%0A%0A*Total Amount Due:* RM ${userStats.outstandingAmount.toFixed(2)}%0A%0APlease provide the bank details.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading portal...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-20 pt-12 px-4">
      <div className="max-w-3xl mx-auto text-center relative z-10">
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">Check Outstanding Balance</h1>
        <p className="text-slate-600 font-medium mb-12 text-lg">Select your unit number below to securely view your pending maintenance fees.</p>

        {/* Dropdowns */}
        <div className="mb-10 max-w-2xl mx-auto">
          <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Select Your Unit</label>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 outline-none text-slate-900 font-bold text-lg text-center shadow-sm">
              <option value="">-- Block --</option>
              {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }} disabled={!selectedBlock} className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 outline-none text-slate-900 font-bold text-lg text-center shadow-sm disabled:opacity-50">
              <option value="">-- Floor --</option>
              {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
            </select>
            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedFloor} className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 outline-none text-slate-900 font-bold text-lg text-center shadow-sm disabled:opacity-50">
              <option value="">-- Unit --</option>
              {availableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]}</option>)}
            </select>
          </div>
        </div>

        {/* Display */}
        {selectedUnit && (
          <div className="bg-white/60 backdrop-blur-2xl p-10 rounded-[2rem] border border-white shadow-xl transform transition-all animate-fade-in">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">Total Outstanding for Unit {selectedUnit}</span>
            <div className="text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
              RM {userStats.outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            
            {userStats.pendingCount > 0 ? (
              <>
                <p className="text-rose-600 font-bold mb-8">You have {userStats.pendingCount} unpaid bill{userStats.pendingCount > 1 ? 's' : ''}.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <button onClick={() => setShowInvoice(true)} className="flex-1 bg-white text-slate-800 border-2 border-slate-300 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2">
                    📄 View Invoice
                  </button>
                  <button onClick={handleWhatsAppPayment} className="flex-[1.5] bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-md flex items-center justify-center gap-2">
                    💬 Pay Online
                  </button>
                </div>
              </>
            ) : (
              <p className="text-emerald-600 font-bold text-lg">All caught up! No pending balances.</p>
            )}
          </div>
        )}

        {/* INVOICE MODAL */}
        {showInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #invoice-print-area, #invoice-print-area * { visibility: visible; }
                #invoice-print-area { 
                  position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; 
                  box-shadow: none !important; max-height: none !important; overflow: visible !important; 
                }
              }
            `}</style>
            
            {/* Added max-h-[90vh] and overflow-y-auto to this div! */}
            <div id="invoice-print-area" className="bg-white p-8 sm:p-12 w-full max-w-2xl border border-slate-200 shadow-2xl text-slate-900 font-sans relative rounded-2xl print:border-none print:rounded-none text-left max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">INVOICE</h2>
                  <p className="text-slate-500 font-bold mt-2 tracking-widest uppercase text-sm">Outstanding Balance</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Date Issued</p>
                  <p className="font-bold text-lg">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 print:bg-transparent print:p-0 print:border-none">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Billed To</p>
                  <p className="font-extrabold text-xl text-slate-900">{residentName}</p>
                  <p className="font-bold text-slate-600 mt-1">Unit {selectedUnit}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-sm uppercase tracking-wider text-slate-600">
                    <th className="py-3 font-bold">Description</th>
                    <th className="py-3 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="py-4 font-bold text-slate-800">{item.description}</td>
                      <td className="py-4 font-extrabold text-slate-900 text-right">RM {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-4 border-slate-900">
                    <td className="py-6 font-extrabold text-xl text-right uppercase tracking-widest text-slate-900">Total Due:</td>
                    <td className="py-6 font-extrabold text-2xl text-rose-600 text-right">RM {userStats.outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center text-sm font-bold text-slate-500 print:hidden mt-8 mb-6">
                Please make payment to the Management Office via Walk-In or Online Transfer.
              </div>

              <div className="flex justify-center gap-4 print:hidden">
                <button onClick={() => setShowInvoice(false)} className="px-6 py-3 bg-white text-slate-800 border-2 border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md flex items-center gap-2">
                  🖨️ Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}