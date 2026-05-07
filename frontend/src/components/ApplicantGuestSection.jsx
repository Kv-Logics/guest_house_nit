import { UserCircle, Fingerprint } from 'lucide-react';

export default function ApplicantGuestSection({ formData, handleChange }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
          <UserCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Identity Details</h3>
          <p className="text-sm text-slate-500 font-medium">Applicant and guest profile links</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Applicant ID (UUID)</label>
          <Fingerprint className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input required type="text" name="applicant_id" value={formData.applicant_id} onChange={handleChange} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. 123e4567-e89b..." />
        </div>
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Guest ID (UUID)</label>
          <Fingerprint className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input required type="text" name="guest_id" value={formData.guest_id} onChange={handleChange} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. 987f6543-e21b..." />
        </div>
      </div>
    </div>
  );
}