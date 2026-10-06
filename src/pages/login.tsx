import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Clean the input and invisibly format it to satisfy Supabase's email requirement
    const cleanName = adminName.toLowerCase().trim();
    const formattedEmailForSupabase = `${cleanName}@admin.com`;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formattedEmailForSupabase,
        password: password,
      });

      if (error) throw error;
      
      // If successful, route straight to the admin dashboard
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMsg("INVALID CREDENTIALS. ACCESS DENIED.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex justify-center items-center p-4 font-sans">
      
      <div className="max-w-md w-full bg-white p-10 sm:p-14 border-2 border-black relative z-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-10 border-b-4 border-black pb-6">
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Admin.</h2>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">System Management Login</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-600 text-red-600 p-4 text-[10px] font-bold uppercase tracking-widest text-center mb-8">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          
          <div>
            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Admin ID</label>
            <input 
              type="text" 
              placeholder="E.G. ALIF" 
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-bold uppercase transition-colors rounded-none placeholder-neutral-300"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-2">Passcode</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-transparent border-2 border-neutral-300 focus:border-black outline-none text-black font-black transition-colors rounded-none placeholder-neutral-300 tracking-[0.3em]"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-6 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
        
        <div className="mt-10 border-t-2 border-neutral-100 pt-6 text-center">
          <Link to="/welcome" className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest hover:text-black transition-colors">
            Return to Portal
          </Link>
        </div>
      </div>
    </div>
  );
}