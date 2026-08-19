import { useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    // This tells Supabase to send the email, and where to send the user after they click the link in the email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage(error.message);
      setIsError(true);
    } else {
      setMessage('Success! Check your email for the secure reset link.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', background: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#1e293b' }}>Reset Password</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Enter your email and we'll send you a secure reset link.</p>
      
      <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Enter your registered email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button type="submit" disabled={loading} style={{ padding: '12px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '15px', padding: '10px', background: isError ? '#fee2e2' : '#dcfce7', color: isError ? '#991b1b' : '#166534', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}>
          {message}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
        <Link to="/login" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Login</Link>
      </div>
    </div>
  );
}