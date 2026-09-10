import { useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState(''); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'admin' && adminKey !== 'ADMIN123') {
      alert("Invalid Management Secret Key. You cannot register as an Admin.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role 
          }
        }
      });

      if (error) throw error;

      alert("Registration successful! Please check your email to verify your account.");
      navigate('/login');
    } catch (error: any) {
      alert("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center font-sans relative overflow-hidden p-4">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-400/20 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"></div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md bg-white/40 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)]">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black tracking-tight mb-2">
            Create Account
          </h1>
          <p className="text-slate-600 font-medium text-sm">Register to access the Residence System</p>
        </div>

        {/* Glassy Role Selection Tabs */}
        <div className="flex p-1.5 mb-6 bg-white/30 rounded-xl border border-white/50 shadow-inner">
          <button 
            type="button"
            onClick={() => setRole('user')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              role === 'user' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resident
          </button>
          <button 
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              role === 'admin' 
                ? 'bg-white text-rose-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Management
          </button>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium shadow-sm transition-all"
            />
          </div>

          {/* Conditional Admin Key Input */}
          {role === 'admin' && (
            <div className="bg-rose-500/10 p-5 rounded-xl border border-rose-500/20 transition-all">
              <label className="block text-xs font-bold text-rose-700 uppercase tracking-wide mb-2">Management Secret Key</label>
              <input 
                type="password" 
                placeholder="Enter admin passcode"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required={role === 'admin'}
                className="w-full p-3.5 rounded-xl bg-white/50 border border-rose-500/30 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 font-medium shadow-sm transition-all"
              />
              <p className="mt-2 text-xs font-medium text-rose-600">Required to create an administrator account.</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`mt-2 w-full p-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none ${
              role === 'admin' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-black'
            }`}
          >
            {loading ? 'Registering...' : `Register as ${role === 'admin' ? 'Admin' : 'Resident'}`}
          </button>
        </form>

        <div className="mt-8 border-t border-white/50 pt-6 text-center text-sm font-medium text-slate-600">
          Already have an account? <Link to="/login" className="text-slate-900 font-bold hover:underline">Log in here</Link>
        </div>

      </div>
    </div>
  );
}