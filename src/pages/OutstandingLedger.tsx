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

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading Ledger...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <div className="border-b-2 border-black pb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-black uppercase tracking-tighter mb-2">Ledger.</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Financial Performance // Target Specific Units</p>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-8 border border-neutral-200">
          <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6">Filter Parameters</h3>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-1/4">
              <select value={issueTargetType} onChange={(e) => { setIssueTargetType(e.target.value as any); setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none cursor-pointer">
                <option value="ALL">Entire Residence (All)</option>
                <option value="BLOCK">By Block</option>
                <option value="FLOOR">By Floor</option>
                <option value="UNIT">Specific Unit</option>
              </select>
            </div>

            {issueTargetType !== 'ALL' && (
              <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex-1">
                  <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none cursor-pointer">
                    <option value="">-- Block --</option>
                    {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {['FLOOR', 'UNIT'].includes(issueTargetType) && (
                  <div className="flex-1">
                    <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }} disabled={!selectedBlock} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 cursor-pointer">
                      <option value="">-- Floor --</option>
                      {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                    </select>
                  </div>
                )}

                {issueTargetType === 'UNIT' && (
                  <div className="flex-1">
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedFloor} className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-30 cursor-pointer">
                      <option value="">-- Unit --</option>
                      {availableUnits.map(u => <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]} ({u.name})</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* METRICS & CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-6">
            <div className="bg-white p-10 border border-neutral-200 border-t-4 border-t-red-600">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Total Outstanding</p>
              <h2 className="text-4xl sm:text-6xl font-black text-red-600 tracking-tighter">RM {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              
              {issueTargetType === 'UNIT' && selectedUnit && totalOutstanding > 0 ? (
                <button onClick={() => setShowInvoice(true)} className="mt-8 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                  Issue Invoice
                </button>
              ) : (
                <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px] mt-4">Unpaid fees based on current filter</p>
              )}
            </div>

            <div className="bg-white p-10 border border-neutral-200 border-t-4 border-t-black">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Total Collection</p>
              <h2 className="text-4xl sm:text-6xl font-black text-black tracking-tighter">RM {totalCollection.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px] mt-4">Successfully collected payments</p>
            </div>
          </div>

          <div className="bg-white p-10 border border-neutral-200 flex flex-col items-center justify-center h-full">
            <div className="text-center mb-12">
              <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2">Financial Distribution</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Calculated since {oldestDate}
              </p>
            </div>
            
            <div className="relative mb-12">
              <div 
                className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-neutral-100" 
                style={{ background: totalAmount > 0 ? `conic-gradient(#dc2626 0% ${outstandingPercent}%, #000000 ${outstandingPercent}% 100%)` : '#f5f5f5' }}
              ></div>
              {totalAmount === 0 && <div className="absolute inset-0 flex items-center justify-center font-bold text-neutral-400 uppercase tracking-widest text-xs">No Data</div>}
            </div>

            <div className="flex gap-12 w-full justify-center border-t border-neutral-200 pt-8">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600"></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Outstanding</div>
                </div>
                <div className="font-black text-xl text-black">{outstandingPercent.toFixed(1)}%</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-black"></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Collected</div>
                </div>
                <div className="font-black text-xl text-black">{collectionPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>

        </div>

        {/* ADMIN INVOICE MODAL - Minimalist Editorial Style */}
        {showInvoice && (
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #admin-invoice-area, #admin-invoice-area * { visibility: visible; }
                #admin-invoice-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; box-shadow: none !important; }
              }
            `}</style>
            
            <div id="admin-invoice-area" className="bg-white p-8 sm:p-16 w-full max-w-3xl border-2 border-black text-black font-sans relative max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-12">
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
                    <td className="py-8 font-black text-3xl text-red-600 text-right tracking-tighter">RM {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest print:hidden mt-8 mb-6">
                Generated by Residence Management System
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