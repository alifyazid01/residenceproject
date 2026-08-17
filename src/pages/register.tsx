import { useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState(''); // Security key for admins
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security Check: Prevent normal users from registering as admins
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
            role: role // This saves 'admin' or 'user' into the Supabase auth database!
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
    <div style={{ padding: '60px 20px', fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <h1 style={{ color: '#1e293b', margin: '0 0 5px 0', textAlign: 'center' }}>Create Account</h1>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>Register to access the Residence System</p>

        {/* Role Selection Tabs */}
        <div style={{ display: 'flex', marginBottom: '20px', background: '#f8fafc', borderRadius: '8px', padding: '5px' }}>
          <button 
            type="button"
            onClick={() => setRole('user')}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: role === 'user' ? 'white' : 'transparent', color: role === 'user' ? '#3b82f6' : '#64748b', boxShadow: role === 'user' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            Resident
          </button>
          <button 
            type="button"
            onClick={() => setRole('admin')}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: role === 'admin' ? 'white' : 'transparent', color: role === 'admin' ? '#ef4444' : '#64748b', boxShadow: role === 'admin' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            Management
          </button>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          {/* Conditional Admin Key Input */}
          {role === 'admin' && (
            <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#991b1b', fontSize: '14px', fontWeight: 'bold' }}>Management Secret Key</label>
              <input 
                type="password" 
                placeholder="Enter admin passcode"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required={role === 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5', boxSizing: 'border-box' }}
              />
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#ef4444' }}>Required to create an administrator account.</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: role === 'admin' ? '#ef4444' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
          >
            {loading ? 'Registering...' : `Register as ${role === 'admin' ? 'Admin' : 'Resident'}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>Log in here</Link>
        </div>

      </div>
    </div>
  );
}