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

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 font-bold uppercase tracking-widest text-black">Loading Ledger...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pb-24 pt-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="border-b-2 border-black pb-8 mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-black uppercase tracking-tighter mb-2">Money Out.</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Record Expenses // Print Vouchers</p>
        </div>

        {/* RECORD EXPENSE FORM */}
        <div className="bg-white border border-neutral-200 p-8 sm:p-10 mb-12">
          <h3 className="text-xl font-black text-black uppercase tracking-tight mb-8">Record Outgoing Payment</h3>
          <form onSubmit={handleRecordExpense} className="flex flex-col md:flex-row gap-6 items-end">
            
            <div className="flex-[2] w-full">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Purpose</label>
              <input 
                type="text" 
                placeholder="E.G. GATE REPAIR" 
                value={formData.purpose} 
                onChange={e => setFormData({...formData, purpose: e.target.value})} 
                required 
                className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-300"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Date</label>
              <input 
                type="date" 
                value={formData.date_incurred} 
                onChange={e => setFormData({...formData, date_incurred: e.target.value})} 
                required 
                className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Amount (RM)</label>
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                placeholder="0.00" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                required 
                className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-300"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-70 whitespace-nowrap">
              {isSubmitting ? 'Recording...' : 'Record'}
            </button>
          </form>
        </div>

        {/* EXPENSES LEDGER TABLE */}
        <div className="bg-white border border-neutral-200 overflow-hidden mb-12">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[750px] relative">
              <thead className="sticky top-0 z-20">
                <tr className="bg-neutral-100 border-b-2 border-black text-[10px] text-black uppercase tracking-widest">
                  <th className="p-5 font-bold">Date</th>
                  <th className="p-5 font-bold">Purpose</th>
                  <th className="p-5 font-bold">Amount</th>
                  <th className="p-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-16 text-center text-neutral-400 font-bold uppercase tracking-widest text-sm">No records found.</td></tr>
                ) : (
                  expenses.map(expense => (
                    <tr key={expense.id} className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors">
                      <td className="p-5 text-neutral-500 font-bold text-xs uppercase tracking-widest">{new Date(expense.date_incurred).toLocaleDateString()}</td>
                      <td className="p-5 font-bold text-black uppercase text-sm">{expense.description}</td>
                      <td className="p-5 font-black text-red-600 tracking-tight text-lg">RM {parseFloat(expense.amount).toFixed(2)}</td>
                      <td className="p-5 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedExpense(expense); setShowReceiptModal(true); }} 
                          className="bg-black text-white px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-colors"
                        >
                          Voucher
                        </button>
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)} 
                          className="bg-transparent text-red-600 border-2 border-red-600 px-5 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 transition-colors"
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
          <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #voucher-print-area, #voucher-print-area * { visibility: visible; }
                #voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; max-height: none !important; overflow: visible !important; }
              }
            `}</style>

            <div id="voucher-print-area" className="bg-white p-8 sm:p-12 w-full max-w-2xl text-black font-sans relative border-t-8 border-black print:border-t-8 print:border-black max-h-[90vh] overflow-y-auto rounded-none">
              
              <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-12 mt-4">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">Voucher.</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-neutral-500">Residence Management System</p>
                </div>
                <div className="text-right flex flex-col gap-3">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">NO.</span>
                    <span className="font-black text-lg">PV-{selectedExpense.id.toString().padStart(4, '0')}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">DATE</span>
                    <span className="font-black text-lg">{new Date(selectedExpense.date_incurred).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8 mb-16">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Payment For</span>
                  <div className="border-b-2 border-neutral-200 pb-2 font-black text-2xl text-black uppercase">
                    {selectedExpense.description}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Amount Paid</span>
                  <div className="border-b-2 border-neutral-200 pb-2 font-black text-4xl text-black tracking-tighter">
                    RM {parseFloat(selectedExpense.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              {/* Signature Lines */}
              <div className="flex justify-between mt-24">
                <div className="w-5/12 text-center border-t-2 border-black pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Prepared By</span>
                </div>
                <div className="w-5/12 text-center border-t-2 border-black pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Approved By</span>
                </div>
              </div>

              <div className="flex justify-center gap-4 print:hidden mt-16 pb-4">
                <button onClick={() => setShowReceiptModal(false)} className="px-8 py-4 bg-transparent text-black border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors">
                  Close
                </button>
                <button onClick={() => window.print()} className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                  Print Voucher
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}