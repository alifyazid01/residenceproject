import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 text-slate-900 flex flex-col font-sans relative overflow-hidden">
      
      {/* Premium Ambient Background Glows (White & Soft Shadow) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/80 rounded-full mix-blend-overlay filter blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-400/30 rounded-full mix-blend-multiply filter blur-[100px]"></div>

      {/* HERO SECTION */}
      <div className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 flex-grow flex flex-col justify-center items-center">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Premium Black Text */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black pb-2">
            Modern Living, Elevated.
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            The all-in-one premium property management platform. Experience seamless facility booking, visitor management, and digital billing in one beautiful ecosystem.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link 
              to="/login" 
              className="px-8 py-3.5 rounded-full text-base font-bold text-white bg-slate-900 hover:bg-black shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all transform hover:scale-105"
            >
              Sign In to Portal
            </Link>
            <Link 
              to="/register" 
              className="px-8 py-3.5 rounded-full text-base font-bold text-slate-800 bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/60 shadow-sm transition-all transform hover:scale-105"
            >
              Register Unit
            </Link>
          </div>
        </div>
      </div>

      {/* GLASSMORPHISM FEATURE GRID */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Light Glass Card 1 */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] hover:bg-white/60 transition-all duration-300 group">
            <div className="text-4xl mb-5 opacity-90 group-hover:opacity-100 transition-opacity transform group-hover:-translate-y-1 duration-300">🎟️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Visitor Passes</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">Generate shareable QR/Text codes for your guests to streamline security guardhouse check-ins effortlessly.</p>
          </div>
          
          {/* Light Glass Card 2 */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] hover:bg-white/60 transition-all duration-300 group">
            <div className="text-4xl mb-5 opacity-90 group-hover:opacity-100 transition-opacity transform group-hover:-translate-y-1 duration-300">🎾</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Facility Booking</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">Reserve the BBQ pit, multipurpose hall, or sports courts instantly with real-time availability tracking.</p>
          </div>
          
          {/* Light Glass Card 3 */}
          <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] hover:bg-white/60 transition-all duration-300 group">
            <div className="text-4xl mb-5 opacity-90 group-hover:opacity-100 transition-opacity transform group-hover:-translate-y-1 duration-300">💳</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Digital Billing</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">View your monthly maintenance fees and clear pending invoices directly through our secure digital portal.</p>
          </div>

        </div>
      </div>
      
      {/* FOOTER */}
      <footer className="border-t border-white/40 py-6 text-center text-slate-500 text-sm mt-auto relative z-10 backdrop-blur-md bg-white/20 font-medium">
        <p>© {new Date().getFullYear()} ResidenceSystem. All rights reserved.</p>
      </footer>
    </div>
  );
}