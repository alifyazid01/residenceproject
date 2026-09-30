import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

export default function Audit() {
  const [loading, setLoading] = useState(true);
  
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
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

      // Extract unique years
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
    } catch (error) {
      console.error("Error fetching audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CALCULATE PROFESSIONAL SUMMARY ---
  const auditReport = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 1. Setup Monthly Buckets
    const monthlyData = months.map(month => ({ month, collections: 0, expenses: 0, net: 0 }));
    
    // 2. Setup Annual Totals
    let annualBilled = 0;
    let annualOutstanding = 0;
    let annualCollected = 0;
    let annualExpenses = 0;

    // Process Bills
    allBills.forEach(b => {
      const issuedYear = b.issued_at ? new Date(b.issued_at).getFullYear() : 0;
      const paidDate = b.paid_at ? new Date(b.paid_at) : null;
      const paidYear = paidDate ? paidDate.getFullYear() : 0;
      const amount = parseFloat(b.amount);

      if (issuedYear === selectedYear) {
        annualBilled += amount;
        if (b.status === 'Pending') annualOutstanding += amount;
      }
      
      if (b.status === 'Paid' && paidYear === selectedYear && paidDate) {
        annualCollected += amount;
        monthlyData[paidDate.getMonth()].collections += amount;
      }
    });

    // Process Expenses
    allExpenses.forEach(e => {
      const expDate = e.date_incurred ? new Date(e.date_incurred) : null;
      if (expDate && expDate.getFullYear() === selectedYear) {
        const amount = parseFloat(e.amount);
        annualExpenses += amount;
        monthlyData[expDate.getMonth()].expenses += amount;
      }
    });

    // Calculate Net Flow per month
    monthlyData.forEach(m => {
      m.net = m.collections - m.expenses;
    });

    const annualNetFlow = annualCollected - annualExpenses;

    return { 
      annualBilled, 
      annualOutstanding, 
      annualCollected, 
      annualExpenses, 
      annualNetFlow, 
      monthlyData 
    };
  }, [allBills, allExpenses, selectedYear]);

  // --- EXPORT TO CSV LOGIC ---
  const handleExportCSV = () => {
    // Build a professional CSV layout
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Report Header
    csvContent += "RESIDENCE FINANCIAL AUDIT SUMMARY\r\n";
    csvContent += `Generated On:,${new Date().toLocaleDateString()}\r\n`;
    csvContent += `Financial Year:,${selectedYear}\r\n\r\n`;
    
    // Annual Overview Section
    csvContent += "--- ANNUAL OVERVIEW ---\r\n";
    csvContent += "Total Invoiced (RM),Total Collected (RM),Total Outstanding (RM),Total Expenses (RM),Net Cash Flow (RM)\r\n";
    csvContent += `${auditReport.annualBilled.toFixed(2)},${auditReport.annualCollected.toFixed(2)},${auditReport.annualOutstanding.toFixed(2)},${auditReport.annualExpenses.toFixed(2)},${auditReport.annualNetFlow.toFixed(2)}\r\n\r\n`;

    // Monthly Breakdown Section
    csvContent += "--- MONTHLY CASH FLOW BREAKDOWN ---\r\n";
    csvContent += "Month,Collections (RM),Expenses (RM),Net Flow (RM)\r\n";
    
    auditReport.monthlyData.forEach(row => {
      csvContent += `${row.month},${row.collections.toFixed(2)},${row.expenses.toFixed(2)},${row.net.toFixed(2)}\r\n`;
    });

    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Compiling financial data...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans pb-12 pt-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Audit & Export</h1>
            <p className="text-slate-600 font-medium mt-2">Generate professional, high-level financial summaries.</p>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-6 py-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700 shadow-sm transition-all flex-1"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button 
              onClick={handleExportCSV}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              📥 Download Report
            </button>
          </div>
        </div>

        {/* --- ON-SCREEN PREVIEW --- */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white shadow-lg overflow-hidden">
          
          {/* Top Overview Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-white/40 border-b border-white/50">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Invoiced</p>
              <p className="text-lg font-extrabold text-slate-900">RM {auditReport.annualBilled.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Collected</p>
              <p className="text-lg font-extrabold text-slate-900">RM {auditReport.annualCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Outstanding</p>
              <p className="text-lg font-extrabold text-slate-900">RM {auditReport.annualOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Expenses</p>
              <p className="text-lg font-extrabold text-slate-900">RM {auditReport.annualExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0 md:pl-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Cash Flow</p>
              <p className={`text-xl font-extrabold ${auditReport.annualNetFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {auditReport.annualNetFlow >= 0 ? '+' : ''}RM {auditReport.annualNetFlow.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Monthly Breakdown Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-bold">Month</th>
                    <th className="pb-3 font-bold text-right">Collections (In)</th>
                    <th className="pb-3 font-bold text-right">Expenses (Out)</th>
                    <th className="pb-3 font-bold text-right">Net Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {auditReport.monthlyData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-white/30 transition-colors">
                      <td className="py-3 font-bold text-slate-900">{row.month}</td>
                      <td className="py-3 text-right font-medium text-slate-700">RM {row.collections.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-3 text-right font-medium text-slate-700">RM {row.expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className={`py-3 text-right font-bold ${row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.net >= 0 ? '+' : ''}RM {row.net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}