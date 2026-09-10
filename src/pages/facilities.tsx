import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Facilities() {
  const [role, setRole] = useState<string>('user');
  const [userUnit, setUserUnit] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Date and Facility filters for the matrix view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFacility, setSelectedFacility] = useState<string>('BBQ Pit');

  // Modal form state for booking an open slot
  const [showForm, setShowForm] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_number: '',
    resident_name: ''
  });

  const facilityOptions = [
    'BBQ Pit', 
    'Multipurpose Hall', 
    'Badminton Court', 
    'Tennis Court', 
    'Swimming Pool Cabana'
  ];

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
    '08:00 PM - 10:00 PM'
  ];

  useEffect(() => {
    fetchSessionAndBookings();
  }, [selectedDate, selectedFacility]);

  const fetchSessionAndBookings = async () => {
    setLoading(true);
    try {
      // 1. Check Auth & Get Resident Profile
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const currentRole = session.user.user_metadata?.role || 'user';
        const userEmail = session.user.email || '';
        setRole(currentRole);

        // Fetch using the same .or() logic to support Family Members
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .or(`email.eq.${userEmail},family_members.cs.[{"email":"${userEmail}"}]`)
          .maybeSingle();

        if (residentData) {
          setUserUnit(residentData.unit_number);
          
          // Determine if they are the primary owner or a family member to get the correct name
          let currentName = residentData.name;
          if (residentData.email !== userEmail && residentData.family_members) {
            const member = residentData.family_members.find((m: any) => m.email === userEmail);
            if (member) currentName = member.name;
          }
          setUserName(currentName);
        }
      }

      // 2. Fetch the Bookings for the selected date and facility
      const { data, error } = await supabase
        .from('facility_bookings')
        .select('*')
        .eq('facility', selectedFacility)
        .eq('booking_date', selectedDate);
        
      if (error) throw error;
      if (data) setBookings(data);

    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- TIME VALIDATION LOGIC ---
  const isSlotPassed = (dateStr: string, slotStr: string) => {
    const now = new Date();
    const startTimeStr = slotStr.split(' - ')[0];
    const [time, modifier] = startTimeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const slotDateTime = new Date(dateStr);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime < now;
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const { error } = await supabase.from('facility_bookings').delete().eq('id', id);
      if (error) throw error;
      
      setBookings(bookings.filter(b => b.id !== id));
    } catch (error: any) {
      alert("Error canceling booking: " + error.message);
    }
  };

  const openBookingModal = (slot: string) => {
    setActiveSlot(slot);
    // Auto-fill the form so the user doesn't have to type it
    setFormData({
      unit_number: userUnit,
      resident_name: userName
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        facility: selectedFacility,
        booking_date: selectedDate,
        time_slot: activeSlot,
        status: 'Confirmed'
      };

      const { data, error } = await supabase
        .from('facility_bookings')
        .insert([payload])
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error("This time slot was just booked by someone else! Please pick another slot.");
        }
        throw error;
      }

      if (data) {
        setBookings([...bookings, data[0]]);
      }
      
      setShowForm(false);
    } catch (error: any) {
      alert(error.message);
      fetchSessionAndBookings(); // Refresh to catch latest state
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex justify-center items-center">
        <div className="text-slate-600 font-medium animate-pulse text-lg">Checking schedule availability...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 font-sans relative pb-12">
      
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/60 rounded-full mix-blend-overlay filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-black mb-2 tracking-tight">
            Facility Schedule & Booking
          </h1>
          <p className="text-slate-600 font-medium">Reserve common areas and amenities for your unit.</p>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] mb-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          
          {/* Facility Tabs */}
          <div className="flex flex-wrap gap-3">
            {facilityOptions.map((fac) => (
              <button
                key={fac}
                onClick={() => setSelectedFacility(fac)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all duration-300 shadow-sm ${
                  selectedFacility === fac 
                    ? 'bg-slate-900 border-slate-900 text-white transform hover:scale-105' 
                    : 'bg-white/50 border-white/60 text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-md'
                }`}
              >
                {fac}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Date</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-3 rounded-xl bg-white/50 border border-white/60 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-bold shadow-sm transition-all w-full md:w-auto cursor-pointer"
            />
          </div>
        </div>

        {/* SCHEDULE TABLE CARD */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden">
          
          <div className="p-8 border-b border-white/50 bg-white/20">
            <h3 className="text-2xl font-extrabold text-slate-900">{selectedFacility}</h3>
            <p className="text-slate-600 text-sm mt-1 font-medium">Showing availability for <span className="font-bold text-slate-800">{selectedDate}</span></p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-white/30 border-b border-white/50 text-xs text-slate-700">
                  <th className="p-5 font-bold uppercase tracking-wider">Time Slot</th>
                  <th className="p-5 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wider">Booked By</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, index) => {
                  const booking = bookings.find(b => b.time_slot === slot);
                  const isBooked = !!booking;
                  const slotPassed = isSlotPassed(selectedDate, slot);
                  
                  const canCancel = isBooked && (role === 'admin' || booking.unit_number === userUnit);

                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-white/30 transition-colors ${
                        slotPassed && !isBooked ? 'opacity-50' : 'hover:bg-white/50'
                      }`}
                    >
                      <td className={`p-5 font-extrabold ${slotPassed && !isBooked ? 'text-slate-500' : 'text-slate-900'}`}>
                        ⏰ {slot}
                      </td>
                      
                      <td className="p-5">
                        {isBooked ? (
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold border bg-rose-500/20 text-rose-800 border-rose-500/30">
                            🔴 Booked
                          </span>
                        ) : slotPassed ? (
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold border bg-slate-500/20 text-slate-700 border-slate-500/30">
                            ⚪ Expired
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-800 border-emerald-500/30">
                            🟢 Available
                          </span>
                        )}
                      </td>

                      <td className="p-5 text-slate-700 text-sm">
                        {isBooked ? (
                          <span>
                            <strong className="text-slate-900">{booking.resident_name}</strong> <span className="text-slate-500 text-xs ml-1">(Unit {booking.unit_number})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      <td className="p-5 text-right">
                        {isBooked ? (
                          canCancel ? (
                            <button 
                              onClick={() => handleCancel(booking.id)}
                              className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-rose-500/20 transition-all shadow-sm"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-slate-500 text-xs italic font-medium px-4">Locked</span>
                          )
                        ) : slotPassed ? (
                          <span className="text-slate-500 text-xs italic font-medium px-4">Closed</span>
                        ) : (
                          <button 
                            onClick={() => openBookingModal(slot)}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                          >
                            Book Slot
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOOKING CONFIRMATION MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-white/60">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Confirm Reservation</h2>
              
              <div className="bg-white/50 p-6 rounded-2xl border border-white/60 shadow-inner mb-6 mt-4">
                <strong className="block text-slate-900 text-lg mb-2">{selectedFacility}</strong>
                <div className="text-slate-700 text-sm flex flex-col gap-2">
                  <span className="flex items-center gap-2">📅 <span className="font-bold">{selectedDate}</span></span>
                  <span className="flex items-center gap-2">⏰ <span className="font-bold">{activeSlot}</span></span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Unit Number {role === 'user' && <span className="text-slate-400 lowercase normal-case">(Auto-filled)</span>}
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. A-01" 
                    value={formData.unit_number}
                    onChange={(e) => setFormData({...formData, unit_number: e.target.value.toUpperCase()})}
                    required
                    readOnly={role === 'user'}
                    className={`w-full p-3.5 rounded-xl border border-white/60 outline-none uppercase font-medium shadow-sm transition-all ${
                      role === 'user' ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed' : 'bg-white/50 focus:bg-white focus:ring-2 focus:ring-slate-900 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Resident Name {role === 'user' && <span className="text-slate-400 lowercase normal-case">(Auto-filled)</span>}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Your Full Name" 
                    value={formData.resident_name}
                    onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                    required
                    readOnly={role === 'user'}
                    className={`w-full p-3.5 rounded-xl border border-white/60 outline-none font-medium shadow-sm transition-all ${
                      role === 'user' ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed' : 'bg-white/50 focus:bg-white focus:ring-2 focus:ring-slate-900 text-slate-800'
                    }`}
                  />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 p-3.5 bg-white/50 text-slate-700 border border-white/60 rounded-xl font-bold hover:bg-white transition-colors shadow-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] p-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:transform-none">
                    {isSubmitting ? 'Reserving...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}