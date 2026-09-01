import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Facilities() {
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
    fetchBookings();
  }, [selectedDate, selectedFacility]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
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
    
    // Extract the start time (e.g. "08:00 AM" from "08:00 AM - 10:00 AM")
    const startTimeStr = slotStr.split(' - ')[0];
    const [time, modifier] = startTimeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    // Convert to 24-hour format
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    // Create a Date object for this exact slot
    const slotDateTime = new Date(dateStr);
    slotDateTime.setHours(hours, minutes, 0, 0);

    // Return true if the slot's start time has already passed
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
      setFormData({ unit_number: '', resident_name: '' });
    } catch (error: any) {
      alert(error.message);
      fetchBookings(); // Refresh to catch latest state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Facility Schedule & Booking</h1>
        <p className="text-slate-500">Reserve common areas and amenities for your unit.</p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        
        {/* Facility Tabs */}
        <div className="flex flex-wrap gap-2">
          {facilityOptions.map((fac) => (
            <button
              key={fac}
              onClick={() => setSelectedFacility(fac)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                selectedFacility === fac 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {fac}
            </button>
          ))}
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="font-bold text-slate-500 text-sm uppercase tracking-wide">Date:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2.5 rounded-lg border border-slate-300 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
          />
        </div>
      </div>

      {/* SCHEDULE TABLE CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900">{selectedFacility}</h3>
          <p className="text-slate-500 text-sm mt-1">Showing availability for <span className="font-semibold text-slate-700">{selectedDate}</span></p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Checking schedule availability...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                  <th className="p-4 font-semibold">Time Slot</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Booked By</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, index) => {
                  const booking = bookings.find(b => b.time_slot === slot);
                  const isBooked = !!booking;
                  const slotPassed = isSlotPassed(selectedDate, slot);

                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      } ${slotPassed && !isBooked ? 'opacity-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className={`p-4 font-bold ${slotPassed && !isBooked ? 'text-slate-400' : 'text-slate-900'}`}>
                        ⏰ {slot}
                      </td>
                      
                      <td className="p-4">
                        {isBooked ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            🔴 Booked
                          </span>
                        ) : slotPassed ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            ⚪ Expired
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            🟢 Available
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-600 text-sm">
                        {isBooked ? (
                          <span>
                            <strong className="text-slate-800">{booking.resident_name}</strong> (Unit {booking.unit_number})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {isBooked ? (
                          <button 
                            onClick={() => handleCancel(booking.id)}
                            className="bg-rose-50 text-rose-600 border border-rose-200 px-4 py-1.5 rounded-md font-bold text-xs hover:bg-rose-100 transition-colors"
                          >
                            Cancel
                          </button>
                        ) : slotPassed ? (
                          <span className="text-slate-400 text-xs italic font-medium px-4">Closed</span>
                        ) : (
                          <button 
                            onClick={() => openBookingModal(slot)}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
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
        )}
      </div>

      {/* BOOKING CONFIRMATION MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Confirm Reservation</h2>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4">
              <strong className="block text-slate-900 text-lg mb-1">{selectedFacility}</strong>
              <div className="text-slate-600 text-sm flex flex-col gap-1">
                <span>📅 <span className="font-semibold">{selectedDate}</span></span>
                <span>⏰ <span className="font-semibold">{activeSlot}</span></span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unit Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. A-01" 
                  value={formData.unit_number}
                  onChange={(e) => setFormData({...formData, unit_number: e.target.value.toUpperCase()})}
                  required
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Resident Name</label>
                <input 
                  type="text" 
                  placeholder="Your Full Name" 
                  value={formData.resident_name}
                  onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                  required
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] p-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Reserving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}