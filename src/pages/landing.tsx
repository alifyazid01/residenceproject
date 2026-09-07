import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex-grow flex flex-col justify-center">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Modern Living, <span className="text-blue-400">Simplified.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            The all-in-one property management platform for residents and management. Book facilities, manage visitors, pay bills, and stay connected.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login" 
              className="px-8 py-3.5 border border-transparent text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              Sign In to Portal
            </Link>
            <Link 
              to="/register" 
              className="px-8 py-3.5 border border-slate-600 text-base font-bold rounded-lg text-white bg-slate-800 hover:bg-slate-700 transition-all"
            >
              Register Unit
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURE GRID */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full bg-slate-50">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900">Everything you need in one place</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-4xl mb-4">🎟️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Visitor Passes</h3>
            <p className="text-slate-500 text-sm">Generate shareable QR/Text codes for your guests to streamline security guardhouse check-ins.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-4xl mb-4">🎾</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Facility Booking</h3>
            <p className="text-slate-500 text-sm">Reserve the BBQ pit, multipurpose hall, or sports courts instantly with real-time availability.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Digital Billing</h3>
            <p className="text-slate-500 text-sm">View your monthly maintenance fees and clear pending invoices directly through the portal.</p>
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-500 text-sm mt-auto">
        <p>© {new Date().getFullYear()} ResidenceSystem. All rights reserved.</p>
      </footer>
    </div>
  );
}