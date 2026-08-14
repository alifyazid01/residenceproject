import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Bills() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);

  // State variables for the pop-up form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    resident_name: '',
    description: '',
    amount: ''
  });

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase.from('bills').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) setBills(data);
    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: number) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'Paid' })
        .eq('id', id);

      if (error) throw error;

      // Update the screen instantly
      setBills(bills.map(bill => bill.id === id ? { ...bill, status: 'Paid' } : bill));
    } catch (error: any) {
      alert("Error updating transaction: " + error.message);
    }
  };

  // --- PDF INVOICE / RECEIPT GENERATION ---
  const generateInvoicePDF = (bill: any) => {
    const doc = new jsPDF();
    
    // Header Branding
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(bill.status === 'Paid' ? "OFFICIAL RECEIPT" : "TAX INVOICE", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Document Reference: #INV-${bill.id.toString().padStart(5, '0')}`, 14, 30);
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 14, 36);

    // Bill Details Table
    autoTable(doc, {
      startY: 46,
      head: [['Resident / Payer', 'Description', 'Payment Status', 'Total Amount']],
      body: [
        [
          bill.resident_name || 'N/A',
          bill.description,
          bill.status,
          bill.amount.toString().startsWith('RM') ? bill.amount : `RM ${bill.amount}`
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
      styles: { cellPadding: 6, fontSize: 10 }
    });

    // Save PDF
    const filename = `${bill.status === 'Paid' ? 'Receipt' : 'Invoice'}_${(bill.resident_name || 'Resident').replace(/\s+/g, '_')}_Bill${bill.id}.pdf`;
    doc.save(filename);
  };

  // --- FPX PAYMENT INITIATION ---
  const handleFPXPayment = (bill: any) => {
    alert(`Initiating FPX Gateway...\n\nResident: ${bill.resident_name}\nAmount: ${bill.amount}\n\nRedirecting to banking gateway...`);
  };

  // Function to handle issuing a new bill
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert([{ ...formData, status: 'Pending' }])
        .select();

      if (error) throw error;

      if (data) {
        // Add the new bill instantly to the list without refreshing
        setBills([...bills, data[0]]);
        
        // Close form and reset fields
        setShowForm(false);
        setFormData({ resident_name: '', description: '', amount: '' });
      }
    } catch (error: any) {
      alert("Error issuing bill: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading financial data...</div>;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Billing & Payments</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Issue New Bill
        </button>
      </div>

      <div style={{ background: 'white', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Resident</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Description</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Amount</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{bill.resident_name}</td>
                <td style={{ padding: '12px', color: '#64748b' }}>{bill.description}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{bill.amount}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    background: bill.status === 'Paid' ? '#dcfce7' : '#fef3c7', 
                    color: bill.status === 'Paid' ? '#166534' : '#b45309', 
                    padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' 
                  }}>
                    {bill.status}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {/* Invoice Download Button */}
                    <button 
                      onClick={() => generateInvoicePDF(bill)}
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      title="Download PDF"
                    >
                      📄 Invoice
                    </button>

                    {/* Pay via FPX Button */}
                    {bill.status === 'Pending' && (
                      <button 
                        onClick={() => handleFPXPayment(bill)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        💳 Pay FPX
                      </button>
                    )}

                    {/* Admin Mark Paid Button */}
                    {bill.status === 'Pending' && (
                      <button 
                        onClick={() => markAsPaid(bill.id)}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        ✓ Mark Paid
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The Pop-up Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Issue New Bill</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="Resident Name" 
                value={formData.resident_name}
                onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Description (e.g., Monthly Maintenance)" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Amount (e.g., RM 150.00)" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Issuing...' : 'Issue Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}