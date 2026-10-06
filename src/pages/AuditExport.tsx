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

  const auditReport = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map(month => ({ month, collections: 0, expenses: 0, net: 0 }));
    
    let annualBilled = 0; let annualOutstanding = 0; let annualCollected = 0; let annualExpenses = 0;

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

    allExpenses.forEach(e => {
      const expDate = e.date_incurred ? new Date(e.date_incurred) : null;
      if (expDate && expDate.getFullYear() === selectedYear) {
        const amount = parseFloat(e.amount);
        annualExpenses += amount;
        monthlyData[expDate.getMonth()].expenses += amount;
      }
    });

    monthlyData.forEach(m => { m.net = m.collections - m.expenses; });
    const annualNetFlow = annualCollected - annualExpenses;

    return { annualBilled, annualOutstanding, annualCollected, annualExpenses, annualNetFlow, monthlyData };
  }, [allBills, allExpenses, selectedYear]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "RESIDENCE FINANCIAL AUDIT SUMMARY\r\n";
    csvContent += `Generated On:,${new Date().toLocaleDateString()}\r\n`;
    csvContent += `Financial Year:,${selectedYear}\r\n\r\n`;
    csvContent += "--- ANNUAL OVERVIEW ---\r\n";
    csvContent += "Total Invoiced (RM),Total Collected (RM),Total Outstanding (RM),Total Expenses (RM),Net Cash Flow (RM)\r\n";
    csvContent += `${auditReport.annualBilled.toFixed(2)},${auditReport.annualCollected.toFixed(2)},${auditReport.annualOutstanding.toFixed(2)},${auditReport.annualExpenses.toFixed(2)},${auditReport.annualNetFlow.toFixed(2)}\r\n\r\n`;
    csvContent += "--- MONTHLY CASH FLOW BREAKDOWN ---\r\n";
    csvContent += "Month,Collections (RM),Expenses (RM),Net Flow (RM)\r\n";
    
    auditReport.monthlyData.forEach(row => {
      csvContent += `${row.month},${row.collections.toFixed(2)},${row.expenses.toFixed(2)},${row.net.toFixed(2)}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Compiling Data...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b-2 border-black pb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-black uppercase tracking-tighter mb-2">Audit.</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Financial Summary & Export</p>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-6 py-4 bg-transparent border-2 border-black outline-none text-black font-bold uppercase tracking-widest text-xs transition-colors rounded-none flex-1 cursor-pointer"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button 
              onClick={handleExportCSV}
              className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* --- ON-SCREEN PREVIEW --- */}
        <div className="bg-white border border-neutral-200 overflow-hidden mb-12">
          
          {/* Top Overview Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-b-2 border-black">
            <div className="p-6 border-r border-b md:border-b-0 border-neutral-200">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Invoiced</p>
              <p className="text-xl font-black text-black tracking-tighter">RM {auditReport.annualBilled.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 border-r border-b md:border-b-0 border-neutral-200">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Collected</p>
              <p className="text-xl font-black text-black tracking-tighter">RM {auditReport.annualCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 border-r border-b md:border-b-0 border-neutral-200">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Outstanding</p>
              <p className="text-xl font-black text-red-600 tracking-tighter">RM {auditReport.annualOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 border-r md:border-b-0 border-neutral-200">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Expenses</p>
              <p className="text-xl font-black text-black tracking-tighter">RM {auditReport.annualExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="col-span-2 md:col-span-1 p-6 bg-neutral-50">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Net Cash Flow</p>
              <p className={`text-2xl font-black tracking-tighter ${auditReport.annualNetFlow >= 0 ? 'text-black' : 'text-red-600'}`}>
                {auditReport.annualNetFlow >= 0 ? '+' : ''}RM {auditReport.annualNetFlow.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] text-neutral-500 uppercase tracking-widest">
                    <th className="pb-4 font-bold w-1/4">Month</th>
                    <th className="pb-4 font-bold text-right w-1/4">Collections</th>
                    <th className="pb-4 font-bold text-right w-1/4">Expenses</th>
                    <th className="pb-4 font-bold text-right w-1/4">Net Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {auditReport.monthlyData.map((row, idx) => (
                    <tr key={idx} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                      <td className="py-4 font-black text-black uppercase text-sm">{row.month}</td>
                      <td className="py-4 text-right font-bold text-black text-sm">RM {row.collections.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-4 text-right font-bold text-black text-sm">RM {row.expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className={`py-4 text-right font-black text-sm ${row.net >= 0 ? 'text-black' : 'text-red-600'}`}>
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
  );
}