import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

type SortKey = 'unit_number' | 'resident_name' | 'issued_at' | 'amount' | 'overdue_days';
type SortDirection = 'asc' | 'desc';

export default function OutstandingLedger() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
    key: 'issued_at', 
    direction: 'asc' 
  });

  useEffect(() => {
    fetchOutstandingBills();
  }, []);

  const fetchOutstandingBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('status', 'Pending');

      if (error) throw error;
      
      if (data) {
        // Calculate overdue days for each bill upfront
        const processedBills = data.map(bill => ({
          ...bill,
          amount: parseFloat(bill.amount),
          overdue_days: Math.floor((new Date().getTime() - new Date(bill.issued_at).getTime()) / (1000 * 3600 * 24))
        }));
        setBills(processedBills);
      }
    } catch (error: any) {
      alert("Error fetching outstanding ledger: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sorting Logic
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBills = useMemo(() => {
    let sortableBills = [...bills];
    sortableBills.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableBills;
  }, [bills, sortConfig]);

  // Aging Bucket Calculations
  const agingStats = useMemo(() => {
    const stats = { current: 0, thirtyToSixty: 0, sixtyToNinety: 0, ninetyPlus: 0 };
    bills.forEach(bill => {
      if (bill.overdue_days <= 30) stats.current += bill.amount;
      else if (bill.overdue_days <= 60) stats.thirtyToSixty += bill.amount;
      else if (bill.overdue_days <= 90) stats.sixtyToNinety += bill.amount;
      else stats.ninetyPlus += bill.amount;
    });
    return stats;
  }, [bills]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading Outstanding Ledger...</div>
      </div>
    );
  }

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className="opacity-30">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="text-slate-900">↑</span> : <span className="text-slate-900">↓</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            Outstanding Ledger
          </h1>
          <p className="text-slate-600 font-medium">Track pending receivables and identify severely delinquent accounts.</p>
        </div>

        {/* AGING SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/40 backdrop-blur-2xl p-5 rounded-2xl border border-white/60 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">0 - 30 Days</span>
            <span className="text-2xl font-extrabold text-slate-900">RM {agingStats.current.toFixed(2)}</span>
          </div>
          <div className="bg-amber-500/10 backdrop-blur-2xl p-5 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">31 - 60 Days</span>
            <span className="text-2xl font-extrabold text-amber-900">RM {agingStats.thirtyToSixty.toFixed(2)}</span>
          </div>
          <div className="bg-orange-500/10 backdrop-blur-2xl p-5 rounded-2xl border border-orange-500/20 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">61 - 90 Days</span>
            <span className="text-2xl font-extrabold text-orange-900">RM {agingStats.sixtyToNinety.toFixed(2)}</span>
          </div>
          <div className="bg-rose-500/10 backdrop-blur-2xl p-5 rounded-2xl border border-rose-500/20 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">90+ Days Overdue</span>
            <span className="text-2xl font-extrabold text-rose-900">RM {agingStats.ninetyPlus.toFixed(2)}</span>
          </div>
        </div>

        {/* SORTABLE DATA TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white/30 border-b border-white/50 text-sm text-slate-700 select-none">
                  <th onClick={() => handleSort('issued_at')} className="p-5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-white/40 transition-colors">
                    Date Issued {getSortIcon('issued_at')}
                  </th>
                  <th onClick={() => handleSort('unit_number')} className="p-5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-white/40 transition-colors">
                    Resident {getSortIcon('unit_number')}
                  </th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Description</th>
                  <th onClick={() => handleSort('overdue_days')} className="p-5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-white/40 transition-colors text-center">
                    Aging {getSortIcon('overdue_days')}
                  </th>
                  <th onClick={() => handleSort('amount')} className="p-5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-white/40 transition-colors text-right">
                    Amount {getSortIcon('amount')}
                  </th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedBills.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">No outstanding bills found.</td></tr>
                ) : (
                  sortedBills.map((bill) => (
                    <tr key={bill.id} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                      <td className="p-5 text-slate-700 text-sm font-medium">
                        {new Date(bill.issued_at).toLocaleDateString()}
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-slate-900">Unit {bill.unit_number}</div>
                        <div className="text-xs text-slate-600">{bill.resident_name}</div>
                      </td>
                      <td className="p-5 font-bold text-slate-900">{bill.description}</td>
                      
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          bill.overdue_days > 90 ? 'bg-rose-500/20 text-rose-800 border-rose-500/30' :
                          bill.overdue_days > 60 ? 'bg-orange-500/20 text-orange-800 border-orange-500/30' :
                          bill.overdue_days > 30 ? 'bg-amber-500/20 text-amber-800 border-amber-500/30' :
                          'bg-slate-500/10 text-slate-700 border-slate-500/20'
                        }`}>
                          {bill.overdue_days} Days
                        </span>
                      </td>

                      <td className="p-5 font-extrabold text-slate-900 text-right">
                        RM {bill.amount.toFixed(2)}
                      </td>

                      <td className="p-5 text-center">
                        <button 
                          onClick={() => alert(`Email reminder would be sent to ${bill.resident_email} for RM ${bill.amount.toFixed(2)}`)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-sm"
                        >
                          Remind
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}