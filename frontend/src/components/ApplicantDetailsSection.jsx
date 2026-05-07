import { BadgeCheck, Shield, User } from 'lucide-react';

export default function ApplicantDetailsSection({ user }) {
  if (!user) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 w-64 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 transition-all hover:bg-white hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-3">
        <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shadow-sm border border-teal-100">
          <BadgeCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Applicant Details</h3>
          <p className="text-[10px] text-slate-500 font-medium">Auto-detected session</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center"><User className="w-3 h-3 mr-1" /> Name & Email</p>
          <p className="text-xs font-semibold text-slate-800 truncate" title={user.full_name}>{user.full_name}</p>
          <p className="text-[10px] text-slate-500 truncate" title={user.email}>{user.email}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Role & Department</p>
          <p className="text-[10px] font-semibold text-slate-800 capitalize bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded inline-block truncate max-w-full">{user.role.replace(/_/g, ' ')}</p>
          <p className="text-[10px] text-slate-500 truncate mt-1" title={`${user.department} | ${user.designation}`}>{user.department} | {user.designation}</p>
        </div>
      </div>
    </div>
  );
}