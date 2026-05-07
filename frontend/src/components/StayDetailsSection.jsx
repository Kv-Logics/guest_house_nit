import { CalendarClock, BedDouble, Users } from 'lucide-react';

export default function StayDetailsSection({ formData, handleChange }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Arrival & Accommodation Details</h3>
          <p className="text-sm text-slate-500 font-medium">Timeline and requested accommodations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Expected Arrival</label>
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" name="arrival_date" value={formData.arrival_date} onChange={handleChange} className="block w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <input required type="time" name="arrival_time" value={formData.arrival_time} onChange={handleChange} className="block w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Expected Departure</label>
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" name="departure_date" value={formData.departure_date} onChange={handleChange} className="block w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <input required type="time" name="departure_time" value={formData.departure_time} onChange={handleChange} className="block w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Rooms Required</label>
          <BedDouble className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input required type="number" min="1" name="rooms_required" value={formData.rooms_required} onChange={handleChange} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>
    </div>
  );
}