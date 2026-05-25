import { User, Trash2, Utensils, Clock } from 'lucide-react';

export default function GuestCard({ guest, gIndex, guests, setFormData, formData, todayStr, removeGuest, calculateDuration }) {
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
        {!['1', '2'].includes(formData.category_id) && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Relation to Applicant *</label>
            <input required type="text" value={guest.relation_to_applicant || ''} onChange={(e) => updateGuest('relation_to_applicant', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Parent, Colleague" />
          </div>
        )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select required value={guest.id_proof_type || ''} onChange={(e) => { updateGuest('id_proof_type', e.target.value); if (!e.target.value) updateGuest('id_proof_number', ''); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="" disabled>Select ID Type</option>
              <option value="Aadhar">Aadhar</option><option value="PAN">PAN</option><option value="Passport">Passport</option><option value="Voter ID">Voter ID</option><option value="Driving License">Driving License</option>
            </select>
            <input required type="text" value={guest.id_proof_number || ''} disabled={!guest.id_proof_type} onChange={(e) => updateGuest('id_proof_number', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder={guest.id_proof_type ? `Enter ${guest.id_proof_type} Number` : "Enter ID Number"} />
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
        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arrival Date</label><input type="date" required value={guest.arrival_date || ''} onChange={(e) => updateGuest('arrival_date', e.target.value)} min={todayStr} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" /></div>
        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arrival Time</label><input type="time" required value={guest.arrival_time || ''} onChange={(e) => updateGuest('arrival_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" /></div>
        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Date</label><input type="date" required value={guest.departure_date || ''} onChange={(e) => updateGuest('departure_date', e.target.value)} min={guest.arrival_date || todayStr} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" /></div>
        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Time</label><input type="time" required value={guest.departure_time || ''} onChange={(e) => updateGuest('departure_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" /></div>
      </div>

      {/* Food Requisition Matrix */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-slate-500 uppercase flex items-center"><Utensils className="w-3 h-3 mr-1" /> Meal Requirements</span><button type="button" onClick={addFoodDay} className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100">+ Add Meal Day</button></div>
        {guest.food_preferences.map((meal, fIndex) => (
          <div key={fIndex} className="flex gap-2 mb-2 items-center bg-white p-2 rounded-lg border border-slate-100">
            <input type="date" min={guest.arrival_date || todayStr} max={guest.departure_date || ''} value={meal.date} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].date = e.target.value; setFormData({ ...formData, guests: ng }); }} className="w-32 text-xs border rounded p-1 text-slate-700" />
            <label className="text-xs flex items-center cursor-pointer ml-1"><span className="mr-1.5 font-bold text-slate-600">B</span><input type="checkbox" checked={meal.breakfast > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].breakfast = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" /></label>
            <label className="text-xs flex items-center cursor-pointer ml-2"><span className="mr-1.5 font-bold text-slate-600">L</span><input type="checkbox" checked={meal.lunch > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].lunch = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" /></label>
            <label className="text-xs flex items-center cursor-pointer ml-2"><span className="mr-1.5 font-bold text-slate-600">D</span><input type="checkbox" checked={meal.dinner > 0} onChange={(e) => { const ng = [...guests]; ng[gIndex].food_preferences[fIndex].dinner = e.target.checked ? 1 : 0; setFormData({ ...formData, guests: ng }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" /></label>
            <button type="button" onClick={() => removeFoodDay(fIndex)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 ml-auto rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}