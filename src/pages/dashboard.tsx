import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeVisitors: 0,
    pendingBills: 0,
    totalUnits: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // 1. Count total registered residents
      const { count: residentCount } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true });

      // 2. Count visitors expected today or currently in the building
      const { count: visitorCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pending', 'Arrived']);

      // 3. Count unpaid/pending bills
      const { count: billCount } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      // 4. Count total property units
      const { count: unitCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalResidents: residentCount || 0,
        activeVisitors: visitorCount || 0,
        pendingBills: billCount || 0,
        totalUnits: unitCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading Live Statistics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-slate-400/20 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-slate-600 font-medium">Live overview of your residence system data.</p>
        </div>

        {/* KPI STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          {/* Residents Card */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col hover:bg-white/60 transition-all duration-300 group hover:-translate-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Residents</span>
            <span className="text-5xl font-extrabold text-slate-900 my-3 tracking-tight">{stats.totalResidents}</span>
            <Link to="/residents" className="text-sm font-bold text-slate-600 group-hover:text-black mt-auto inline-flex items-center transition-colors">
              View Directory <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Units Card */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col hover:bg-white/60 transition-all duration-300 group hover:-translate-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Registered Units</span>
            <span className="text-5xl font-extrabold text-slate-900 my-3 tracking-tight">{stats.totalUnits}</span>
            <span className="text-sm font-medium text-slate-500 mt-auto">Database capacity</span>
          </div>

          {/* Visitors Card */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col hover:bg-white/60 transition-all duration-300 group hover:-translate-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Guests</span>
            <span className="text-5xl font-extrabold text-emerald-600 my-3 tracking-tight">{stats.activeVisitors}</span>
            <Link to="/guests" className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 mt-auto inline-flex items-center transition-colors">
              Manage Access <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Bills Card */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col hover:bg-white/60 transition-all duration-300 group hover:-translate-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Bills</span>
            <span className="text-5xl font-extrabold text-rose-600 my-3 tracking-tight">{stats.pendingBills}</span>
            <Link to="/bills" className="text-sm font-bold text-slate-600 group-hover:text-rose-700 mt-auto inline-flex items-center transition-colors">
              View Finances <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)]">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6">System Modules</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/facilities" className="bg-white/50 border border-white/60 px-6 py-4 rounded-2xl text-slate-800 font-bold hover:bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-3 transform hover:-translate-y-0.5">
              <span className="text-xl">🎾</span> Facilities
            </Link>
            <Link to="/parking" className="bg-white/50 border border-white/60 px-6 py-4 rounded-2xl text-slate-800 font-bold hover:bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-3 transform hover:-translate-y-0.5">
              <span className="text-xl">🚗</span> Parking
            </Link>
            <Link to="/contacts" className="bg-white/50 border border-white/60 px-6 py-4 rounded-2xl text-slate-800 font-bold hover:bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-3 transform hover:-translate-y-0.5">
              <span className="text-xl">📞</span> Contacts
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}