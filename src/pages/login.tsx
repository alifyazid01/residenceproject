import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      navigate('/'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center font-sans relative overflow-hidden p-4">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-400/20 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"></div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md bg-white/40 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)]">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black tracking-tight mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-600 font-medium text-sm">Sign in to your resident portal</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
          
          <button 
            type="submit" 
            disabled={loading} 
            className="mt-2 w-full p-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-center text-sm font-bold">
            {message}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-4 text-sm font-medium">
          <Link to="/forgot-password" className="text-slate-500 hover:text-slate-900 transition-colors">
            Forgot Password?
          </Link>
          
          <div className="w-full border-t border-white/50 pt-4 text-center text-slate-600">
            Don't have an account? <Link to="/register" className="text-slate-900 font-bold hover:underline">Register here</Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}