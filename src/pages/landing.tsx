import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 overflow-x-hidden">
      <div className="max-w-3xl w-full text-center">
        
        {/* Scaled down base text to text-4xl to prevent mobile overflow */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight break-words">
          Residence<span className="text-blue-500">System</span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg mb-8 sm:mb-12 px-2">
          Please select your access portal below.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto w-full">
          
          {/* User Portal */}
          <Link to="/" className="group bg-slate-800 border border-slate-700 p-6 sm:p-10 rounded-3xl hover:bg-slate-700 transition-all flex flex-col items-center mx-2 sm:mx-0 shadow-lg">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform">🏘️</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Resident Portal</h2>
            <p className="text-slate-400 text-xs sm:text-sm px-2">
              View outstanding balances, announcements, and JMB contacts without logging in.
            </p>
          </Link>

          {/* Admin Portal */}
          <Link to="/login" className="group bg-blue-600 border border-blue-500 p-6 sm:p-10 rounded-3xl hover:bg-blue-500 transition-all flex flex-col items-center mx-2 sm:mx-0 shadow-lg">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform">🔐</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Admin Portal</h2>
            <p className="text-blue-100 text-xs sm:text-sm px-2">
              Secure management login for billing, auditing, and announcements.
            </p>
          </Link>

        </div>
      </div>
    </div>
  );
}