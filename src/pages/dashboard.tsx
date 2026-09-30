import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  
  // --- Yearly Data States ---
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch all bills and expenses from the system
      const [billsResponse, expensesResponse] = await Promise.all([
        supabase.from('bills').select('*').limit(100000),
        supabase.from('expenses').select('*').limit(100000)
      ]);
      
      const bills = billsResponse.data || [];
      const expenses = expensesResponse.data || [];
      
      setAllBills(bills);
      setAllExpenses(expenses);

      // Extract unique years from the data
      const yearsSet = new Set<number>();
      yearsSet.add(new Date().getFullYear());

      bills.forEach(bill => {
        if (bill.issued_at) yearsSet.add(new Date(bill.issued_at).getFullYear());
        if (bill.paid_at) yearsSet.add(new Date(bill.paid_at).getFullYear());
      });

      expenses.forEach(expense => {
        if (expense.date_incurred) yearsSet.add(new Date(expense.date_incurred).getFullYear());
      });

      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));

      // Fetch Inbox & Billing Previews
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

  // --- DYNAMIC YEARLY METRICS (Top 4 Cards) ---
  const yearMetrics = useMemo(() => {
    let billed = 0;
    let outstanding = 0;
    let collected = 0;
    let moneyOut = 0;

    allBills.forEach(b => {
      const issuedYear = b.issued_at ? new Date(b.issued_at).getFullYear() : 0;
      const paidYear = b.paid_at ? new Date(b.paid_at).getFullYear() : 0;

      // Billed and Outstanding are based on when the invoice was issued
      if (issuedYear === selectedYear) {
        billed += parseFloat(b.amount);
        if (b.status === 'Pending') outstanding += parseFloat(b.amount);
      }
      
      // Collection is based on when the money actually arrived
      if (b.status === 'Paid' && paidYear === selectedYear) {
        collected += parseFloat(b.amount);
      }
    });

    // Money out is based on the expense date
    allExpenses.forEach(e => {
      const expYear = e.date_incurred ? new Date(e.date_incurred).getFullYear() : 0;
      if (expYear === selectedYear) {
        moneyOut += parseFloat(e.amount);
      }
    });

    return { billed, outstanding, collected, moneyOut };
  }, [allBills, allExpenses, selectedYear]);

  // --- DYNAMIC 12-MONTH CHART CALCULATOR ---
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats = months.map(m => ({ label: m, in: 0, out: 0 }));
    
    // Map Money In
    allBills.forEach(b => {
      if (b.status === 'Paid' && b.paid_at) {
         const d = new Date(b.paid_at);
         if (d.getFullYear() === selectedYear) {
           stats[d.getMonth()].in += parseFloat(b.amount);
         }
      }
    });

    // Map Money Out
    allExpenses.forEach(e => {
      if (e.date_incurred) {
        const d = new Date(e.date_incurred);
        if (d.getFullYear() === selectedYear) {
          stats[d.getMonth()].out += parseFloat(e.amount);
        }
      }
    });

    return stats;
  }, [allBills, allExpenses, selectedYear]);

  // Find the highest bar to scale the CSS dynamically
  const chartMax = useMemo(() => Math.max(...chartData.map(d => Math.max(d.in, d.out)), 100), [chartData]);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-slate-100 font-bold text-slate-500">Syncing Command Center...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12 overflow-x-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-300/30 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        {/* HEADER WITH GLOBAL YEAR FILTER */}
        <div className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">System Overview</h1>
            <p className="text-slate-600 font-medium text-lg">Financial snapshot for the year <span className="font-bold text-slate-900">{selectedYear}</span>.</p>
          </div>
          
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-xl border-2 border-slate-300 focus:border-slate-900 focus:ring-0 outline-none font-extrabold text-slate-900 shadow-sm transition-all text-lg cursor-pointer"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year} Financial Year</option>
            ))}
          </select>
        </div>

        {/* YEARLY METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center transition-all hover:bg-white/80">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Total Billed</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {yearMetrics.billed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:bg-white/80">
            <div className="text-4xl mb-3">📉</div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total Outstanding</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {yearMetrics.outstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center transition-all hover:bg-white/80">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Collection</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {yearMetrics.collected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col justify-center transition-all hover:bg-white/80">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Total Money Out</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RM {yearMetrics.moneyOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
        </div>

        {/* YEARLY CASH FLOW GRAPH SECTION */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-lg p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Annual Financial Comparison</h3>
              <p className="text-slate-500 text-sm font-medium">Collections (In) vs Expenses (Out) by month for {selectedYear}.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm"></div>
                <span className="text-xs font-bold text-slate-600">Money In</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm"></div>
                <span className="text-xs font-bold text-slate-600">Money Out</span>
              </div>
            </div>
          </div>
          
          {/* Dynamic CSS Bar Chart (12 Months, Dual Bars) */}
          <div className="flex justify-between h-[300px] border-b-2 border-slate-200 pb-2 relative mt-4">
            {chartData.map((data, idx) => {
              const inHeight = (data.in / chartMax) * 100;
              const outHeight = (data.out / chartMax) * 100;
              
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group h-full">
                  <div className="w-full flex-1 flex justify-center items-end gap-1 sm:gap-2 mb-2 relative">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      <span className="text-emerald-400 font-bold">In: RM {data.in.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span><br/>
                      <span className="text-rose-400 font-bold">Out: RM {data.out.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>

                    {/* Money IN Bar */}
                    <div 
                      className="w-2.5 sm:w-5 md:w-8 bg-emerald-400 rounded-t-lg shadow-sm transition-all duration-700 hover:bg-emerald-300" 
                      style={{ height: `${Math.max(inHeight, 1)}%` }}
                    ></div>

                    {/* Money OUT Bar */}
                    <div 
                      className="w-2.5 sm:w-5 md:w-8 bg-rose-400 rounded-t-lg shadow-sm transition-all duration-700 hover:bg-rose-300" 
                      style={{ height: `${Math.max(outHeight, 1)}%` }}
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