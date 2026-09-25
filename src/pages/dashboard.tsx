import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 4250.00, // Static baseline for operational costs
    pendingBillsCount: 0
  });

  // 12-Month Financial Map (Money In vs Money Out)
  const financialData = [
    { month: 'Jan', moneyIn: 12000, moneyOut: 8000 },
    { month: 'Feb', moneyIn: 15000, moneyOut: 9500 },
    { month: 'Mar', moneyIn: 14000, moneyOut: 11000 },
    { month: 'Apr', moneyIn: 18000, moneyOut: 10500 },
    { month: 'May', moneyIn: 16500, moneyOut: 12000 },
    { month: 'Jun', moneyIn: 19000, moneyOut: 13500 },
    { month: 'Jul', moneyIn: 22000, moneyOut: 14000 },
    { month: 'Aug', moneyIn: 21500, moneyOut: 12500 },
    { month: 'Sep', moneyIn: 25000, moneyOut: 15000 },
    { month: 'Oct', moneyIn: 23000, moneyOut: 16000 },
    { month: 'Nov', moneyIn: 28000, moneyOut: 17500 },
    { month: 'Dec', moneyIn: 32000, moneyOut: 19000 },
  ];

  useEffect(() => {
    fetchFinancialStatistics();
  }, []);

  const fetchFinancialStatistics = async () => {
    setLoading(true);
    try {
      const { data: bills, error } = await supabase.from('bills').select('*');
      if (error) throw error;

      if (bills) {
        let outstanding = 0;
        let revenueThisMonth = 0;
        let pendingCount = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        bills.forEach(bill => {
          const amount = parseFloat(bill.amount) || 0;
          
          if (bill.status === 'Pending') {
            outstanding += amount;
            pendingCount += 1;
          } 
          
          if (bill.status === 'Paid' && bill.paid_at) {
            const paidDate = new Date(bill.paid_at);
            if (paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear) {
              revenueThisMonth += amount;
            }
          }
        });

        setStats({
          totalOutstanding: outstanding,
          monthlyRevenue: revenueThisMonth,
          monthlyExpenses: 4250.00,
          pendingBillsCount: pendingCount
        });
      }
    } catch (error: any) {
      console.error("Error fetching financial stats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Aggregating Financial Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-slate-600 font-medium">Real-time overview of revenue, operational expenses, and outstanding collections.</p>
        </div>

        {/* KPI STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Total Outstanding
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
              RM {stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-medium text-slate-500 mt-auto">Across {stats.pendingBillsCount} pending invoices</span>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Money In (This Month)
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
              RM {stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-medium text-emerald-600 mt-auto">Reconciled payments collected</span>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Money Out (This Month)
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
              RM {stats.monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-medium text-amber-600 mt-auto">Property maintenance & operations</span>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Collection Rate
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
              {stats.monthlyRevenue > 0 ? Math.round((stats.monthlyRevenue / (stats.monthlyRevenue + stats.totalOutstanding)) * 100) : 0}%
            </span>
            <span className="text-sm font-medium text-indigo-600 mt-auto">Current health ratio</span>
          </div>

        </div>

        {/* 12-MONTH FINANCIAL MAP */}
        <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] w-full mb-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Fiscal Year Cash Flow</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Comparison of gross revenue vs total operational expenses.</p>
            </div>
            <div className="flex gap-4 text-sm font-bold text-slate-600">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span> Money In</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-400"></span> Money Out</span>
            </div>
          </div>
          
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" axisLine={false} tickLine={false} dy={10} fontSize={12} fontWeight={600} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} dx={-10} fontSize={12} fontWeight={600} tickFormatter={(value) => `RM ${value/1000}k`} />
<Tooltip 
  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
  itemStyle={{ fontWeight: 'bold' }}
  formatter={(value: any) => [`RM ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']}
/>
                <Area type="monotone" dataKey="moneyIn" name="Money In (RM)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="moneyOut" name="Money Out (RM)" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}