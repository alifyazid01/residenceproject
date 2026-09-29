import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  
  // Cascading Dropdown States
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  
  const [userStats, setUserStats] = useState({ outstandingAmount: 0, pendingCount: 0 });

  const ADMIN_WHATSAPP = "60179812006"; 

  // 1. Fetch all residents to populate the dropdowns
  useEffect(() => {
    const fetchResidents = async () => {
      const { data } = await supabase.from('residents').select('*');
      if (data) {
        setResidents(data);
      }
      setLoading(false);
    };
    fetchResidents();
  }, []);

  // 2. Dynamic Dropdown Logic WITH Custom Sorting
  const availableBlocks = Array.from(new Set(residents.map(r => r.unit_number?.split('-')[0]).filter(Boolean)))
    .sort((a, b) => {
      const numA = parseInt(a.replace('B', ''), 10);
      const numB = parseInt(b.replace('B', ''), 10);
      return numA - numB;
    });
  
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

  // 3. When a fully specific unit is selected, fetch their pending bills
  useEffect(() => {
    if (!selectedUnit) {
      setUserStats({ outstandingAmount: 0, pendingCount: 0 });
      return;
    }

    const fetchUnitBills = async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('amount')
        .eq('unit_number', selectedUnit)
        .eq('status', 'Pending');
        
      if (!error && data) {
        const total = data.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
        setUserStats({ outstandingAmount: total, pendingCount: data.length });
      }
    };
    
    fetchUnitBills();
  }, [selectedUnit]);

  const handleWhatsAppPayment = () => {
    const text = `Hello Management, I would like to make an online transfer for Unit ${selectedUnit}.%0A%0A*Total Amount Due:* RM ${userStats.outstandingAmount.toFixed(2)}%0A%0APlease provide the bank details.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading portal...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-20 pt-12 px-4">
      <div className="max-w-3xl mx-auto text-center relative z-10">
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Check Outstanding Balance
        </h1>
        <p className="text-slate-600 font-medium mb-12 text-lg">
          Select your unit number below to securely view your pending maintenance fees.
        </p>

        {/* The Cascading Unit Dropdowns */}
        <div className="mb-10 max-w-2xl mx-auto">
          <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Select Your Unit</label>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            
            {/* Block Selection */}
            <select 
              value={selectedBlock}
              onChange={(e) => { setSelectedBlock(e.target.value); setSelectedFloor(''); setSelectedUnit(''); }}
              className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 font-bold text-lg text-center cursor-pointer shadow-sm transition-all"
            >
              <option value="">-- Block --</option>
              {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {/* Floor Selection */}
            <select 
              value={selectedFloor}
              onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit(''); }}
              disabled={!selectedBlock}
              className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 font-bold text-lg text-center cursor-pointer shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Floor --</option>
              {availableFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
            </select>

            {/* Unit Selection */}
            <select 
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={!selectedFloor}
              className="w-full sm:w-1/3 p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 font-bold text-lg text-center cursor-pointer shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Unit --</option>
              {availableUnits.map(u => (
                <option key={u.id} value={u.unit_number}>{u.unit_number.split('-')[2]}</option>
              ))}
            </select>

          </div>
        </div>

        {/* Dynamic Outstanding Display */}
        {selectedUnit && (
          <div className="bg-white/60 backdrop-blur-2xl p-10 rounded-[2rem] border border-white shadow-xl transform transition-all animate-fade-in">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Total Outstanding for Unit {selectedUnit}
            </span>
            <div className="text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
              RM {userStats.outstandingAmount.toFixed(2)}
            </div>
            
            {userStats.pendingCount > 0 ? (
              <>
                <p className="text-rose-600 font-bold mb-8">
                  You have {userStats.pendingCount} unpaid bill{userStats.pendingCount > 1 ? 's' : ''}.
                </p>
                <button 
                  onClick={handleWhatsAppPayment}
                  className="w-full max-w-sm mx-auto bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>💬</span> Pay via Online Transfer
                </button>
              </>
            ) : (
              <p className="text-emerald-600 font-bold text-lg">All caught up! No pending balances.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}