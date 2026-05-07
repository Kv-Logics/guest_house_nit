import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, ClipboardList, Calendar, Users, Wallet, FileText, AlertCircle, Utensils, User } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function PreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData, user } = location.state || {};
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!formData || !user) {
    return (
      <div className="text-center mt-20">
        <p className="text-slate-500 mb-4 font-medium">No booking data found in session.</p>
        <button onClick={() => navigate('/book')} className="bg-blue-600 text-white px-6 py-2 font-bold rounded-xl shadow-sm">Start New Booking</button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const sanitizedGuests = formData.guests.map(g => ({
        ...g,
        age: g.age ? parseInt(g.age) : null
      }));

      const payload = {
        ...formData,
        guests: sanitizedGuests,
        user_id: user.user_id,
        arrival_datetime: new Date(`${formData.arrival_date}T${formData.arrival_time}`).toISOString(),
        departure_datetime: new Date(`${formData.departure_date}T${formData.departure_time}`).toISOString(),
        category_id: parseInt(formData.category_id),
        rooms_required: parseInt(formData.rooms_required),
        extra_beds: parseInt(formData.extra_beds) || 0,
        total_estimated_amount: formData.total_estimated_amount,
        payment_responsibility: formData.category_id === '1' ? 'institute' : formData.payment_responsibility,
        undertaking_accepted: true
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/bookings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.removeItem('nitt_booking_draft');
      navigate('/success', { state: { bookingId: response.data.data.booking_id } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit booking');
      window.scrollTo(0, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const catMap = { '1': 'CAT I (Priority)', '2': 'CAT II (Project)', '3': 'CAT III (Internal)', '4': 'CAT IV (Personal)' };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Application Preview</h2>
            <p className="text-slate-500 font-medium">Please review all details before final submission.</p>
          </div>
        </div>
        <button onClick={() => navigate('/book', { state: { formData } })} className="flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200">
          <ArrowLeft className="w-4 h-4 mr-2" /> Edit Form
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm text-red-800 text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Booking Overview Card */}
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Booking By (Applicant)</p>
                <p className="font-bold text-slate-800">{user.full_name}</p>
                <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{user.email}</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-blue-200"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Booking For (Guests)</p>
                <p className="font-bold text-slate-800 truncate max-w-[200px]">{formData.guests.map(g => g.guest_name || 'Unnamed Guest').join(', ')}</p>
                <p className="text-xs font-medium text-slate-500">{formData.guests.length} Guest(s) Included</p>
              </div>
            </div>
          </div>

          {/* Stay & Room Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3"><Calendar className="w-5 h-5 mr-2 text-purple-500" /> Stay Schedule</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Check-in</p><p className="font-semibold text-slate-800">{new Date(`${formData.arrival_date}T${formData.arrival_time}`).toLocaleString()}</p></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Check-out</p><p className="font-semibold text-slate-800">{new Date(`${formData.departure_date}T${formData.departure_time}`).toLocaleString()}</p></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Rooms Requested</p><p className="font-semibold text-slate-800">{formData.rooms_required} x {formData.room_type}</p></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Extra Beds</p><p className="font-semibold text-slate-800">{formData.extra_beds}</p></div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3"><Users className="w-5 h-5 mr-2 text-blue-500" /> Guest Details</h3>
            <div className="space-y-4">
              {formData.guests.map((guest, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">{guest.guest_name || 'Unnamed Guest'}</h4>
                    <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{guest.relation_to_applicant}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 mb-3">
                    {guest.phone && <p>📞 {guest.phone} &nbsp; ✉️ {guest.email}</p>}
                    <p>🆔 {guest.id_proof_type}: <span className="font-mono bg-white px-1 border border-slate-200 rounded">{guest.id_proof_number}</span></p>
                  </div>
                  
                  {/* Guest Meals */}
                  {guest.food_preferences.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center"><Utensils className="w-3 h-3 mr-1" /> Meal Requests</p>
                      <div className="space-y-1">
                        {guest.food_preferences.map((meal, mIdx) => (
                          <div key={mIdx} className="flex gap-4 text-xs font-medium text-slate-600">
                            <span className="w-24 text-slate-800">{meal.date}</span>
                            <span className={meal.breakfast ? 'text-emerald-600 font-bold' : 'text-slate-300'}>B: {meal.breakfast ? '✓' : '-'}</span>
                            <span className={meal.lunch ? 'text-emerald-600 font-bold' : 'text-slate-300'}>L: {meal.lunch ? '✓' : '-'}</span>
                            <span className={meal.dinner ? 'text-emerald-600 font-bold' : 'text-slate-300'}>D: {meal.dinner ? '✓' : '-'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Category & Visit */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3"><FileText className="w-5 h-5 mr-2 text-indigo-500" /> Booking Context</h3>
            <div className="space-y-4 text-sm">
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Category</p><p className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">{catMap[formData.category_id]}</p></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Visit Type</p><p className="font-semibold text-slate-800 capitalize">{formData.visit_type}</p></div>
              {formData.project_code && <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Project Code</p><p className="font-semibold text-slate-800">{formData.project_code}</p></div>}
              <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Purpose of Visit</p><p className="text-slate-700 italic">"{formData.purpose_of_visit}"</p></div>
            </div>
          </div>

          {/* Financials & Submit */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg text-white">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center border-b border-slate-700 pb-3"><Wallet className="w-5 h-5 mr-2 text-emerald-400" /> Financial Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Est. Total Amount</span>
                <span className="text-xl font-extrabold text-emerald-400">₹{formData.total_estimated_amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Payment Routing</span>
                <span className="text-sm font-bold bg-slate-800 px-2 py-1 rounded capitalize">{formData.category_id === '1' ? 'Institute Billed' : formData.payment_responsibility}</span>
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-xl mb-6 flex items-start gap-3 border border-slate-700">
               <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
               <p className="text-xs font-medium text-slate-300 leading-relaxed">By submitting, you confirm all details are correct and accept the NITT Guest House booking conditions.</p>
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={isLoading} 
              className={`w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-md text-base font-bold text-slate-900 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed bg-emerald-300' : 'bg-emerald-400 hover:bg-emerald-300 hover:shadow-emerald-500/20 hover:-translate-y-0.5'}`}
            >
              {isLoading ? <><LoadingSpinner /> Securing Booking...</> : 'Confirm & Submit Application'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}