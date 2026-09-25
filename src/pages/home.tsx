import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Replace with the actual admin/management WhatsApp Business number (include country code, no + or spaces)
  const ADMIN_WHATSAPP = "60123456789"; 

  const [userStats, setUserStats] = useState({ 
    outstandingAmount: 0, 
    pendingCount: 0, 
    unit_number: '' 
  });

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const userRole = session.user.user_metadata?.role || 'user';
        const userEmail = session.user.email || '';
        setRole(userRole);

        if (userRole === 'user') {
          const { data: residentData } = await supabase
            .from('residents')
            .select('*')
            .or(`email.eq.${userEmail},family_members.cs.[{"email":"${userEmail}"}]`)
            .maybeSingle();

          if (residentData) {
            const primaryEmail = residentData.email;
            const { data: bills, error } = await supabase
              .from('bills')
              .select('amount')
              .eq('resident_email', primaryEmail)
              .eq('status', 'Pending');
              
            if (!error && bills) {
              const total = bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
              setUserStats({ 
                outstandingAmount: total, 
                pendingCount: bills.length,
                unit_number: residentData.unit_number || 'N/A'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPayment = () => {
    const text = `Hello Management, I would like to make a payment for Unit ${userStats.unit_number}.%0A%0A*Total Amount Due:* RM ${userStats.outstandingAmount.toFixed(2)}%0A%0APlease provide the bank transfer details.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative overflow-x-hidden pb-20">
      
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8 relative z-10">
        
        {/* RESIDENT VIEW */}
        {role === 'user' && (
          <div className="max-w-4xl mx-auto w-full text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-3 tracking-tight">
              Resident Dashboard
            </h1>
            <p className="text-slate-600 font-medium mb-12 text-lg">
              View your outstanding balance and community contacts.
            </p>

            <div className="max-w-md mx-auto mb-10 bg-white/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] transform transition-all hover:bg-white/50">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Total Outstanding
              </span>
              <div className="text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
                RM {userStats.outstandingAmount.toFixed(2)}
              </div>
              {userStats.pendingCount > 0 ? (
                <p className="text-rose-600 font-bold text-sm">
                  You have {userStats.pendingCount} unpaid bill{userStats.pendingCount > 1 ? 's' : ''}.
                </p>
              ) : (
                <p className="text-emerald-600 font-bold text-sm">All caught up! No pending balances.</p>
              )}
              
              {userStats.pendingCount > 0 && (
                <button 
                  onClick={handleWhatsAppPayment} 
                  className="mt-6 w-full bg-emerald-500 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <span>💬</span> Pay via WhatsApp
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 max-w-xs mx-auto">
              <Link to="/contacts" className="block group outline-none">
                <div className="flex flex-col items-center justify-center p-8 aspect-square rounded-[2rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] hover:bg-white/60 transform hover:-translate-y-2">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                    📞
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm sm:text-base tracking-wide">
                    Management Contacts
                  </h3>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ADMIN REDIRECT */}
        {role === 'admin' && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Welcome to the Operations Portal</h2>
            <Link to="/dashboard" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md">
              Access Admin Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}