import { UserPlus, User, Users, Trash2, Utensils, Plus, Calendar, Clock } from 'lucide-react';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// EXTRACTED SUB-COMPONENT: Keeps the main section highly readable!
// ---------------------------------------------------------------------------
const GuestCard = ({ guest, gIndex, guests, setFormData, formData, todayStr, removeGuest, calculateDuration }) => {
  const updateGuest = (field, value) => {
    setFormData((prev) => {
      const newGuests = [...prev.guests];
      newGuests[gIndex][field] = value;
      return { ...prev, guests: newGuests };
    });
  };

  const addFoodDay = () => {
    setFormData((prev) => {
      const newGuests = [...prev.guests];
      newGuests[gIndex].food_preferences.push({ date: newGuests[gIndex].arrival_date || '', breakfast: 0, lunch: 0, dinner: 0, remarks: '' });
      return { ...prev, guests: newGuests };
    });
  };

  const removeFoodDay = (foodIndex) => {
    setFormData((prev) => {
      const newGuests = [...prev.guests];
      newGuests[gIndex].food_preferences = newGuests[gIndex].food_preferences.filter((_, i) => i !== foodIndex);
      return { ...prev, guests: newGuests };
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" /> Guest {gIndex + 1}
        </h4>
        {guests.length > 1 && (
          <button type="button" onClick={() => removeGuest(gIndex)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Guest Details Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
          <input required type="text" value={guest.guest_name} onChange={(e) => updateGuest('guest_name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Relation to Applicant *</label>
          <input required type="text" value={guest.relation_to_applicant} onChange={(e) => updateGuest('relation_to_applicant', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Parent, Colleague" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
          <input type="email" value={guest.email} onChange={(e) => updateGuest('email', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="guest@institute.edu" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Age & Gender</label>
          <div className="flex gap-2">
            <input required type="number" value={guest.age} onChange={(e) => updateGuest('age', e.target.value)} className="w-16 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Age" />
            <select value={guest.gender} onChange={(e) => updateGuest('gender', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number *</label>
          <input required type="tel" value={guest.phone} onChange={(e) => updateGuest('phone', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">ID Proof (Type & Number) *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select required value={guest.id_proof_type || ''} onChange={(e) => { updateGuest('id_proof_type', e.target.value); if (!e.target.value) updateGuest('id_proof_number', ''); }} className={`${guest.id_proof_type ? 'w-full sm:w-1/3' : 'w-full'} px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 transition-all`}>
              <option value="" disabled>Select ID Type</option>
              <option value="Aadhar">Aadhar</option><option value="PAN">PAN</option><option value="Passport">Passport</option><option value="Voter ID">Voter ID</option><option value="Driving License">Driving License</option>
            </select>
            {guest.id_proof_type && (
              <input required type="text" value={guest.id_proof_number} onChange={(e) => updateGuest('id_proof_number', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 animate-fade-in" placeholder={`Enter ${guest.id_proof_type} Number`} />
            )}
          </div>
        </div>
      </div>

      {/* Guest Stay Duration Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 border-t border-slate-200 pt-4">
        <div className="sm:col-span-4 flex flex-wrap gap-2 justify-between items-start sm:items-center">
          <div>
            <p className="text-sm font-bold text-slate-700">Guest Stay Duration <span className="text-red-500">*</span></p>
            <p className="text-xs text-slate-500">Define the exact check-in and check-out dates for this specific guest.</p>
          </div>
          {calculateDuration(guest.arrival_date, guest.arrival_time, guest.departure_date, guest.departure_time) && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm border ${calculateDuration(guest.arrival_date, guest.arrival_time, guest.departure_date, guest.departure_time) === 'Invalid Duration' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
              <Clock className="w-3.5 h-3.5 mr-1.5" /> {calculateDuration(guest.arrival_date, guest.arrival_time, guest.departure_date, guest.departure_time)}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arrival Date</label>
          <input type="date" required value={guest.arrival_date || ''} onChange={(e) => updateGuest('arrival_date', e.target.value)} min={todayStr} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arrival Time</label>
          <input type="time" required value={guest.arrival_time || ''} onChange={(e) => updateGuest('arrival_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Date</label>
          <input type="date" required value={guest.departure_date || ''} onChange={(e) => updateGuest('departure_date', e.target.value)} min={guest.arrival_date || todayStr} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Time</label>
          <input type="time" required value={guest.departure_time || ''} onChange={(e) => updateGuest('departure_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" />
        </div>
      </div>

      {/* Food Requisition Matrix */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
            <Utensils className="w-3 h-3 mr-1" /> Meal Requirements
          </span>
          <button type="button" onClick={addFoodDay} className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100">+ Add Meal Day</button>
        </div>
        {guest.food_preferences.map((meal, fIndex) => (
          <div key={fIndex} className="flex gap-2 mb-2 items-center bg-white p-2 rounded-lg border border-slate-100">
            <input type="date" min={guest.arrival_date || todayStr} max={guest.departure_date || ''} value={meal.date} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].date = e.target.value; setFormData({ ...formData, guests: ng }); }} className="w-32 text-xs border rounded p-1 text-slate-700" />
            <label className="text-xs flex items-center cursor-pointer ml-1">
              <span className="mr-1.5 font-bold text-slate-600">B</span>
              <input type="checkbox" checked={meal.breakfast > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].breakfast = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <label className="text-xs flex items-center cursor-pointer ml-2">
              <span className="mr-1.5 font-bold text-slate-600">L</span>
              <input type="checkbox" checked={meal.lunch > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].lunch = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <label className="text-xs flex items-center cursor-pointer ml-2">
              <span className="mr-1.5 font-bold text-slate-600">D</span>
              <input type="checkbox" checked={meal.dinner > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].dinner = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <button type="button" onClick={() => removeFoodDay(fIndex)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 ml-auto rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT EXPORT
// ---------------------------------------------------------------------------
export default function MultiGuestSection({ formData, setFormData }) {
  const guests = formData.guests || [];

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  useEffect(() => {
    if (guests.length > 0 && !guests[0].arrival_date) {
      setFormData((prev) => {
        const newGuests = [...prev.guests];
        newGuests[0].arrival_date = todayStr;
        newGuests[0].arrival_time = '12:00';
        newGuests[0].departure_date = tomorrowStr;
        newGuests[0].departure_time = '11:00';
        return { ...prev, guests: newGuests };
      });
    }
  }, [guests, setFormData, todayStr, tomorrowStr]);

  const addGuests = (count) => {
    const newGuests = Array.from({ length: count }).map(() => ({
      guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
      gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
      arrival_date: todayStr, arrival_time: '12:00', departure_date: tomorrowStr, departure_time: '11:00', food_preferences: [],
    }));

    setFormData((prev) => {
      const totalGuests = (prev.guests || []).length + count;
      const minRooms = Math.ceil(totalGuests / 2);
      return {
        ...prev,
        rooms_required: Math.max(Number(prev.rooms_required) || 1, minRooms),
        guests: [...(prev.guests || []), ...newGuests],
      };
    });
  };

  const removeGuest = (index) => {
    if (guests.length === 1) return;
    setFormData((prev) => ({ ...prev, guests: prev.guests.filter((_, i) => i !== index) }));
  };

  const copyGuestOneDatesToAll = () => {
    if (guests.length === 0) return;
    const g1 = guests[0];
    if (!g1.arrival_date || !g1.departure_date) {
      alert('Please select Arrival and Departure dates for Guest 1 first.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.map((g, i) =>
        i === 0 ? g : { ...g, arrival_date: g1.arrival_date, arrival_time: g1.arrival_time, departure_date: g1.departure_date, departure_time: g1.departure_time }
      ),
    }));
  };

  const calculateDuration = (arrivalDate, arrivalTime, departureDate, departureTime) => {
    if (!arrivalDate || !departureDate || !arrivalTime || !departureTime) return null;
    const start = new Date(`${arrivalDate}T${arrivalTime}`);
    const end = new Date(`${departureDate}T${departureTime}`);
    if (end <= start) return 'Invalid Duration';

    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0 && diffHours > 0) return `${diffDays} Days ${diffHours} Hours Stay`;
    if (diffDays > 0) return `${diffDays} Days Stay`;
    if (diffHours > 0) return `${diffHours} Hours Stay`;
    return '< 1 Hour Stay';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Accommodation Details
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Add guests and their specific food requests
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyGuestOneDatesToAll}
            className="flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors border border-emerald-200 shadow-sm"
          >
            <Calendar className="w-4 h-4 mr-1.5" /> Copy Guest 1 Dates
          </button>
          
          <div className="relative group inline-block">
            <button
              type="button"
              className="flex items-center text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-blue-200 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Room / Guests
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button
                type="button"
                onClick={() => addGuests(1)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center border-b border-slate-100"
              >
                <User className="w-4 h-4 mr-2 text-slate-400" /> Single Occupancy
              </button>
              <button
                type="button"
                onClick={() => addGuests(2)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center"
              >
                <Users className="w-4 h-4 mr-2 text-slate-400" /> Double Occupancy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {guests.map((guest, gIndex) => (
          <GuestCard 
            key={gIndex} 
            guest={guest} 
            gIndex={gIndex} 
            guests={guests} 
            setFormData={setFormData} 
            formData={formData} 
            todayStr={todayStr} 
            removeGuest={removeGuest} 
            calculateDuration={calculateDuration} 
          />
        ))}
      </div>
    </div>
  );
}
