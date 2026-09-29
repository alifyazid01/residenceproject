import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalUnits: 0,
    outstandingAmount: 0,
    collectedAmount: 0,
    pendingComplaints: 0
  });

  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  
  // --- NEW: Yearly Chart States ---
  const [allBills, setAllBills] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const { count: residentCount } = await supabase.from('residents').select('*', { count: 'exact', head: true });
      const { count: complaintsCount } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Pending');

      // Fetch all bills from the system
      const { data: billsData } = await supabase.from('bills').select('*').limit(10000);
      
      const bills = billsData || [];
      setAllBills(bills);

      let outstanding = 0;
      let collected = 0;
      const yearsSet = new Set<number>();
      yearsSet.add(new Date().getFullYear()); // Always ensure current year is an option

      bills.forEach(bill => {
        if (bill.status === 'Pending') outstanding += parseFloat(bill.amount);
        if (bill.status === 'Paid') {
          collected += parseFloat(bill.amount);
          if (bill.paid_at) {
            yearsSet.add(new Date(bill.paid_at).getFullYear());
          }
        }
      });

      // Sort available years (newest to oldest)
      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));

      setMetrics({
        totalUnits: residentCount || 0,
        outstandingAmount: outstanding,
        collectedAmount: collected,
        pendingComplaints: complaintsCount || 0
      });

      // Fetch Previews
      const { data: complaintsData } = await supabase.from('complaints').select('*').eq('status', 'Pending').order('created_at', { ascending: false }).limit(3);
      if (complaintsData) setRecentComplaints(complaintsData);

      const { data: recentBillsData } = await supabase.from('bills').select('*').order('issued_at', { ascending: false }).limit(4);
      if (recentBillsData) setRecentBills(recentBillsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC 12-MONTH CHART CALCULATOR ---
  // This automatically recalculates when you change the year in the dropdown
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats = months.map(m => ({ label: m, in: 0 }));
    
    allBills.forEach(b => {
      if (b.status === 'Paid' && b.paid_at) {
         const d = new Date(b.paid_at);
         if (d.getFullYear() === selectedYear) {
           stats[d.getMonth()].in += parseFloat(b.amount);
         }
      }
    });
    return stats;
  }, [allBills, selectedYear]);

  // Find the highest bar to scale the CSS dynamically
  const chartMax = useMemo(() => Math.max(...chartData.map(d => d.in), 100), [chartData]);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-slate-100 font-bold text-slate-500">Syncing Command Center...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12 overflow-x-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-300/30 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">System Overview</h1>
          <p className="text-slate-600 font-medium text-lg">Live status of the residence operations and cash flow.</p>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center">
            <div className="text-4xl mb-3">🏘️</div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Registered Units</p>
            <h2 className="text-3xl font-extrabold text-slate-900">{metrics.totalUnits}</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Unresolved Reports</p>
            <h2 className="text-3xl font-extrabold text-slate-900">{metrics.pendingComplaints} Tickets</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center">
            <div className="text-4xl mb-3">📉</div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total Outstanding</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {metrics.outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Collection</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {metrics.collectedAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
        </div>

        {/* YEARLY CASH FLOW GRAPH SECTION */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-lg p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Monthly Collections</h3>
              <p className="text-slate-500 text-sm font-medium">Compare "Money In" performance by month.</p>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm"></div>
                <span className="text-xs font-bold text-slate-600 hidden sm:block">Money In</span>
              </div>
              
              {/* Year Filter Dropdown */}
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700 shadow-sm transition-all"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Dynamic CSS Bar Chart (12 Months) */}
          <div className="flex justify-between h-[300px] border-b-2 border-slate-200 pb-2 relative mt-4">
            {chartData.map((data, idx) => {
              const inHeight = (data.in / chartMax) * 100;
              
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group h-full">
                  <div className="w-full flex-1 flex justify-center items-end mb-2 relative">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      <span className="text-emerald-400 font-bold">RM {data.in.toFixed(2)}</span>
                    </div>

                    {/* Money IN Bar */}
                    <div 
                      className="w-4 sm:w-10 md:w-12 bg-emerald-400 rounded-t-lg shadow-sm transition-all duration-700 hover:bg-emerald-300" 
                      style={{ height: `${Math.max(inHeight, 1)}%` }}
                    ></div>

                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* INBOX & RECENT BILLS PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Action Required (Reports)</h3>
              <Link to="/announcements" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">View Inbox →</Link>
            </div>
            <div className="space-y-4 flex-1">
              {recentComplaints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-medium italic">Inbox is empty. No pending reports!</div>
              ) : (
                recentComplaints.map(comp => (
                  <div key={comp.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold text-[10px] uppercase tracking-wider rounded-full">Unit {comp.unit_number}</span>
                      <span className="text-xs text-slate-400 font-medium">{new Date(comp.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-900">{comp.subject}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{comp.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Recent Billing Activity</h3>
              <Link to="/bills" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Go to Billing →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-bold">Unit / Resident</th>
                    <th className="pb-3 font-bold">Amount</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.length === 0 ? (
                    <tr><td colSpan={3} className="py-8 text-center text-slate-500 italic">No recent bills found.</td></tr>
                  ) : (
                    recentBills.map(bill => (
                      <tr key={bill.id} className="border-b border-white/30 last:border-0 hover:bg-white/30 transition-colors">
                        <td className="py-4">
                          <div className="font-bold text-slate-900">Unit {bill.unit_number}</div>
                          <div className="text-xs text-slate-500">{bill.resident_name}</div>
                        </td>
                        <td className="py-4 font-extrabold text-slate-900">RM {parseFloat(bill.amount).toFixed(2)}</td>
                        <td className="py-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${bill.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-800' : 'bg-amber-500/20 text-amber-800'}`}>{bill.status}</span>
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
    </div>
  );
}