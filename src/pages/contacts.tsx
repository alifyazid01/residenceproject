import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Contacts() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('department', { ascending: false });
        
      if (error) throw error;
      if (data) setContacts(data);
    } catch (error: any) {
      console.error("Error fetching contacts:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading contact directory...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Management & Emergency Contacts</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Official directory for the Joint Management Body and Security Guardhouse</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {contacts.map((contact, index) => (
          <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <span style={{ 
                background: contact.department === 'Security' ? '#fee2e2' : contact.department === 'Management' ? '#e0e7ff' : '#fef3c7',
                color: contact.department === 'Security' ? '#991b1b' : contact.department === 'Management' ? '#3730a3' : '#b45309',
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' 
              }}>
                {contact.department}
              </span>
            </div>
            
            <h2 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '20px' }}>{contact.name}</h2>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>{contact.role}</p>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📞</span>
                <span style={{ color: '#1e293b', fontWeight: contact.phone ? 'bold' : 'normal' }}>
                  {contact.phone || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>✉️</span>
                <span style={{ color: '#1e293b', fontWeight: contact.email ? 'bold' : 'normal', wordBreak: 'break-all' }}>
                  {contact.email || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}