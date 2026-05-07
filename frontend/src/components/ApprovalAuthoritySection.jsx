import { Shield, Clock, UserCheck } from 'lucide-react';

export default function ApprovalAuthoritySection({ formData }) {
  const authorityMap = {
    '1': 'Director / Registrar',
    '2': 'Dean / HOD',
    '3': 'Sponsoring Faculty',
    '4': 'Registrar / HOD'
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative overflow-hidden">
      <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
        <Shield className="w-32 h-32 -mr-6 -mt-6" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Approval Authority</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <Clock className="w-5 h-5 text-blue-500 mr-3" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
            <p className="text-sm font-bold text-slate-800">Draft (Pre-submission)</p>
          </div>
        </div>
        <div key={formData.category_id} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center animate-fade-in transition-all">
          <UserCheck className="w-5 h-5 text-indigo-600 mr-3" />
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Approver for CAT-{formData.category_id}</p>
            <p className="text-sm font-extrabold text-indigo-900">{authorityMap[formData.category_id] || 'Not Assigned'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}