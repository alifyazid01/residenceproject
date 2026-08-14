import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

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
      navigate('/'); // Redirect back to the dashboard on success
    }
    setLoading(false);
  };

  // Function to handle registering a brand new user
  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Registration successful! Please sign in.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Residence System Login</h2>
      
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
          {loading ? 'Loading...' : 'Sign In'}
        </button>
        
        <button type="button" onClick={handleSignUp} disabled={loading} style={{ padding: '10px', cursor: 'pointer', background: '#f3f4f6', border: '1px solid #ccc', borderRadius: '4px' }}>
          Create Account
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '15px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', textAlign: 'center' }}>
          {message}
        </div>
      )}
    </div>
  );
}