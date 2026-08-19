import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // This updates the password for the currently verified session
    const { error } = await supabase.auth.updateUser({ 
      password: password 
    });

    if (error) {
      alert("Error updating password: " + error.message);
    } else {
      alert("Password updated successfully! You can now log in.");
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', background: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#1e293b' }}>Set New Password</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Your email has been verified. Please enter your new password.</p>
      
      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="password" 
          placeholder="New Password (min 6 characters)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button type="submit" disabled={loading} style={{ padding: '12px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {loading ? 'Saving...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}