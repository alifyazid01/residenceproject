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
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading Live Statistics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Admin Command Center</h1>
        <p className="text-slate-500">Live overview of your residence system data.</p>
      </div>

      {/* KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Residents Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Residents</span>
          <span className="text-4xl font-extrabold text-slate-900 my-3">{stats.totalResidents}</span>
          <Link to="/residents" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-auto inline-flex items-center">
            View Directory <span className="ml-1">→</span>
          </Link>
        </div>

        {/* Units Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Units</span>
          <span className="text-4xl font-extrabold text-slate-900 my-3">{stats.totalUnits}</span>
          <span className="text-sm text-slate-400 mt-auto">Database capacity</span>
        </div>

        {/* Visitors Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active/Pending Guests</span>
          <span className="text-4xl font-extrabold text-emerald-500 my-3">{stats.activeVisitors}</span>
          <Link to="/guests" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-auto inline-flex items-center">
            Manage Access <span className="ml-1">→</span>
          </Link>
        </div>

        {/* Bills Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Bills</span>
          <span className="text-4xl font-extrabold text-rose-500 my-3">{stats.pendingBills}</span>
          <Link to="/bills" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-auto inline-flex items-center">
            View Finances <span className="ml-1">→</span>
          </Link>
        </div>

      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Modules</h3>
        <div className="flex flex-wrap gap-4">
          <Link to="/facilities" className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-2">
            <span>🎾</span> Facilities
          </Link>
          <Link to="/parking" className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-2">
            <span>🚗</span> Parking
          </Link>
          <Link to="/contacts" className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-2">
            <span>📞</span> Contacts
          </Link>
        </div>
      </div>
    </div>
  );
}