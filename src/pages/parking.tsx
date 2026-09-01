import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Parking() {
  const [role, setRole] = useState<string>('user');
  const [currentUnit, setCurrentUnit] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [bays, setBays] = useState<any[]>([]);
  
  // Form state for updating a bay's vehicle details (Admin Only)
  const [showForm, setShowForm] = useState(false);
  const [activeBay, setActiveBay] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    unit_number: '',
    resident_name: '',
    vehicle_plate: '',
    vehicle_model: ''
  });

  useEffect(() => {
    fetchSessionAndParkingBays();
  }, []);

  const fetchSessionAndParkingBays = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const userRole = session.user.user_metadata?.role || 'user';
        const userEmail = session.user.email || '';
        setRole(userRole);

        if (userRole === 'admin') {
          // ADMIN: Fetch all parking bays
          const { data, error } = await supabase
            .from('parking_bays')
            .select('*')
            .order('unit_number', { ascending: true })
            .order('bay_number', { ascending: true });
            
          if (error) throw error;
          if (data) setBays(data);
        } else {
          // RESIDENT: Fetch only their assigned bays
          const { data: residentData } = await supabase
            .from('residents')
            .select('unit_number')
            .eq('email', userEmail)
            .maybeSingle();

          if (residentData) {
            const unit = residentData.unit_number;
            setCurrentUnit(unit);
            
            const { data, error } = await supabase
              .from('parking_bays')
              .select('*')
              .eq('unit_number', unit) 
              .order('bay_number', { ascending: true });

            if (error) throw error;
            if (data) setBays(data);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching parking data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN ONLY ACTIONS ---
  const openUpdateForm = (bay: any) => {
    setActiveBay(bay);
    setFormData({
      unit_number: bay.unit_number || '', 
      resident_name: bay.resident_name || '',
      vehicle_plate: bay.vehicle_plate || '',
      vehicle_model: bay.vehicle_model || ''
    });
    setShowForm(true);
  };

  const handleClearBay = async (id: number) => {
    if (!window.confirm("Are you sure you want to unregister this vehicle? The bay will be marked as empty.")) return;

    try {
      const { error } = await supabase
        .from('parking_bays')
        .update({ vehicle_plate: null, vehicle_model: null, resident_name: null })
        .eq('id', id);

      if (error) throw error;
      
      setBays(bays.map(bay => bay.id === id ? { ...bay, vehicle_plate: null, vehicle_model: null, resident_name: null } : bay));
    } catch (error: any) {
      alert("Error clearing bay: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('parking_bays')
        .update({
          unit_number: formData.unit_number.toUpperCase().trim(),
          resident_name: formData.resident_name,
          vehicle_plate: formData.vehicle_plate,
          vehicle_model: formData.vehicle_model,
          last_updated: new Date().toISOString()
        })
        .eq('id', activeBay.id)
        .select();

      if (error) throw error;

      if (data) {
        setBays(bays.map(bay => bay.id === activeBay.id ? data[0] : bay));
      }
      
      setShowForm(false);
      setActiveBay(null);
    } catch (error: any) {
      alert("Error updating bay details: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-slate-500 font-medium animate-pulse">Loading parking records...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Vehicle & Parking Management</h1>
        <p className="text-slate-500">
          {role === 'admin' 
            ? 'Master directory of all property parking allocations.' 
            : `Viewing registered vehicles for Unit ${currentUnit}`}
        </p>
      </div>

      {bays.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
          {role === 'admin' ? 'No parking bays found in the database.' : 'No parking bays have been assigned to your unit.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bays.map((bay, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              
              <div>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">Unit {bay.unit_number}</h3>
                  </div>
                  <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-sm tracking-wide shadow-sm">
                    {bay.bay_number}
                  </div>
                </div>
                
                {/* Dynamic Vehicle Info Box */}
                <div className={`p-4 rounded-xl mb-6 border ${bay.vehicle_plate ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'}`}>
                  {bay.vehicle_plate ? (
                    <>
                      <p className="text-lg font-extrabold text-blue-600 tracking-wide mb-1">
                        {bay.vehicle_plate}
                      </p>
                      <p className="text-sm text-slate-600 mb-3 font-medium">
                        🚗 {bay.vehicle_model}
                      </p>
                      <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                        👤 Registered to: <strong className="text-slate-700">{bay.resident_name}</strong>
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <p className="font-bold text-rose-500">Empty Bay</p>
                      <p className="text-xs text-rose-400 mt-1">
                        {role === 'admin' ? 'No vehicle registered' : 'Contact Management to register a vehicle'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ADMIN ONLY BUTTONS */}
              {role === 'admin' && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => openUpdateForm(bay)}
                    className="flex-[2] py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
                  >
                    {bay.vehicle_plate ? 'Update Details' : 'Assign / Register'}
                  </button>
                  
                  {bay.vehicle_plate && (
                    <button 
                      onClick={() => handleClearBay(bay.id)}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Update Vehicle Modal Form (Admin Only) */}
      {showForm && role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Manage Bay {activeBay?.bay_number}</h2>
            <p className="text-slate-500 text-sm mb-6">
              Reassign unit ownership or update vehicle details.
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assigned Unit</label>
                <input 
                  type="text" 
                  placeholder="e.g. B-05" 
                  value={formData.unit_number}
                  onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                  required
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">License Plate (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. JQM 1234" 
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Vehicle Model (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. MINI Countryman or Honda Wave 125" 
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Resident / Owner Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Owner Name" 
                  value={formData.resident_name}
                  onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] p-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}