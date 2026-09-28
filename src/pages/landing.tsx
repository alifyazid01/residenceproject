import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
          Residence<span className="text-blue-500">System</span>
        </h1>
        <p className="text-slate-400 text-lg mb-12">Please select your access portal below.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          
          {/* User Portal - Bypasses Login */}
          <Link to="/" className="group bg-slate-800 border border-slate-700 p-10 rounded-3xl hover:bg-slate-700 transition-all flex flex-col items-center">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">🏘️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Resident Portal</h2>
            <p className="text-slate-400 text-sm">View outstanding balances, announcements, and JMB contacts without logging in.</p>
          </Link>

          {/* Admin Portal - Goes to Login */}
          <Link to="/login" className="group bg-blue-600 border border-blue-500 p-10 rounded-3xl hover:bg-blue-500 transition-all flex flex-col items-center">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
            <p className="text-blue-100 text-sm">Secure management login for billing, auditing, and announcements.</p>
          </Link>

        </div>
      </div>
    </div>
  );
}