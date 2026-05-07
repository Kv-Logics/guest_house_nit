import { UserPlus, User, Trash2, Utensils, Plus, Copy } from 'lucide-react';

export default function MultiGuestSection({ formData, setFormData, user }) {
  const guests = formData.guests || [];

  const addGuest = () => {
    setFormData(prev => ({
      ...prev,
      guests: [...prev.guests, {
        guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
          gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
        food_preferences: []
      }]
    }));
  };

  const removeGuest = (index) => {
    if (guests.length === 1) return;
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.filter((_, i) => i !== index)
    }));
  };

  const updateGuest = (index, field, value) => {
    setFormData(prev => {
      const newGuests = [...prev.guests];
      newGuests[index][field] = value;
      return { ...prev, guests: newGuests };
    });
  };

  const addFoodDay = (guestIndex) => {
    setFormData(prev => {
      const newGuests = [...prev.guests];
      newGuests[guestIndex].food_preferences.push({ date: prev.arrival_date || '', breakfast: 0, lunch: 0, dinner: 0, remarks: '' });
      return { ...prev, guests: newGuests };
    });
  };

  const removeFoodDay = (guestIndex, foodIndex) => {
    setFormData(prev => {
      const newGuests = [...prev.guests];
      newGuests[guestIndex].food_preferences = newGuests[guestIndex].food_preferences.filter((_, i) => i !== foodIndex);
      return { ...prev, guests: newGuests };
    });
  };

  const bookForMyself = () => {
    if (user && guests.length > 0) {
      updateGuest(0, 'guest_name', user.full_name || '');
      updateGuest(0, 'email', user.email || '');
      updateGuest(0, 'relation_to_applicant', 'Self');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Accommodation Details</h3>
            <p className="text-sm text-slate-500 font-medium">Add guests and their specific food requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={bookForMyself} className="flex items-center text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200 shadow-sm">
            <Copy className="w-4 h-4 mr-1.5" /> Book for Myself
          </button>
          <button type="button" onClick={addGuest} className="flex items-center text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-blue-200 shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Guest
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {guests.map((guest, gIndex) => (
          <div key={gIndex} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-slate-400" /> Guest {gIndex + 1}</h4>
              {guests.length > 1 && (
                <button type="button" onClick={() => removeGuest(gIndex)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                <input required type="text" value={guest.guest_name} onChange={(e) => updateGuest(gIndex, 'guest_name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Relation to Applicant *</label>
                <input required type="text" value={guest.relation_to_applicant} onChange={(e) => updateGuest(gIndex, 'relation_to_applicant', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Parent, Colleague" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                <input type="email" value={guest.email} onChange={(e) => updateGuest(gIndex, 'email', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="guest@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Age & Gender</label>
                <div className="flex gap-2">
                  <input required type="number" value={guest.age} onChange={(e) => updateGuest(gIndex, 'age', e.target.value)} className="w-16 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Age" />
                  <select value={guest.gender} onChange={(e) => updateGuest(gIndex, 'gender', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number *</label>
                <input required type="tel" value={guest.phone} onChange={(e) => updateGuest(gIndex, 'phone', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ID Proof (Type & Number) *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select required value={guest.id_proof_type || ''} onChange={(e) => {
                      updateGuest(gIndex, 'id_proof_type', e.target.value);
                      if (!e.target.value) updateGuest(gIndex, 'id_proof_number', '');
                    }} className={`${guest.id_proof_type ? 'w-full sm:w-1/3' : 'w-full'} px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 transition-all`}>
                    <option value="" disabled>Select ID Type</option>
                    <option value="Aadhar">Aadhar</option>
                    <option value="PAN">PAN</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                  {guest.id_proof_type && (
                    <input required type="text" value={guest.id_proof_number} onChange={(e) => updateGuest(gIndex, 'id_proof_number', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 animate-fade-in" placeholder={`Enter ${guest.id_proof_type} Number`} />
                  )}
                </div>
              </div>
            </div>

            {/* Guest Food Area */}
            <div className="mt-4 pt-4 border-t border-slate-200">
               <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-bold text-slate-500 uppercase flex items-center"><Utensils className="w-3 h-3 mr-1" /> Meal Requirements</span>
                 <button type="button" onClick={() => addFoodDay(gIndex)} className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100">+ Add Meal Day</button>
               </div>
               {/* Render food table here similar to old FoodRequisition (minified) */}
               {guest.food_preferences.map((meal, fIndex) => (
                 <div key={fIndex} className="flex gap-2 mb-2 items-center bg-white p-2 rounded-lg border border-slate-100">
                   <input type="date" min={formData.arrival_date} max={formData.departure_date} value={meal.date} onChange={(e)=>{const ng=[...guests]; ng[gIndex].food_preferences[fIndex].date = e.target.value; setFormData({...formData, guests:ng})}} className="w-32 text-xs border rounded p-1 text-slate-700"/>
                   <label className="text-xs flex items-center cursor-pointer ml-1"><span className="mr-1.5 font-bold text-slate-600">B</span><input type="checkbox" checked={meal.breakfast > 0} onChange={(e)=>{const ng=[...guests]; ng[gIndex].food_preferences[fIndex].breakfast = e.target.checked ? 1 : 0; setFormData({...formData, guests:ng})}} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"/></label>
                   <label className="text-xs flex items-center cursor-pointer ml-2"><span className="mr-1.5 font-bold text-slate-600">L</span><input type="checkbox" checked={meal.lunch > 0} onChange={(e)=>{const ng=[...guests]; ng[gIndex].food_preferences[fIndex].lunch = e.target.checked ? 1 : 0; setFormData({...formData, guests:ng})}} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"/></label>
                   <label className="text-xs flex items-center cursor-pointer ml-2"><span className="mr-1.5 font-bold text-slate-600">D</span><input type="checkbox" checked={meal.dinner > 0} onChange={(e)=>{const ng=[...guests]; ng[gIndex].food_preferences[fIndex].dinner = e.target.checked ? 1 : 0; setFormData({...formData, guests:ng})}} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"/></label>
                  <button type="button" onClick={() => removeFoodDay(gIndex, fIndex)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 ml-auto rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}