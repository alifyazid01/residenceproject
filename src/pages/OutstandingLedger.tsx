import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function OutstandingLedger() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);

  // --- FILTER STATES ---
  const [issueTargetType, setIssueTargetType] = useState<'UNIT' | 'FLOOR' | 'BLOCK' | 'ALL'>('ALL');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

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

  // --- FILTER BILLS BASED ON DROPDOWN SELECTION ---
  const filteredBills = bills.filter(bill => {
    if (issueTargetType === 'ALL') return true;
    if (issueTargetType === 'BLOCK' && selectedBlock) return bill.unit_number?.startsWith(`${selectedBlock}-`);
    if (issueTargetType === 'FLOOR' && selectedBlock && selectedFloor) return bill.unit_number?.startsWith(`${selectedBlock}-${selectedFloor}-`);
    if (issueTargetType === 'UNIT' && selectedUnit) return bill.unit_number === selectedUnit;
    return false;
  });

  // --- CALCULATE TOTALS & EARLIEST DATE ---
  const totalOutstanding = filteredBills
    .filter(b => b.status === 'Pending')
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalCollection = filteredBills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalAmount = totalOutstanding + totalCollection;
  const outstandingPercent = totalAmount === 0 ? 0 : (totalOutstanding / totalAmount) * 100;
  const collectionPercent = totalAmount === 0 ? 0 : (totalCollection / totalAmount) * 100;

  // Dynamically find the oldest bill date in the current filtered view
  const oldestDate = filteredBills.length > 0
    ? new Date(Math.min(...filteredBills.map(b => new Date(b.issued_at).getTime())))
        .toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : "System Start";

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
              <select 
                value={issueTargetType} 
                onChange={(e) => {
                  setIssueTargetType(e.target.value as any);
                  setSelectedBlock(''); setSelectedFloor(''); setSelectedUnit('');
                }} 
                className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold shadow-sm"
              >
                <option value="ALL">Entire Residence (All)</option>
                <option value="BLOCK">By Block</option>
                <option value="FLOOR">By Floor</option>
                <option value="UNIT">Specific Unit</option>
              </select>
            </div>

            {issueTargetType !== 'ALL' && (
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1">
                  <select 
                    value={selectedBlock} 
                    onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }}
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm"
                  >
                    <option value="">-- Select Block --</option>
                    {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {['FLOOR', 'UNIT'].includes(issueTargetType) && (
                  <div className="flex-1">
                    <select 
                      value={selectedFloor} 
                      onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }}
                      disabled={!selectedBlock}
                      className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm disabled:opacity-50"
                    >
                      <option value="">-- Select Floor --</option>
                      {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                    </select>
                  </div>
                )}

                {issueTargetType === 'UNIT' && (
                  <div className="flex-1">
                    <select 
                      value={selectedUnit} 
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      disabled={!selectedFloor}
                      className="w-full p-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm disabled:opacity-50"
                    >
                      <option value="">-- Select Unit --</option>
                      {availableUnits.map(u => (
                        <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]} ({u.name})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- DASHBOARD METRICS & PIE CHART --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side: Summary Cards */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
              <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-2">Total Outstanding</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">RM {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              <p className="text-slate-500 font-medium mt-2">Unpaid fees based on current filter.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
              <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2">Total Collection</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">RM {totalCollection.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              <p className="text-slate-500 font-medium mt-2">Successfully collected payments.</p>
            </div>
          </div>

          {/* Right Side: CSS Pie Chart */}
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl border border-white shadow-xl flex flex-col items-center justify-center">
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-slate-900">Financial Distribution</h3>
              <p className="text-sm font-medium text-slate-500 mt-1 bg-slate-100 inline-block px-3 py-1 rounded-full border border-slate-200">
                Calculated since <span className="font-bold text-slate-700">{oldestDate}</span>
              </p>
            </div>
            
            <div className="relative">
              {/* Dynamic Conic Gradient Pie Chart */}
              <div 
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-full shadow-inner border-8 border-white transform transition-transform hover:scale-105 duration-300"
                style={{
                  background: totalAmount > 0 
                    ? `conic-gradient(#f43f5e 0% ${outstandingPercent}%, #10b981 ${outstandingPercent}% 100%)` 
                    : '#e2e8f0'
                }}
              ></div>
              
              {totalAmount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-400">
                  No Data
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-8 mt-10 w-full justify-center">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow-sm"></div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding</div>
                  <div className="font-bold text-slate-900">{outstandingPercent.toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm"></div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected</div>
                  <div className="font-bold text-slate-900">{collectionPercent.toFixed(1)}%</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}