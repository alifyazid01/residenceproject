import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  
  const [userStats, setUserStats] = useState({ outstandingAmount: 0, pendingCount: 0 });

  const ADMIN_WHATSAPP = "60179812006"; 

  // 1. Fetch the list of all units to populate the dropdown
  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('residents').select('unit_number').order('unit_number', { ascending: true });
      if (data) {
        const uniqueUnits = Array.from(new Set(data.map(r => r.unit_number))).filter(Boolean);
        setAvailableUnits(uniqueUnits as string[]);
      }
      setLoading(false);
    };
    fetchUnits();
  }, []);

  // 2. When a user selects a unit, fetch their pending bills
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

        {/* The Unit Dropdown List */}
        <div className="mb-10 max-w-sm mx-auto">
          <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Select Your Unit</label>
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 font-bold text-xl text-center cursor-pointer shadow-sm transition-all"
          >
            <option value="">-- Choose Unit --</option>
            {availableUnits.map(unit => (
              <option key={unit} value={unit}>Unit {unit}</option>
            ))}
          </select>
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