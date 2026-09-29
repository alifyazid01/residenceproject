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
        category: 'General Expense', // Invisibly handles the database requirement
        description: formData.purpose, // Maps your text box to the description column
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
          <p className="text-slate-600 font-medium">Record outgoing payments and operational costs.</p>
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
                      <td className="p-5 text-right">
                        <button onClick={() => handleDeleteExpense(expense.id)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-300 transition-all shadow-sm">Void</button>
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