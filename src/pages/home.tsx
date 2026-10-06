import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
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
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [pendingBills]);

  const residentName = useMemo(() => {
    const res = residents.find(r => r.unit_number === selectedUnit);
    return res ? res.name : 'Resident';
  }, [selectedUnit, residents]);

  const handleWhatsAppPayment = () => {
    const text = `Hello Management, I would like to make an online transfer for Unit ${selectedUnit}.%0A%0A*Total Amount Due:* RM ${userStats.outstandingAmount.toFixed(2)}%0A%0APlease provide the bank details.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading Portal...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4 relative">
      <div className="max-w-4xl mx-auto text-center">
        
        <h1 className="text-5xl sm:text-7xl font-black text-black tracking-tighter uppercase mb-4">Resident Portal.</h1>
        <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mb-16">Select Unit // View Balances</p>

        {/* Dropdowns - Sharp, Architectural */}
        <div className="mb-12 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full sm:w-1/3 p-5 bg-transparent border-2 border-black outline-none text-black font-bold uppercase tracking-widest text-sm transition-colors rounded-none cursor-pointer focus:bg-black focus:text-white">
              <option value="" className="bg-white text-black">BLOCK</option>
              {availableBlocks.map(b => <option key={b} value={b} className="bg-white text-black">{b}</option>)}
            </select>
            <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }} disabled={!selectedBlock} className="w-full sm:w-1/3 p-5 bg-transparent border-2 border-black outline-none text-black font-bold uppercase tracking-widest text-sm transition-colors rounded-none disabled:opacity-30 cursor-pointer focus:bg-black focus:text-white">
              <option value="" className="bg-white text-black">FLOOR</option>
              {availableFloors.map(f => <option key={f} value={f} className="bg-white text-black">{f}</option>)}
            </select>
            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedFloor} className="w-full sm:w-1/3 p-5 bg-transparent border-2 border-black outline-none text-black font-bold uppercase tracking-widest text-sm transition-colors rounded-none disabled:opacity-30 cursor-pointer focus:bg-black focus:text-white">
              <option value="" className="bg-white text-black">UNIT</option>
              {availableUnits.map(u => <option key={u.id} value={u.unit_number} className="bg-white text-black">{u.unit_number.split('-')[2]}</option>)}
            </select>
          </div>
        </div>

        {/* Display Panel */}
        {selectedUnit && (
          <div className="bg-white p-12 sm:p-16 border-2 border-black animate-fade-in max-w-2xl mx-auto">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 block border-b-2 border-black pb-4">Outstanding Balance // Unit {selectedUnit}</span>
            <div className="text-6xl sm:text-8xl font-black text-black tracking-tighter mb-8 mt-8">
              RM {userStats.outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            
            {userStats.pendingCount > 0 ? (
              <>
                <p className="text-red-600 font-bold uppercase tracking-widest text-xs mb-10">{userStats.pendingCount} UNPAID BILLS FOUND</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => setShowInvoice(true)} className="flex-1 bg-transparent text-black border-2 border-black py-4 px-6 font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">
                    View Invoice
                  </button>
                  <button onClick={handleWhatsAppPayment} className="flex-[1.5] bg-black text-white py-4 px-6 font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                    Pay Online
                  </button>
                </div>
              </>
            ) : (
              <p className="text-black font-black uppercase tracking-widest text-lg border-t-2 border-black pt-8">No pending balances.</p>
            )}
          </div>
        )}

        {/* INVOICE MODAL */}
        {showInvoice && (
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #invoice-print-area, #invoice-print-area * { visibility: visible; }
                #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; box-shadow: none !important; max-height: none !important; overflow: visible !important; }
              }
            `}</style>
            
            <div id="invoice-print-area" className="bg-white p-8 sm:p-16 w-full max-w-3xl border-2 border-black text-black font-sans relative max-h-[90vh] overflow-y-auto text-left rounded-none">
              
              <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-12 mt-4">
                <div>
                  <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase">Invoice.</h2>
                  <p className="text-neutral-500 font-bold mt-2 tracking-widest uppercase text-xs">Outstanding Balance Statement</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Date Issued</p>
                  <p className="font-black text-lg">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-end mb-12">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Billed To</p>
                  <p className="font-black text-2xl uppercase">{residentName}</p>
                  <p className="font-bold text-neutral-600 mt-1 uppercase tracking-widest text-xs">Unit {selectedUnit}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-12">
                <thead>
                  <tr className="border-b-2 border-black text-[10px] uppercase tracking-widest text-neutral-500">
                    <th className="py-4 font-bold">Description</th>
                    <th className="py-4 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-neutral-200">
                      <td className="py-6 font-bold text-black uppercase text-sm">{item.description}</td>
                      <td className="py-6 font-black text-right">RM {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-4 border-black">
                    <td className="py-8 font-black text-xl text-right uppercase tracking-tighter">Total Due:</td>
                    <td className="py-8 font-black text-3xl text-red-600 text-right tracking-tighter">RM {userStats.outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest print:hidden mt-8 mb-6">
                Please make payment to the Management Office via Walk-In or Online Transfer.
              </div>

              <div className="flex justify-center gap-4 print:hidden">
                <button onClick={() => setShowInvoice(false)} className="px-8 py-4 bg-transparent text-black border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                  Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}