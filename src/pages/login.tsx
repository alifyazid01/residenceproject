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
      setErrorMsg("Invalid admin name or password. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4 font-sans relative overflow-hidden">
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full mix-blend-overlay filter blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl p-10 rounded-[2rem] border border-slate-700 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Admin Portal</h2>
          <p className="text-slate-400 font-medium">Enter your admin name and master password.</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl text-sm font-bold text-center mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Name</label>
            <input 
              type="text" 
              placeholder="e.g. alif" 
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-center tracking-widest font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              placeholder="Enter password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-center tracking-widest font-bold"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <Link to="/welcome" className="text-slate-400 text-sm font-bold hover:text-white transition-colors">
            ← Return to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}