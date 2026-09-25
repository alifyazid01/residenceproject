import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

export default function AuditExport() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Generate an array of years for the dropdown (e.g., last 5 years)
  const availableYears = Array.from(new Array(5), (val, index) => new Date().getFullYear() - index);

  useEffect(() => {
    fetchAuditData();
  }, [selectedYear]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Define the date range for the selected fiscal year
      const startDate = new Date(`${selectedYear}-01-01T00:00:00.000Z`).toISOString();
      const endDate = new Date(`${selectedYear}-12-31T23:59:59.999Z`).toISOString();

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .gte('issued_at', startDate)
        .lte('issued_at', endDate)
        .order('issued_at', { ascending: true });

      if (error) throw error;
      if (data) setBills(data);
    } catch (error: any) {
      alert("Error fetching audit data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const auditSummary = useMemo(() => {
    let totalDebit = 0; // Total amount invoiced
    let totalCredit = 0; // Total amount actually paid
    
    bills.forEach(bill => {
      const amount = parseFloat(bill.amount);
      totalDebit += amount;
      if (bill.status === 'Paid') {
        totalCredit += amount;
      }
    });

    return { totalDebit, totalCredit, pendingCount: bills.filter(b => b.status === 'Pending').length };
  }, [bills]);

  const handleExportCSV = () => {
    if (bills.length === 0) {
      alert("No data available to export for this year.");
      return;
    }

    const headers = ['Date Issued', 'Invoice ID', 'Unit', 'Resident', 'Description', 'Status', 'Date Paid', 'Debit (RM)', 'Credit (RM)'];
    
    const rows = bills.map(bill => {
      const isPaid = bill.status === 'Paid';
      const debit = parseFloat(bill.amount).toFixed(2);
      const credit = isPaid ? parseFloat(bill.amount).toFixed(2) : '0.00';
      const datePaid = bill.paid_at ? new Date(bill.paid_at).toLocaleDateString() : 'N/A';
      
      // Escape commas in descriptions/names to prevent CSV column breaking
      const safeDescription = `"${bill.description.replace(/"/g, '""')}"`;
      const safeName = `"${bill.resident_name.replace(/"/g, '""')}"`;

      return [
        new Date(bill.issued_at).toLocaleDateString(),
        `INV-${bill.id.toString().padStart(4, '0')}`,
        bill.unit_number,
        safeName,
        safeDescription,
        bill.status,
        datePaid,
        debit,
        credit
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create a Blob and trigger the browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Audit_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
              Audit & Export
            </h1>
            <p className="text-slate-600 font-medium">Generate compliant general ledger templates for year-end accounting.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Fiscal Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 font-bold shadow-sm transition-all"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Debit (Billed)</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">RM {auditSummary.totalDebit.toFixed(2)}</span>
            <span className="text-sm font-medium text-slate-500 mt-2">Total gross revenue expected</span>
          </div>
          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Credit (Received)</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">RM {auditSummary.totalCredit.toFixed(2)}</span>
            <span className="text-sm font-medium text-emerald-700 mt-2">Actual cash collected</span>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] flex flex-col justify-center items-center text-center transform hover:scale-105 transition-all">
            <h3 className="text-white font-bold mb-3">Auditor Ready</h3>
            <button 
              onClick={handleExportCSV}
              className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors w-full shadow-sm flex items-center justify-center gap-2"
            >
              <span>📊</span> Download CSV
            </button>
          </div>
        </div>

        {/* DATA PREVIEW TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-5 border-b border-white/50 bg-white/30 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">General Ledger Preview ({selectedYear})</h3>
            <span className="text-xs font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-white/60">
              {bills.length} Records
            </span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading ledger data...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 shadow-sm">
                  <tr className="text-sm text-slate-700">
                    <th className="p-4 font-bold uppercase tracking-wider text-xs">Date</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs">Invoice ID</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs">Description</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs">Unit</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs text-right">Debit (RM)</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs text-right">Credit (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">No records found for {selectedYear}.</td></tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                        <td className="p-4 text-slate-700 text-sm font-medium">{new Date(bill.issued_at).toLocaleDateString()}</td>
                        <td className="p-4 font-medium text-slate-500">INV-{bill.id.toString().padStart(4, '0')}</td>
                        <td className="p-4 font-bold text-slate-900">{bill.description}</td>
                        <td className="p-4 text-sm font-bold text-slate-700">{bill.unit_number}</td>
                        
                        {/* Debit Column (Amount Billed) */}
                        <td className="p-4 font-extrabold text-slate-900 text-right">
                          {parseFloat(bill.amount).toFixed(2)}
                        </td>
                        
                        {/* Credit Column (Amount Paid) */}
                        <td className="p-4 font-extrabold text-emerald-600 text-right">
                          {bill.status === 'Paid' ? parseFloat(bill.amount).toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}