import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Resident State
  const [userStats, setUserStats] = useState({ outstandingAmount: 0, pendingCount: 0 });

  // Admin State
  const [adminStats, setAdminStats] = useState({
    totalOutstanding: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 4250.00, // Mocked until you create an 'expenses' table
    pendingBillsCount: 0
  });

  // Mocked 12-Month Financial Map
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
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const userRole = session.user.user_metadata?.role || 'user';
        const userEmail = session.user.email || '';
        setRole(userRole);

        if (userRole === 'admin') {
          // ADMIN: Fetch all bills for financial calculations
          const { data: bills, error } = await supabase.from('bills').select('*');
          if (!error && bills) {
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

            setAdminStats(prev => ({
              ...prev,
              totalOutstanding: outstanding,
              monthlyRevenue: revenueThisMonth,
              pendingBillsCount: pendingCount
            }));
          }
        } else {
          // RESIDENT: Fetch only their pending bills
          const { data: residentData } = await supabase
            .from('residents')
            .select('*')
            .or(`email.eq.${userEmail},family_members.cs.[{"email":"${userEmail}"}]`)
            .maybeSingle();

          if (residentData) {
            const primaryEmail = residentData.email;
            const { data: bills, error } = await supabase
              .from('bills')
              .select('amount')
              .eq('resident_email', primaryEmail)
              .eq('status', 'Pending');
              
            if (!error && bills) {
              const total = bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
              setUserStats({ outstandingAmount: total, pendingCount: bills.length });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  // Apps for Residents
  const userApps = [
    { name: 'Billing', icon: '💳', path: '/bills' },
    { name: 'Contacts', icon: '📞', path: '/contacts' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading your portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative overflow-x-hidden pb-20">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8 relative z-10">
        
        {/* === ADMIN VIEW === */}
        {role === 'admin' && (
          <div>
            <div className="mb-10 text-center sm:text-left">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
                Financial Overview
              </h1>
              <p className="text-slate-600 font-medium">Real-time revenue and expense tracking.</p>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Total Outstanding
                </span>
                <span className="text-4xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
                  RM {adminStats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-medium text-slate-500 mt-auto">Across {adminStats.pendingBillsCount} pending bills</span>
              </div>

              <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Money In (This Month)
                </span>
                <span className="text-4xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
                  RM {adminStats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-medium text-emerald-600 mt-auto">Resident payments collected</span>
              </div>

              <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col transition-all hover:bg-white/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Money Out (This Month)
                </span>
                <span className="text-4xl font-extrabold text-slate-900 mt-2 mb-1 tracking-tight">
                  RM {adminStats.monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-medium text-amber-600 mt-auto">Estimated operations cost</span>
              </div>
            </div>

            {/* Recharts Financial Map */}
            <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] w-full mb-12">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">12-Month Financial Map</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Total revenue vs total expenses.</p>
                </div>
                <div className="flex gap-4 text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span> Money In</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-400"></span> Money Out</span>
                </div>
              </div>
              
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                    />
                    <Area type="monotone" dataKey="moneyIn" name="Money In (RM)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="monotone" dataKey="moneyOut" name="Money Out (RM)" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* === RESIDENT VIEW === */}
        {role === 'user' && (
          <div className="max-w-4xl mx-auto w-full text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-3 tracking-tight">
              Resident Portal
            </h1>
            <p className="text-slate-600 font-medium mb-12 text-lg">
              Manage your bills and community contacts.
            </p>

            <div className="max-w-md mx-auto mb-10 bg-white/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] transform transition-all hover:bg-white/50 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.1)]">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Total Outstanding
              </span>
              <div className="text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
                RM {userStats.outstandingAmount.toFixed(2)}
              </div>
              {userStats.pendingCount > 0 ? (
                <p className="text-rose-600 font-bold text-sm">You have {userStats.pendingCount} unpaid bill{userStats.pendingCount > 1 ? 's' : ''}.</p>
              ) : (
                <p className="text-emerald-600 font-bold text-sm">All caught up! No pending bills.</p>
              )}
              
              {userStats.pendingCount > 0 && (
                <Link to="/bills" className="mt-6 block w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  Pay Now
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              {userApps.map((app, index) => (
                <Link key={index} to={app.path} className="block group outline-none">
                  <div className="flex flex-col items-center justify-center p-8 aspect-square rounded-[2rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] hover:bg-white/60 transform hover:-translate-y-2">
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                      {app.icon}
                    </div>
                    <h3 className="text-slate-900 font-bold text-sm sm:text-base tracking-wide">
                      {app.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}