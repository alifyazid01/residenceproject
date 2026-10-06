import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  
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
      const [billsResponse, expensesResponse] = await Promise.all([
        supabase.from('bills').select('*').limit(100000),
        supabase.from('expenses').select('*').limit(100000)
      ]);
      
      const bills = billsResponse.data || [];
      const expenses = expensesResponse.data || [];
      
      setAllBills(bills);
      setAllExpenses(expenses);

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

  const yearMetrics = useMemo(() => {
    let billed = 0; let outstanding = 0; let collected = 0; let moneyOut = 0;
    allBills.forEach(b => {
      const issuedYear = b.issued_at ? new Date(b.issued_at).getFullYear() : 0;
      const paidYear = b.paid_at ? new Date(b.paid_at).getFullYear() : 0;
      if (issuedYear === selectedYear) {
        billed += parseFloat(b.amount);
        if (b.status === 'Pending') outstanding += parseFloat(b.amount);
      }
      if (b.status === 'Paid' && paidYear === selectedYear) {
        collected += parseFloat(b.amount);
      }
    });
    allExpenses.forEach(e => {
      const expYear = e.date_incurred ? new Date(e.date_incurred).getFullYear() : 0;
      if (expYear === selectedYear) moneyOut += parseFloat(e.amount);
    });
    return { billed, outstanding, collected, moneyOut };
  }, [allBills, allExpenses, selectedYear]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats = months.map(m => ({ label: m, in: 0, out: 0 }));
    allBills.forEach(b => {
      if (b.status === 'Paid' && b.paid_at) {
         const d = new Date(b.paid_at);
         if (d.getFullYear() === selectedYear) stats[d.getMonth()].in += parseFloat(b.amount);
      }
    });
    allExpenses.forEach(e => {
      if (e.date_incurred) {
        const d = new Date(e.date_incurred);
        if (d.getFullYear() === selectedYear) stats[d.getMonth()].out += parseFloat(e.amount);
      }
    });
    return stats;
  }, [allBills, allExpenses, selectedYear]);

  const chartMax = useMemo(() => Math.max(...chartData.map(d => Math.max(d.in, d.out)), 100), [chartData]);

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans relative pb-24 overflow-x-hidden">
      
      <div className="max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8">
        
        <div className="mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 border-b-2 border-black pb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tighter uppercase mb-2">Overview.</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Financial & Operations Snapshot // {selectedYear}</p>
          </div>
          
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-auto px-4 py-3 bg-transparent border-2 border-black rounded-none outline-none font-black text-black uppercase tracking-widest cursor-pointer hover:bg-black hover:text-white transition-colors"
          >
            {availableYears.map(year => (
              <option key={year} value={year} className="bg-white text-black">{year}</option>
            ))}
          </select>
        </div>

        {/* METRICS GRID - Flat, Sharp, High Contrast */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-white p-8 border border-neutral-200">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Total Billed</p>
            <h2 className="text-3xl font-black text-black tracking-tighter">RM {yearMetrics.billed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white p-8 border border-neutral-200 border-t-4 border-t-red-600">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Outstanding</p>
            <h2 className="text-3xl font-black text-red-600 tracking-tighter">RM {yearMetrics.outstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white p-8 border border-neutral-200">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Collected</p>
            <h2 className="text-3xl font-black text-black tracking-tighter">RM {yearMetrics.collected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-white p-8 border border-neutral-200">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Expenses</p>
            <h2 className="text-3xl font-black text-neutral-400 tracking-tighter">RM {yearMetrics.moneyOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          </div>
        </div>

        {/* YEARLY CASH FLOW GRAPH - Flat geometric bars */}
        <div className="bg-white border border-neutral-200 p-8 sm:p-12 mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
            <div>
              <h3 className="text-xl font-black text-black uppercase tracking-tight">Cash Flow</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-black"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">In</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Out</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between h-[300px] border-b-2 border-black pb-0 relative">
            {chartData.map((data, idx) => {
              const inHeight = (data.in / chartMax) * 100;
              const outHeight = (data.out / chartMax) * 100;
              
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group h-full">
                  <div className="w-full flex-1 flex justify-center items-end gap-1 mb-0 relative">
                    
                    <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] uppercase font-bold tracking-widest p-3 pointer-events-none z-10 whitespace-nowrap">
                      <span>IN: RM {data.in.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span><br/>
                      <span className="text-red-400">OUT: RM {data.out.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>

                    <div className="w-3 sm:w-6 bg-black transition-all duration-500" style={{ height: `${Math.max(inHeight, 1)}%` }}></div>
                    <div className="w-3 sm:w-6 bg-red-600 transition-all duration-500" style={{ height: `${Math.max(outHeight, 1)}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase mt-4 tracking-widest">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* INBOX & RECENT BILLS PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-neutral-200 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
              <h3 className="text-xl font-black text-black uppercase tracking-tight">Reports</h3>
              <Link to="/announcements" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black">View All</Link>
            </div>
            <div className="space-y-4 flex-1">
              {recentComplaints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-400 font-bold uppercase tracking-widest text-xs">No pending reports</div>
              ) : (
                recentComplaints.map(comp => (
                  <div key={comp.id} className="p-4 border border-neutral-200 hover:border-black transition-colors flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="inline-block bg-black text-white font-bold text-[9px] uppercase tracking-widest px-2 py-1">Unit {comp.unit_number}</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">{new Date(comp.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black text-black uppercase">{comp.subject}</h4>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
              <h3 className="text-xl font-black text-black uppercase tracking-tight">Activity</h3>
              <Link to="/bills" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black">All Bills</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] text-neutral-400 uppercase tracking-widest">
                    <th className="pb-3 font-bold">Target</th>
                    <th className="pb-3 font-bold">Amount</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.length === 0 ? (
                    <tr><td colSpan={3} className="py-8 text-center text-neutral-400 font-bold text-xs uppercase tracking-widest">No activity</td></tr>
                  ) : (
                    recentBills.map(bill => (
                      <tr key={bill.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="py-4">
                          <div className="font-black text-black uppercase text-sm">Unit {bill.unit_number}</div>
                        </td>
                        <td className="py-4 font-black text-black tracking-tight text-sm">RM {parseFloat(bill.amount).toFixed(2)}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest border ${bill.status === 'Paid' ? 'border-black text-black' : 'border-red-600 text-red-600'}`}>{bill.status}</span>
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