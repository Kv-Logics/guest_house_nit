import { ClipboardList, Calendar, Users, Info, User, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function RoomSummaryCard({ formData, user }) {
  let durationDays = 0;
  if (formData.arrival_date && formData.departure_date) {
    const arrival = new Date(`${formData.arrival_date}T${formData.arrival_time || '00:00'}`);
    const departure = new Date(`${formData.departure_date}T${formData.departure_time || '00:00'}`);
    if (departure > arrival) {
      const diffTime = Math.abs(departure - arrival);
      durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const guests = formData.guests || [];
  const totalMeals = guests.reduce((total, g) => total + g.food_preferences.reduce((acc, curr) => acc + Number(curr.breakfast || 0) + Number(curr.lunch || 0) + Number(curr.dinner || 0), 0), 0);
  const guestNames = guests.map(g => g.guest_name).filter(Boolean).join(', ');

  const catMap = { '1': 'CAT I (Priority)', '2': 'CAT II (Project)', '3': 'CAT III (Internal)', '4': 'CAT IV (Personal)' };
  
  const authorityMap = {
    '1': 'Director / Registrar',
    '2': 'Dean / HOD',
    '3': 'Sponsoring Faculty',
    '4': 'Registrar / HOD'
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
      
      <h3 className="text-2xl font-extrabold text-slate-800 mb-8 flex items-center mt-2 tracking-tight">
        <ClipboardList className="w-6 h-6 mr-2.5 text-indigo-500" />
        Live Summary
      </h3>
      
      <div className="space-y-6 divide-y divide-slate-100">
        <div className="flex justify-between items-center pb-2">
          <span className="text-sm font-semibold text-slate-500 flex items-center"><User className="w-4 h-4 mr-1.5" /> Guests</span>
          <span className="font-bold text-slate-800 truncate max-w-[150px]">{guestNames || 'Not Entered'}</span>
        </div>
        
        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500">Category</span>
          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-xs tracking-wide">{catMap[formData.category_id]}</span>
        </div>
        
        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500">Visit Type</span>
          <span className="font-bold text-slate-800 capitalize bg-slate-100 px-3 py-1 rounded-lg text-xs tracking-wide">{formData.visit_type}</span>
        </div>

        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500 flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> Duration</span>
          <span className="font-bold text-slate-800">
            {durationDays > 0 ? `${durationDays} Night${durationDays > 1 ? 's' : ''}` : '-'}
          </span>
        </div>

        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500 flex items-center"><Users className="w-4 h-4 mr-1.5" /> Capacity</span>
          <span className="font-extrabold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">{formData.rooms_required} Room(s) / {guests.length} Guest(s)</span>
        </div>

        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500">Billing Resp.</span>
          <span className="font-bold text-slate-800 capitalize bg-slate-100 px-3 py-1 rounded-lg text-xs tracking-wide">{formData.category_id === '1' ? 'Institute' : (formData.category_id === '2' ? formData.payment_responsibility : 'Guest')}</span>
        </div>

        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500">Food Requests</span>
          <span className="font-bold text-slate-800">{totalMeals > 0 ? `${totalMeals} Meals Total` : 'None'}</span>
        </div>

        <div className="flex justify-between items-center pt-6">
          <span className="text-sm font-semibold text-slate-500 flex items-center"><ShieldAlert className="w-4 h-4 mr-1.5 text-amber-500" /> Approver</span>
          <span className="font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg text-xs tracking-wide border border-amber-100">{authorityMap[formData.category_id]}</span>
        </div>
      </div>

      <div className="mt-10 bg-blue-50/80 p-4 rounded-xl text-xs font-semibold text-indigo-800 text-center leading-relaxed border border-blue-100 flex items-start">
        <Info className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5 text-blue-500" />
        <span className="text-left">Final allocation relies on managerial approval and category compliance checks.</span>
      </div>
    </div>
  );
}