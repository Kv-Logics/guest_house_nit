import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MultiGuestSection from './MultiGuestSection';
import CategoryVisitSection from './CategoryVisitSection';
import StayDetailsSection from './StayDetailsSection';
import ApproverSelection from './ApproverSelection';
import { AlertCircle, Eye, ShieldCheck } from 'lucide-react';

// MAIN COMPONENT EXPORT
export default function BookingForm({ formData, setFormData, user, authorities = [], tariffs = [] }) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState('');
  const [undertakingAccepted, setUndertakingAccepted] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);

  const isAdmin = ['super_admin', 'guest_house_admin'].includes(user?.role);

  // Pre-fill the search bar if coming back from the Preview Page
  useEffect(() => {
    if (formData.assigned_approver_id && authorities.length > 0) {
      const a = authorities.find((auth) => auth.user_id === formData.assigned_approver_id);
      if (a) {
        setApproverSearch(`${a.full_name} (${a.department} - ${String(a.role).toUpperCase()})`);
      }
    }
  }, [formData.assigned_approver_id, authorities]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!undertakingAccepted) {
      setLocalError('You must review and acknowledge the undertaking before proceeding.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.purpose_of_visit || formData.purpose_of_visit.trim().length < 5) {
      setLocalError('Purpose of visit must be at least 5 characters long.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const flatGuests = (formData.rooms || []).flatMap(r => r.guests);
    
    if (flatGuests.length === 0) {
      setLocalError('You must add at least one guest.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    for (let i = 0; i < flatGuests.length; i++) {
      const guest = flatGuests[i];
      if (!guest.arrival_date || !guest.departure_date) {
        setLocalError(`Please specify stay dates for Guest ${i + 1}.`);
        return;
      }
      const arr = new Date(`${guest.arrival_date}T${guest.arrival_time || '12:00'}`);
      const dep = new Date(`${guest.departure_date}T${guest.departure_time || '12:00'}`);
      if (arr < new Date(new Date().setHours(0, 0, 0, 0))) {
        setLocalError(`Guest ${i + 1} arrival date cannot be in the past.`);
        return;
      }
      if (dep <= arr) {
        setLocalError(`Guest ${i + 1} departure must be strictly after arrival.`);
        return;
      }
    }

    // Category & Visit Type Compatibility Rules
    if (
      (formData.category_id === '1' || formData.category_id === '2') &&
      formData.visit_type !== 'official'
    ) {
      setLocalError(
        `CAT-${formData.category_id === '1' ? 'I' : 'II'} strictly requires the Visit Type to be "Official". Please update the dropdown.`
      );
      return;
    }
    if (formData.category_id === '4' && formData.visit_type !== 'personal') {
      setLocalError(
        'CAT-IV strictly requires the Visit Type to be "Personal". Please update the dropdown.'
      );
      return;
    }

    // Food Requisition Date Validation
    for (let i = 0; i < flatGuests.length; i++) {
      const guest = flatGuests[i];
      for (const meal of guest.food_preferences) {
        if (!meal.date) {
          setLocalError(
            `Please specify a valid calendar date for Guest ${i + 1}'s meal request, or remove the empty row.`
          );
          return;
        }
      }
    }

    if (user.role === 'student' && formData.category_id !== '3') {
      setLocalError('Students are strictly restricted to CAT-III bookings for Parents/Guardians.');
      return;
    }

    if ((!isAdmin || formData.category_id === '2') && !formData.assigned_approver_id) {
      setLocalError('You must select an Approval Authority to route your application.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Proceed to preview page with form data
    navigate('/preview', { state: { formData, user, authorities, tariffs } });
  };

  return (
    <div>
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 relative">
        <div className="relative z-10 border-b border-slate-100 pb-6 mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Application Details
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Please fill out the form below carefully to request accommodation.
          </p>
        </div>

        {localError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-8 rounded-r-xl shadow-sm text-red-800 text-sm animate-fade-in flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
            <span className="font-medium">{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col space-y-10">
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
              <ShieldCheck className="w-6 h-6 mr-2 text-emerald-500" /> Undertaking by Applicant
            </h4>

            <div className="text-sm text-slate-600 space-y-4 leading-relaxed font-medium mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p>
                a. Certified that the visit of the guest(s) is related to the activities of
                official/personal. I take responsibility for the payment of bills including food charges
                (if any) of the Guest House.
              </p>
              <p>
                b. The guest(s) is (are) personally known to me and I am responsible for his/her
                conduct.
              </p>
              <p>
                c. I hereby undertake to vacate the room in the Guest House, if allotted, on the expiry
                of the sanctioned period. In case I fail to do so, I will be liable to be charged penal
                rent (if any).
              </p>
              <p>d. I have read the NITT Guest house terms & conditions and these are acceptable.</p>
            </div>

            <label className="flex items-center cursor-pointer group bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition-colors shadow-sm">
              <input
                type="checkbox"
                checked={undertakingAccepted}
                onChange={(e) => setUndertakingAccepted(e.target.checked)}
                className="w-6 h-6 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer"
              />
              <span className="ml-4 text-base font-bold text-slate-700 group-hover:text-slate-900 transition-colors select-none">
                I agree to the above undertaking conditions. <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          <div
            className={`transition-all duration-500 space-y-10 ${undertakingAccepted ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale-[30%] pointer-events-none translate-y-2'}`}
          >
            <CategoryVisitSection formData={formData} handleChange={handleChange} setFormData={setFormData} />
            <MultiGuestSection formData={formData} setFormData={setFormData} />
            <StayDetailsSection formData={formData} handleChange={handleChange} setFormData={setFormData} tariffs={tariffs} />

            {(!isAdmin || formData.category_id === '2') && (
              <ApproverSelection approverSearch={approverSearch} setApproverSearch={setApproverSearch} isOpen={isApproverDropdownOpen} setIsOpen={setIsApproverDropdownOpen} authorities={authorities} setFormData={setFormData} />
            )}
          </div>

          <div className="pt-8 border-t border-slate-100">
            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-5 h-5 mr-2" /> Review Application Preview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
