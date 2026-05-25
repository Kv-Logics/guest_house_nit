import { ShieldAlert } from 'lucide-react';

const getDesignation = (a) => {
  const roleStr = String(a.role).toUpperCase();
  let designation = '';
  if (roleStr === 'DIRECTOR') designation = 'Director';
  else if (roleStr === 'REGISTRAR') designation = 'Registrar';
  else designation = `${roleStr} (${a.department})`;

  if (a.full_name) {
    return `${a.full_name} - ${designation}`;
  }
  return designation;
};

export default function ApproverSelection({ approverSearch, setApproverSearch, isOpen, setIsOpen, authorities, setFormData }) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-3">
        <ShieldAlert className="w-5 h-5 mr-2 text-rose-500" /> Approval Authority
      </h3>
      <div className="relative">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Select Approver (Required) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Search by designation or department..."
          value={approverSearch}
          onChange={(e) => {
            setApproverSearch(e.target.value);
            setFormData((prev) => ({ ...prev, assigned_approver_id: '' }));
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full p-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 bg-slate-50"
        />
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {authorities
              .filter((a) => getDesignation(a).toLowerCase().includes(approverSearch.toLowerCase()))
              .map((a) => (
                <div
                  key={a.user_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFormData((prev) => ({ ...prev, assigned_approver_id: a.user_id }));
                    setApproverSearch(getDesignation(a));
                    setIsOpen(false);
                  }}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <p className="font-bold text-slate-800">{getDesignation(a)}</p>
                  <p className="text-xs text-slate-500">Approval Authority</p>
                </div>
              ))}
            {authorities.length === 0 && <div className="p-3 text-sm text-slate-500">No authorities available for this category.</div>}
          </div>
        )}
      </div>
    </div>
  );
}