import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-4xl w-full text-center">
        
        {/* Massive, tight typography synonymous with premium athletic brands */}
        <h1 className="text-6xl sm:text-5xl md:text-9xl font-black text-black uppercase tracking-tighter mb-4">
          KEKWA RESIDENCE.
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base font-bold uppercase tracking-widest mb-16">
          System Access Portal // Select Your Path
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          
          {/* User Portal - High Contrast Outline */}
          <Link to="/" className="group bg-transparent border-2 border-black p-10 sm:p-14 hover:bg-black transition-colors duration-300 flex flex-col items-center">
            <h2 className="text-2xl font-black text-black group-hover:text-white uppercase tracking-tight mb-3 transition-colors">Resident</h2>
            <p className="text-neutral-500 group-hover:text-neutral-300 text-xs font-bold uppercase tracking-widest transition-colors text-center">
              View Balances & Reports
            </p>
            <div className="mt-8 w-12 h-1 bg-black group-hover:bg-white transition-colors"></div>
          </Link>

          {/* Admin Portal - Solid Black */}
          <Link to="/login" className="group bg-transparent border-2 border-black p-10 sm:p-14 hover:bg-neutral-800 transition-colors duration-300 flex flex-col items-center">
            <h2 className="text-2xl font-black text-black group-hover:text-white uppercase tracking-tight mb-3 transition-colors">Admin</h2>
            <p className="text-neutral-500 group-hover:text-neutral-300 text-xs font-bold uppercase tracking-widest transition-colors text-center">
              System Management
            </p>
            <div className="mt-8 w-12 h-1 bg-black group-hover:bg-white transition-colors"></div>
          </Link>

        </div>
      </div>
    </div>
  );
}