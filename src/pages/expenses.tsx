import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    purpose: '',
    amount: '',
    date_incurred: new Date().toISOString().split('T')[0]
  });

  // --- RECEIPT / VOUCHER STATES ---
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('expenses').select('*').order('date_incurred', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        category: 'General Expense',
        description: formData.purpose,
        amount: parseFloat(formData.amount),
        date_incurred: formData.date_incurred
      };

      const { data, error } = await supabase.from('expenses').insert([payload]).select();
      if (error) throw error;
      
      if (data) {
        setExpenses([data[0], ...expenses].sort((a,b) => new Date(b.date_incurred).getTime() - new Date(a.date_incurred).getTime()));
      }
      
      alert("Expense recorded successfully!");
      setFormData({ ...formData, purpose: '', amount: '' });
    } catch (error: any) {
      alert("Error recording expense: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("Are you sure you want to void this expense record?")) return;
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-100">Loading ledger...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans pb-12 pt-8 px-4 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Money Out (Expenses)</h1>
          <p className="text-slate-600 font-medium">Record outgoing payments and print official payment vouchers.</p>
        </div>

        {/* RECORD EXPENSE FORM */}
        <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-5">Record Outgoing Payment</h3>
          <form onSubmit={handleRecordExpense} className="flex flex-col md:flex-row gap-5 items-end">
            
            <div className="flex-[2] w-full">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Purpose of Expense</label>
              <input 
                type="text" 
                placeholder="e.g. Fixing main gate, October Clerk Salary..." 
                value={formData.purpose} 
                onChange={e => setFormData({...formData, purpose: e.target.value})} 
                required 
                className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Date</label>
              <input 
                type="date" 
                value={formData.date_incurred} 
                onChange={e => setFormData({...formData, date_incurred: e.target.value})} 
                required 
                className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Amount (RM)</label>
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                placeholder="0.00" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                required 
                className="w-full p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white/80 focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 transition-all shadow-sm"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-md disabled:opacity-70 h-[50px] whitespace-nowrap">
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>

        {/* EXPENSES LEDGER TABLE */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[750px] relative">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white/90 backdrop-blur-xl border-b border-white/50 text-sm text-slate-700 shadow-sm">
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Date</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Purpose</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500 font-medium">No expenses recorded yet.</td></tr>
                ) : (
                  expenses.map(expense => (
                    <tr key={expense.id} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                      <td className="p-5 text-slate-700 text-sm font-medium">{new Date(expense.date_incurred).toLocaleDateString()}</td>
                      <td className="p-5 font-bold text-slate-900">{expense.description}</td>
                      <td className="p-5 font-extrabold text-rose-600">RM {parseFloat(expense.amount).toFixed(2)}</td>
                      <td className="p-5 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedExpense(expense); setShowReceiptModal(true); }} 
                          className="bg-white/50 text-slate-800 border border-white/60 px-4 py-2 rounded-xl font-bold text-xs hover:bg-white transition-all shadow-sm"
                        >
                          Voucher
                        </button>
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)} 
                          className="bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all shadow-sm"
                        >
                          Void
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT VOUCHER MODAL */}
        {showReceiptModal && selectedExpense && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #voucher-print-area, #voucher-print-area * { visibility: visible; }
                #voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; max-height: none !important; overflow: visible !important; }
              }
            `}</style>

            <div id="voucher-print-area" className="bg-white p-8 sm:p-12 w-full max-w-2xl shadow-2xl text-black font-sans relative border-t-8 border-rose-600 print:border-t-8 print:border-rose-600 max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-start border-b-[1.5px] border-black pb-6 mb-8">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-wider uppercase">Payment Voucher</h2>
                  <p className="text-sm font-medium uppercase tracking-wide mt-2 text-slate-600">Residence Management System</p>
                </div>
                <div className="text-right flex flex-col gap-3">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm font-medium uppercase tracking-wide">Voucher No:</span>
                    <span className="font-bold border-b-[1.5px] border-black pb-1 w-28 text-center text-lg">PV-{selectedExpense.id.toString().padStart(4, '0')}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm font-medium uppercase tracking-wide">Date:</span>
                    <span className="font-bold border-b-[1.5px] border-black pb-1 w-28 text-center text-lg">{new Date(selectedExpense.date_incurred).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8 mb-12 mt-10">
                <div className="flex gap-4 items-end">
                  <span className="text-sm font-bold uppercase tracking-wide whitespace-nowrap text-slate-600">Payment For:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-bold text-lg text-slate-900">
                    {selectedExpense.description}
                  </div>
                </div>
                
                <div className="flex gap-4 items-end">
                  <span className="text-sm font-bold uppercase tracking-wide whitespace-nowrap text-slate-600">Amount Paid:</span>
                  <div className="border-b-[1.5px] border-black w-full pb-1 px-2 font-extrabold text-2xl text-rose-600">
                    RM {parseFloat(selectedExpense.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              {/* Signature Lines */}
              <div className="flex justify-between mt-24 pt-8">
                <div className="w-5/12 text-center border-t-[1.5px] border-black pt-2">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-600">Prepared By</span>
                </div>
                <div className="w-5/12 text-center border-t-[1.5px] border-black pt-2">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-600">Approved By</span>
                </div>
              </div>

              <div className="absolute -bottom-4 sm:-bottom-20 left-0 right-0 flex justify-center gap-4 print:hidden pb-8 sm:pb-0">
                <button onClick={() => setShowReceiptModal(false)} className="px-6 py-3 bg-white text-slate-800 border-2 border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-md flex items-center gap-2">
                  🖨️ Print Voucher
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}