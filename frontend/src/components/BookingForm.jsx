import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MultiGuestSection from './MultiGuestSection';
import CategoryVisitSection from './CategoryVisitSection';
import StayDetailsSection from './StayDetailsSection';
import UndertakingSection from './UndertakingSection';
import { AlertCircle, Eye, FileText, ShieldAlert } from 'lucide-react';

export default function BookingForm({ formData, setFormData, user, authorities = [] }) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState('');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);

  // Pre-fill the search bar if coming back from the Preview Page
  useEffect(() => {
      if (formData.assigned_approver_id && authorities.length > 0) {
          const a = authorities.find(auth => auth.user_id === formData.assigned_approver_id);
          if (a) {
              setApproverSearch(`${a.full_name} (${a.department} - ${String(a.role).toUpperCase()})`);
          }
      }
  }, [formData.assigned_approver_id, authorities]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!guidelinesAccepted) {
      setLocalError('You must review and acknowledge the official guidelines before proceeding.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const arrival = new Date(`${formData.arrival_date}T${formData.arrival_time}`);
    const departure = new Date(`${formData.departure_date}T${formData.departure_time}`);

    if (arrival < new Date(new Date().setHours(0,0,0,0))) {
      setLocalError('Arrival date cannot be in the past.');
      return;
    }
    if (departure <= arrival) {
      setLocalError('Departure date & time must be strictly after arrival.');
      return;
    }
    if (formData.category_id === '2' && !formData.project_code.trim()) {
      setLocalError('Project code is strictly required for CAT II bookings.');
      return;
    }

    // Category & Visit Type Compatibility Rules
    if ((formData.category_id === '1' || formData.category_id === '2') && formData.visit_type !== 'official') {
      setLocalError(`CAT-${formData.category_id === '1' ? 'I' : 'II'} strictly requires the Visit Type to be "Official". Please update the dropdown.`);
      return;
    }
    if (formData.category_id === '4' && formData.visit_type !== 'personal') {
      setLocalError('CAT-IV strictly requires the Visit Type to be "Personal". Please update the dropdown.');
      return;
    }

    // Food Requisition Date Validation
    for (let i = 0; i < formData.guests.length; i++) {
      const guest = formData.guests[i];
      for (const meal of guest.food_preferences) {
        if (!meal.date) {
          setLocalError(`Please specify a valid calendar date for Guest ${i + 1}'s meal request, or remove the empty row.`);
          return;
        }
      }
    }

    if (user.role === 'student' && formData.category_id !== '3') {
      setLocalError('Students are strictly restricted to CAT-III bookings for Parents/Guardians.');
      return;
    }

    if (!formData.assigned_approver_id) {
      setLocalError('You must select an Approval Authority to route your application.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    /* --- UNDERTAKING TEMPORARILY DISABLED ---
    if (!formData.undertaking_1 || !formData.undertaking_2 || !formData.undertaking_3 || !formData.undertaking_4 || !formData.undertaking_5) {
      setLocalError('You must check and accept all Undertaking conditions to proceed.');
      return;
    }
    ---------------------------------------- */

    // Proceed to preview page with form data
    navigate('/preview', { state: { formData, user, authorities } });
  };

  return (
    <div>
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 relative">
      
      <div className="relative z-10 border-b border-slate-100 pb-6 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Application Details</h2>
        <p className="text-slate-500 mt-2 font-medium">Please fill out the form below carefully to request accommodation.</p>
      </div>

      {localError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-8 rounded-r-xl shadow-sm text-red-800 text-sm animate-fade-in flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
          <span className="font-medium">{localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative z-10 flex flex-col space-y-10">
        
        {/* Official Guidelines Acknowledgment */}
        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${guidelinesAccepted ? 'bg-emerald-50 border-emerald-500/30' : 'bg-amber-50 border-amber-400 shadow-md shadow-amber-100/50'}`}>
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
            <FileText className={`w-5 h-5 mr-2 ${guidelinesAccepted ? 'text-emerald-500' : 'text-amber-500'}`} />
            Official NITT Guest House Guidelines
          </h3>
          <div className="text-sm text-slate-700 space-y-3 mb-5 bg-white/60 p-4 rounded-xl">
            <p><strong>Category I:</strong> Institute Guests, Ministry Officials, VIPs. <em className="text-slate-500">(Payment by Institute)</em></p>
            <p><strong>Category II:</strong> Official project visitors, examiners, external experts. <em className="text-slate-500">(Project code strictly required)</em></p>
            <p><strong>Category III:</strong> NITT Faculty/Staff/Students booking for parents or personal guests. <em className="text-slate-500">(Payment by Guest or Faculty)</em></p>
            <p><strong>Category IV:</strong> Alumni and external individuals. <em className="text-slate-500">(Subject to extreme availability)</em></p>
          </div>
          <label className="flex items-start sm:items-center cursor-pointer group">
            <input type="checkbox" checked={guidelinesAccepted} onChange={(e) => setGuidelinesAccepted(e.target.checked)} className="w-5 h-5 mt-0.5 sm:mt-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer" />
            <span className={`ml-3 font-bold transition-colors select-none ${guidelinesAccepted ? 'text-emerald-800' : 'text-amber-900 group-hover:text-amber-700'}`}>
              I have reviewed and understood the official guidelines. Proceed to application.
            </span>
          </label>
        </div>

        <div className={`transition-all duration-500 space-y-10 ${guidelinesAccepted ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale-[30%] pointer-events-none translate-y-2'}`}>
          <StayDetailsSection formData={formData} handleChange={handleChange} />
        <CategoryVisitSection formData={formData} handleChange={handleChange} setFormData={setFormData} />
          <MultiGuestSection formData={formData} setFormData={setFormData} user={user} />
          {/* <UndertakingSection formData={formData} handleChange={handleChange} /> */}
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-3">
              <ShieldAlert className="w-5 h-5 mr-2 text-rose-500" /> Approval Authority
            </h3>
            <div className="relative">
               <label className="block text-sm font-bold text-slate-700 mb-2">Select Approver (Required) <span className="text-red-500">*</span></label>
               <input 
                 type="text" 
                 placeholder="Search by name or department..." 
                 value={approverSearch}
                 onChange={(e) => {
                     setApproverSearch(e.target.value);
                     setFormData(prev => ({...prev, assigned_approver_id: ''}));
                     setIsApproverDropdownOpen(true);
                 }}
                 onFocus={() => setIsApproverDropdownOpen(true)}
                 onBlur={() => setTimeout(() => setIsApproverDropdownOpen(false), 200)}
                 className="w-full p-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 bg-slate-50"
               />
               {isApproverDropdownOpen && (
                 <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {authorities.filter(a => a.full_name.toLowerCase().includes(approverSearch.toLowerCase()) || a.department.toLowerCase().includes(approverSearch.toLowerCase())).map(a => (
                        <div key={a.user_id} onMouseDown={(e) => { e.preventDefault(); setFormData(prev => ({...prev, assigned_approver_id: a.user_id})); setApproverSearch(`${a.full_name} (${a.department} - ${String(a.role).toUpperCase()})`); setIsApproverDropdownOpen(false); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0">
                            <p className="font-bold text-slate-800">{a.full_name}</p>
                            <p className="text-xs text-slate-500">{a.department} - {String(a.role).toUpperCase()}</p>
                        </div>
                    ))}
                    {authorities.length === 0 && <div className="p-3 text-sm text-slate-500">No authorities available for this category.</div>}
                 </div>
               )}
            </div>
          </div>
        </div>

          <div className="pt-8 border-t border-slate-100">
          <button type="submit" className="w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Eye className="w-5 h-5 mr-2" /> Review Application Preview
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}