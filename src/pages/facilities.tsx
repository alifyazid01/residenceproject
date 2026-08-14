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
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Facility Schedule & Booking</h1>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {facilityOptions.map((fac) => (
            <button
              key={fac}
              onClick={() => setSelectedFacility(fac)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: selectedFacility === fac ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedFacility === fac ? '#eff6ff' : 'white',
                color: selectedFacility === fac ? '#1d4ed8' : '#475569',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {fac}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Date:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e293b' }}
          />
        </div>
      </div>

      <div style={{ background: 'white', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0f172a' }}>{selectedFacility} Schedule</h3>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>Showing availability for {selectedDate}</p>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Checking schedule availability...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Time Slot</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Booked By</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, index) => {
                const booking = bookings.find(b => b.time_slot === slot);
                const isBooked = !!booking;
                const slotPassed = isSlotPassed(selectedDate, slot);

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#f8fafc', opacity: slotPassed && !isBooked ? 0.6 : 1 }}>
                    <td style={{ padding: '15px 12px', fontWeight: 'bold', color: slotPassed && !isBooked ? '#94a3b8' : '#1e293b' }}>
                      ⏰ {slot}
                    </td>
                    
                    <td style={{ padding: '15px 12px' }}>
                      {isBooked ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                          🔴 Booked
                        </span>
                      ) : slotPassed ? (
                        <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                          ⚪ Expired
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                          🟢 Available
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '15px 12px', color: '#475569', fontSize: '14px' }}>
                      {isBooked ? `${booking.resident_name} (Unit ${booking.unit_number})` : '—'}
                    </td>

                    <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                      {isBooked ? (
                        <button 
                          onClick={() => handleCancel(booking.id)}
                          style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                        >
                          Cancel Booking
                        </button>
                      ) : slotPassed ? (
                        <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Closed</span>
                      ) : (
                        <button 
                          onClick={() => openBookingModal(slot)}
                          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
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
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Confirm Reservation</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
              <strong>{selectedFacility}</strong><br />
              📅 {selectedDate} | ⏰ {activeSlot}
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="Unit Number (e.g. A-01)" 
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Your Full Name" 
                value={formData.resident_name}
                onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
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