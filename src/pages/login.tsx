import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Function to handle signing in an existing user
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
      navigate('/'); // Redirect back to the gateway on success
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', background: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Residence System Login</h2>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Email address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '15px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', textAlign: 'center' }}>
          {message}
        </div>
      )}

      {/* The new link to your dedicated Registration Page */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
        Don't have an account? <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>Register here</Link>
      </div>
    </div>
  );
} 