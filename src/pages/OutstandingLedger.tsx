import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

export default function OutstandingLedger() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);

  const [issueTargetType, setIssueTargetType] = useState<'UNIT' | 'FLOOR' | 'BLOCK' | 'ALL'>('ALL');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [billsData, residentsData] = await Promise.all([
      supabase.from('bills').select('*').limit(100000),
      supabase.from('residents').select('*').limit(1000)
    ]);
    if (billsData.data) setBills(billsData.data);
    if (residentsData.data) setResidents(residentsData.data);
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

  const filteredBills = bills.filter(bill => {
    if (issueTargetType === 'ALL') return true;
    if (issueTargetType === 'BLOCK' && selectedBlock) return bill.unit_number?.startsWith(`${selectedBlock}-`);
    if (issueTargetType === 'FLOOR' && selectedBlock && selectedFloor) return bill.unit_number?.startsWith(`${selectedBlock}-${selectedFloor}-`);
    if (issueTargetType === 'UNIT' && selectedUnit) return bill.unit_number === selectedUnit;
    return false;
  });

  const totalOutstanding = filteredBills
    .filter(b => b.status === 'Pending')
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalCollection = filteredBills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalAmount = totalOutstanding + totalCollection;
  const outstandingPercent = totalAmount === 0 ? 0 : (totalOutstanding / totalAmount) * 100;
  const collectionPercent = totalAmount === 0 ? 0 : (totalCollection / totalAmount) * 100;

  const oldestDate = filteredBills.length > 0
    ? new Date(Math.min(...filteredBills.map(b => new Date(b.issued_at).getTime())))
        .toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : "System Start";

  // INVOICE LOGIC (Only relevant when filtering by UNIT)
  const invoiceItems = useMemo(() => {
    if (issueTargetType !== 'UNIT' || !selectedUnit) return [];
    const pending = filteredBills.filter(b => b.status === 'Pending');
    
    const grouped = pending.reduce((acc, bill) => {
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
  }, [filteredBills, issueTargetType, selectedUnit]);

  const residentName = useMemo(() => {
    const res = residents.find(r => r.unit_number === selectedUnit);
    return res ? res.name : 'Resident';
  }, [selectedUnit, residents]);

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading ledger...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans pb-12 pt-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        <div className="text-center md:text-left mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Total Outstanding & Collection</h1>
          <p className="text-slate-600 font-medium mt-2">Filter by unit or block to view financial performance.</p>
        </div>

        {/* --- FILTER SECTION --- */}
        <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Filter Ledger</h3>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-1/4">
              <select value={issueTargetType} onChange={(e) => { setIssueTargetType(e.target.value as any); setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold shadow-sm">
                <option value="ALL">Entire Residence (All)</option>
                <option value="BLOCK">By Block</option>
                <option value="FLOOR">By Floor</option>
                <option value="UNIT">Specific Unit</option>
              </select>
            </div>

            {issueTargetType !== 'ALL' && (
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1">
                  <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm">
                    <option value="">-- Select Block --</option>
                    {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {['FLOOR', 'UNIT'].includes(issueTargetType) && (
                  <div className="flex-1">
                    <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }} disabled={!selectedBlock} className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm disabled:opacity-50">
                      <option value="">-- Select Floor --</option>
                      {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                    </select>
                  </div>
                )}

                {issueTargetType === 'UNIT' && (
                  <div className="flex-1">
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedFloor} className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm disabled:opacity-50">
                      <option value="">-- Select Unit --</option>
                      {availableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]} ({u.name})</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
              <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-2">Total Outstanding</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">RM {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              
              {/* Show Invoice Button ONLY if a specific unit is selected and has debt */}
              {issueTargetType === 'UNIT' && selectedUnit && totalOutstanding > 0 ? (
                <button onClick={() => setShowInvoice(true)} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md flex items-center gap-2">
                  📄 Issue Invoice
                </button>
              ) : (
                <p className="text-slate-500 font-medium mt-2">Unpaid fees based on current filter.</p>
              )}
            </div>

            <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
              <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2">Total Collection</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">RM {totalCollection.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              <p className="text-slate-500 font-medium mt-2">Successfully collected payments.</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl border border-white shadow-xl flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-slate-900">Financial Distribution</h3>
              <p className="text-sm font-medium text-slate-500 mt-1 bg-slate-100 inline-block px-3 py-1 rounded-full border border-slate-200">
                Calculated since <span className="font-bold text-slate-700">{oldestDate}</span>
              </p>
            </div>
            
            <div className="relative">
              <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full shadow-inner border-8 border-white transform transition-transform hover:scale-105 duration-300" style={{ background: totalAmount > 0 ? `conic-gradient(#f43f5e 0% ${outstandingPercent}%, #10b981 ${outstandingPercent}% 100%)` : '#e2e8f0' }}></div>
              {totalAmount === 0 && <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-400">No Data</div>}
            </div>

            <div className="flex gap-8 mt-10 w-full justify-center">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-rose-500 shadow-sm"></div><div><div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding</div><div className="font-bold text-slate-900">{outstandingPercent.toFixed(1)}%</div></div></div>
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm"></div><div><div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected</div><div className="font-bold text-slate-900">{collectionPercent.toFixed(1)}%</div></div></div>
            </div>
          </div>

        </div>

        {/* ADMIN INVOICE MODAL */}
        {showInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #admin-invoice-area, #admin-invoice-area * { visibility: visible; }
                #admin-invoice-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-shadow: none !important; }
              }
            `}</style>
            
            <div id="admin-invoice-area" className="bg-white p-8 sm:p-12 w-full max-w-2xl border border-slate-200 shadow-2xl text-slate-900 font-sans relative rounded-2xl print:border-none print:rounded-none text-left max-h-[90vh] overflow-y-auto">
              
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
                    <td className="py-6 font-extrabold text-2xl text-rose-600 text-right">RM {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center text-sm font-bold text-slate-500 print:hidden mt-8 mb-6">
                Generated by Residence Management System
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