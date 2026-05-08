import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotesGuidelinesSection from './NotesGuidelinesSection';
import MultiGuestSection from './MultiGuestSection';
import CategoryVisitSection from './CategoryVisitSection';
import StayDetailsSection from './StayDetailsSection';
import UndertakingSection from './UndertakingSection';
import ApprovalAuthoritySection from './ApprovalAuthoritySection';
import { AlertCircle, Eye } from 'lucide-react';

export default function BookingForm({ formData, setFormData, user }) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState('');

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

    /* --- UNDERTAKING TEMPORARILY DISABLED ---
    if (!formData.undertaking_1 || !formData.undertaking_2 || !formData.undertaking_3 || !formData.undertaking_4 || !formData.undertaking_5) {
      setLocalError('You must check and accept all Undertaking conditions to proceed.');
      return;
    }
    ---------------------------------------- */

    // Proceed to preview page with form data
    navigate('/preview', { state: { formData, user } });
  };

  return (
    <div>
      <NotesGuidelinesSection />
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
      
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
          <StayDetailsSection formData={formData} handleChange={handleChange} />
        <CategoryVisitSection formData={formData} handleChange={handleChange} setFormData={setFormData} />
          <MultiGuestSection formData={formData} setFormData={setFormData} user={user} />
          {/* <UndertakingSection formData={formData} handleChange={handleChange} /> */}
          <ApprovalAuthoritySection formData={formData} />

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