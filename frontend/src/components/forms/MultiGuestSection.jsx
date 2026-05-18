import { UserPlus, User, Trash2, Utensils, Plus, BedDouble, DoorOpen, ClipboardList } from 'lucide-react';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// EXTRACTED SUB-COMPONENT: Keeps the main section highly readable!
// ---------------------------------------------------------------------------
const GuestCard = ({ guest, rIndex, gIndex, rooms, setFormData, formData, removeGuest }) => {
  const updateGuest = (field, value) => {
    setFormData((prev) => {
      const newRooms = [...prev.rooms];
      const newGuests = [...newRooms[rIndex].guests];
      newGuests[gIndex] = { ...newGuests[gIndex], [field]: value };
      newRooms[rIndex] = { ...newRooms[rIndex], guests: newGuests };
      return { ...prev, rooms: newRooms };
    });
  };

  const addFoodDay = () => {
    setFormData((prev) => {
      const newRooms = [...prev.rooms];
      const newGuests = [...newRooms[rIndex].guests];
      const newFood = [...newGuests[gIndex].food_preferences, { date: formData.arrival_date || '', breakfast: 0, lunch: 0, dinner: 0, remarks: '' }];
      newGuests[gIndex] = { ...newGuests[gIndex], food_preferences: newFood };
      newRooms[rIndex] = { ...newRooms[rIndex], guests: newGuests };
      return { ...prev, rooms: newRooms };
    });
  };

  const removeFoodDay = (foodIndex) => {
    setFormData((prev) => {
      const newRooms = [...prev.rooms];
      const newGuests = [...newRooms[rIndex].guests];
      newGuests[gIndex] = { ...newGuests[gIndex], food_preferences: newGuests[gIndex].food_preferences.filter((_, i) => i !== foodIndex) };
      newRooms[rIndex] = { ...newRooms[rIndex], guests: newGuests };
      return { ...prev, rooms: newRooms };
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 relative mb-4 shadow-sm">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" /> Guest {gIndex + 1}
        </h4>
        <button type="button" onClick={() => removeGuest(rIndex, gIndex)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center text-xs font-bold">
          <Trash2 className="w-4 h-4 mr-1" /> Remove
        </button>
      </div>

      {/* Guest Details Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
          <input required type="text" value={guest.guest_name} onChange={(e) => updateGuest('guest_name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
        </div>
        {formData.category_id !== '2' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Relation to Applicant *</label>
            <input required={formData.category_id !== '2'} type="text" value={guest.relation_to_applicant || ''} onChange={(e) => updateGuest('relation_to_applicant', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="e.g. Parent, Colleague" />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
          <input type="email" value={guest.email} onChange={(e) => updateGuest('email', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="guest@institute.edu" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Age & Gender</label>
          <div className="flex gap-2">
            <input required type="number" value={guest.age} onChange={(e) => updateGuest('age', e.target.value)} className="w-16 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="Age" />
            <select value={guest.gender} onChange={(e) => updateGuest('gender', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number *</label>
          <input required type="tel" value={guest.phone} onChange={(e) => updateGuest('phone', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">ID Proof (Type & Number) *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select required value={guest.id_proof_type || ''} onChange={(e) => { updateGuest('id_proof_type', e.target.value); if (!e.target.value) updateGuest('id_proof_number', ''); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors">
              <option value="" disabled>Select ID</option>
              <option value="Aadhar">Aadhar</option><option value="PAN">PAN</option><option value="Passport">Passport</option><option value="Voter ID">Voter ID</option><option value="Driving License">Driving License</option>
            </select>
            <input required type="text" value={guest.id_proof_number || ''} disabled={!guest.id_proof_type} onChange={(e) => updateGuest('id_proof_number', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder={guest.id_proof_type ? `Enter ${guest.id_proof_type} Number` : "Enter ID Number"} />
          </div>
        </div>
      </div>

      {/* Guest Stay Duration Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 border-t border-slate-100 pt-4">
        <div className="sm:col-span-4 flex flex-wrap gap-2 justify-between items-start sm:items-center">
          <div>
            <p className="text-xs font-bold text-slate-700">Guest Stay Duration <span className="text-red-500">*</span></p>
            <p className="text-[10px] text-slate-500">Define the exact check-in and check-out dates for this specific guest.</p>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arrival Date</label>
          <input type="date" required value={guest.arrival_date || ''} onChange={(e) => updateGuest('arrival_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs bg-slate-50 focus:bg-white" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arrival Time</label>
          <input type="time" required value={guest.arrival_time || '12:00'} onChange={(e) => updateGuest('arrival_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs bg-slate-50 focus:bg-white" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departure Date</label>
          <input type="date" required value={guest.departure_date || ''} onChange={(e) => updateGuest('departure_date', e.target.value)} min={guest.arrival_date || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs bg-slate-50 focus:bg-white" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departure Time</label>
          <input type="time" required value={guest.departure_time || '12:00'} onChange={(e) => updateGuest('departure_time', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs bg-slate-50 focus:bg-white" />
        </div>
      </div>

      {/* Food Requisition Matrix */}
      <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
            <Utensils className="w-3 h-3 mr-1" /> Meal Requirements
          </span>
          <button type="button" onClick={addFoodDay} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 border border-orange-200 shadow-sm transition-colors">+ Add Meal Day</button>
        </div>
        {guest.food_preferences.map((meal, fIndex) => (
          <div key={fIndex} className="flex gap-3 mb-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <input type="date" min={guest.arrival_date || ''} max={guest.departure_date || ''} value={meal.date} onChange={(e) => { const ng = [...rooms[rIndex].guests]; ng[gIndex].food_preferences[fIndex].date = e.target.value; const nr = [...rooms]; nr[rIndex].guests = ng; setFormData({ ...formData, rooms: nr }); }} className="w-36 text-xs border border-slate-300 rounded-md p-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-orange-500" />
            <label className="text-xs flex items-center cursor-pointer bg-white px-2 py-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
              <span className="mr-2 font-extrabold text-slate-600">B</span>
              <input type="checkbox" checked={meal.breakfast > 0} onChange={(e) => { const ng = [...rooms[rIndex].guests]; ng[gIndex].food_preferences[fIndex].breakfast = e.target.checked ? 1 : 0; const nr = [...rooms]; nr[rIndex].guests = ng; setFormData({ ...formData, rooms: nr }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <label className="text-xs flex items-center cursor-pointer bg-white px-2 py-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
              <span className="mr-2 font-extrabold text-slate-600">L</span>
              <input type="checkbox" checked={meal.lunch > 0} onChange={(e) => { const ng = [...rooms[rIndex].guests]; ng[gIndex].food_preferences[fIndex].lunch = e.target.checked ? 1 : 0; const nr = [...rooms]; nr[rIndex].guests = ng; setFormData({ ...formData, rooms: nr }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <label className="text-xs flex items-center cursor-pointer bg-white px-2 py-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
              <span className="mr-2 font-extrabold text-slate-600">D</span>
              <input type="checkbox" checked={meal.dinner > 0} onChange={(e) => { const ng = [...rooms[rIndex].guests]; ng[gIndex].food_preferences[fIndex].dinner = e.target.checked ? 1 : 0; const nr = [...rooms]; nr[rIndex].guests = ng; setFormData({ ...formData, rooms: nr }); }} className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
            </label>
            <button type="button" onClick={() => removeFoodDay(fIndex)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 ml-auto rounded-lg transition-colors border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4" /></button>
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
  const rooms = formData.rooms || [];

  const addRoom = () => {
    setFormData((prev) => ({
      ...prev,
      rooms: [
        ...(prev.rooms || []),
        {
          guests: [{
            guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
            gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
            food_preferences: [],
          }],
          extra_bed: false
        }
      ]
    }));
  };

  const removeRoom = (rIndex) => {
    if (rooms.length === 1) {
      alert("At least one room is required.");
      return;
    }
    setFormData((prev) => ({ ...prev, rooms: prev.rooms.filter((_, i) => i !== rIndex) }));
  };

  const addGuestToRoom = (rIndex) => {
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      newRooms[rIndex].guests = [
        ...newRooms[rIndex].guests,
        {
          guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
          gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '', food_preferences: [],
        }
      ];
      return { ...prev, rooms: newRooms };
    });
  };

  const removeGuest = (rIndex, gIndex) => {
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      newRooms[rIndex].guests = newRooms[rIndex].guests.filter((_, i) => i !== gIndex);
      if (newRooms[rIndex].guests.length === 0) {
        newRooms.splice(rIndex, 1);
      } else if (newRooms[rIndex].guests.length <= 2) {
        newRooms[rIndex].extra_bed = false;
      }
      if (newRooms.length === 0) {
        newRooms.push({
          guests: [{
            guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
            gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
            food_preferences: [],
          }],
          extra_bed: false
        });
      }
      return { ...prev, rooms: newRooms };
    });
  };

  const toggleExtraBed = (rIndex) => {
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      if (!newRooms[rIndex].extra_bed) {
        newRooms[rIndex].extra_bed = true;
        newRooms[rIndex].guests = [
          ...newRooms[rIndex].guests,
          {
            guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
            gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '', food_preferences: [],
          }
        ];
      } else {
        newRooms[rIndex].extra_bed = false;
        if (newRooms[rIndex].guests.length > 2) {
          newRooms[rIndex].guests = newRooms[rIndex].guests.slice(0, 2);
        }
      }
      return { ...prev, rooms: newRooms };
    });
  };

  const totalSingle = rooms.filter(r => r.guests.length === 1).length;
  const totalDouble = rooms.filter(r => r.guests.length >= 2).length;
  const totalGuests = rooms.reduce((acc, r) => acc + r.guests.length, 0);
  const totalExtraBeds = rooms.filter(r => r.extra_bed).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Room & Guest Allocation
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Allocate rooms, add guests, and request extra beds
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {rooms.map((room, rIndex) => (
          <div key={rIndex} className="bg-slate-50/50 border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center">
                <DoorOpen className="w-5 h-5 mr-2 text-indigo-500" /> Room {rIndex + 1}
                <span className={`ml-3 text-xs px-2.5 py-1 rounded-full border ${room.guests.length === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                  {room.guests.length === 1 ? 'Single Occupancy' : 'Double Occupancy'}
                </span>
                {room.extra_bed && (
                  <span className="ml-2 text-xs px-2.5 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                    + Extra Bed
                  </span>
                )}
              </h3>
              {rooms.length > 1 && (
                <button type="button" onClick={() => removeRoom(rIndex)} className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
                  Remove Room
                </button>
              )}
            </div>

            <div className="space-y-4">
              {room.guests.map((guest, gIndex) => (
                <GuestCard 
                  key={gIndex} 
                  guest={guest}
                  rIndex={rIndex}
                  gIndex={gIndex} 
                  rooms={rooms} 
                  setFormData={setFormData} 
                  formData={formData} 
                  removeGuest={removeGuest} 
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-200">
              {room.guests.length === 1 && (
                <button type="button" onClick={() => addGuestToRoom(rIndex)} className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-100 border border-blue-200 shadow-sm transition-colors">
                  <UserPlus className="w-4 h-4 mr-2" /> Add Another Guest (Double)
                </button>
              )}
              {room.guests.length === 2 && !room.extra_bed && (
                <button type="button" onClick={() => toggleExtraBed(rIndex)} className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl hover:bg-amber-100 border border-amber-200 shadow-sm transition-colors">
                  <Plus className="w-4 h-4 mr-2" /> Add Extra Bed
                </button>
              )}
              {room.extra_bed && (
                <button type="button" onClick={() => toggleExtraBed(rIndex)} className="flex items-center px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 border border-slate-300 shadow-sm transition-colors">
                  <Trash2 className="w-4 h-4 mr-2" /> Remove Extra Bed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button type="button" onClick={addRoom} className="flex items-center px-6 py-3 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-900 shadow-sm transition-colors">
          <DoorOpen className="w-5 h-5 mr-2" /> Add Another Room
        </button>
      </div>

      {/* Real-time Summary Bar */}
      <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0">
          <h4 className="text-base font-extrabold text-indigo-900 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-indigo-600" /> Booking Summary
          </h4>
          <p className="text-sm text-indigo-700 font-medium">This is what will be evaluated for billing.</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-black text-indigo-700">{rooms.length}</p>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Rooms</p>
            <p className="text-[10px] font-bold text-indigo-400 mt-1">{totalSingle} Single, {totalDouble} Double</p>
          </div>
          <div className="w-px bg-indigo-200"></div>
          <div>
            <p className="text-2xl font-black text-indigo-700">{totalGuests}</p>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Guests</p>
          </div>
          <div className="w-px bg-indigo-200"></div>
          <div>
            <p className="text-2xl font-black text-indigo-700">{totalExtraBeds}</p>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Extra Beds</p>
          </div>
        </div>
      </div>
    </div>
  );
}
