import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MultiGuestSection from './MultiGuestSection';
import CategoryVisitSection from './CategoryVisitSection';
import StayDetailsSection from './StayDetailsSection';
import GuidelinesCard from './GuidelinesCard';
import ApproverSelection from './ApproverSelection';
import { AlertCircle, Eye } from 'lucide-react';

// MAIN COMPONENT EXPORT
export default function BookingForm({ formData, setFormData, user, authorities = [] }) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState('');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
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

    if (!guidelinesAccepted) {
      setLocalError('You must review and acknowledge the official guidelines before proceeding.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    for (let i = 0; i < formData.guests.length; i++) {
      const guest = formData.guests[i];
      const arrival = new Date(`${guest.arrival_date}T${guest.arrival_time}`);
      const departure = new Date(`${guest.departure_date}T${guest.departure_time}`);
      if (arrival < new Date(new Date().setHours(0, 0, 0, 0))) {
        setLocalError(`Guest ${i + 1}: Arrival date cannot be in the past.`);
        return;
      }
      if (departure <= arrival) {
        setLocalError(`Guest ${i + 1}: Departure date & time must be strictly after arrival.`);
        return;
      }
    }
    if (formData.category_id === '2' && !formData.project_code.trim()) {
      setLocalError('Project code is strictly required for CAT II bookings.');
      return;
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
    for (let i = 0; i < formData.guests.length; i++) {
      const guest = formData.guests[i];
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

    if (!isAdmin && !formData.assigned_approver_id) {
      setLocalError('You must select an Approval Authority to route your application.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Proceed to preview page with form data
    navigate('/preview', { state: { formData, user, authorities } });
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
          <GuidelinesCard guidelinesAccepted={guidelinesAccepted} setGuidelinesAccepted={setGuidelinesAccepted} />

          <div
            className={`transition-all duration-500 space-y-10 ${guidelinesAccepted ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale-[30%] pointer-events-none translate-y-2'}`}
          >
            <CategoryVisitSection formData={formData} handleChange={handleChange} setFormData={setFormData} />
            <MultiGuestSection formData={formData} setFormData={setFormData} />
            <StayDetailsSection formData={formData} handleChange={handleChange} setFormData={setFormData} />

            {!isAdmin && (
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
