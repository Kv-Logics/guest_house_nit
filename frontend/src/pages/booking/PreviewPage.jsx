import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Users,
  Wallet,
  FileText,
  AlertCircle,
  Utensils,
  User,
  Paperclip,
  ShieldCheck,
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import nitLogo from '../../assets/images/nitlogo.png';

export default function PreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData, user, authorities, tariffs = [] } = location.state || {};
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [undertakingAccepted, setUndertakingAccepted] = useState(false);

  // Ensure the page always starts at the very top when navigating from the form
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!formData || !user) {
    return (
      <div className="text-center mt-20">
        <p className="text-slate-500 mb-4 font-medium">No booking data found in session.</p>
        <button
          onClick={() => navigate('/book')}
          className="bg-blue-600 text-white px-6 py-2 font-bold rounded-xl shadow-sm"
        >
          Start New Booking
        </button>
      </div>
    );
  }

  // Calculate Stay Duration and Breakdown
  const earliestArrival = new Date(
    Math.min(...formData.guests.map((g) => new Date(`${g.arrival_date}T${g.arrival_time}`)))
  );
  const latestDeparture = new Date(
    Math.max(...formData.guests.map((g) => new Date(`${g.departure_date}T${g.departure_time}`)))
  );
  
  let days = 1;
  if (latestDeparture > earliestArrival) {
    days = Math.ceil(Math.abs(latestDeparture - earliestArrival) / (1000 * 60 * 60 * 24));
  }

  const activeTariff = tariffs.find(t => String(t.category_id) === String(formData.category_id) && t.room_type === formData.room_type) || tariffs.find(t => String(t.category_id) === String(formData.category_id));
  const guestsCount = formData.guests ? formData.guests.length : 1;
  const isDouble = guestsCount > Number(formData.rooms_required);
  const baseRate = activeTariff ? (isDouble ? Number(activeTariff.double_occupancy) : Number(activeTariff.single_occupancy)) : 0;
  const extraBedRate = activeTariff ? (Number(activeTariff.extra_bed) || 400) : 400;
  const roomCost = days * Number(formData.rooms_required) * baseRate;
  const extraBedCost = days * Number(formData.extra_beds) * extraBedRate;
  const subtotal = roomCost + extraBedCost;
  const gst = Math.round(subtotal * 0.12);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const sanitizedGuests = formData.guests.map((g) => {
        const guest = { ...g };
        
        // Force age to be a number, or 0 if missing to satisfy Zod
        guest.age = guest.age ? parseInt(guest.age, 10) : 0;

        // Keep empty strings as empty strings to satisfy Zod's z.string()
        if (!guest.email) guest.email = "";
        if (!guest.designation) guest.designation = "";
        if (!guest.address) guest.address = "";

        guest.arrival_datetime = new Date(
          `${guest.arrival_date}T${guest.arrival_time}`
        ).toISOString();
        guest.departure_datetime = new Date(
          `${guest.departure_date}T${guest.departure_time}`
        ).toISOString();

        if (guest.food_preferences && Array.isArray(guest.food_preferences)) {
            guest.food_preferences = guest.food_preferences.map(f => ({
                meal_date: f.date || f.meal_date,
                date: f.date || f.meal_date, // Zod explicitly expects the 'date' key
                breakfast: f.breakfast ? 1 : 0,
                lunch: f.lunch ? 1 : 0,
                dinner: f.dinner ? 1 : 0,
                remarks: f.remarks?.trim() || ''
            }));
        }

        return guest;
      });

      const bookingData = {
        ...formData,
        guests: sanitizedGuests,
        user_id: user.user_id || user.id,
        arrival_datetime: earliestArrival.toISOString(),
        departure_datetime: latestDeparture.toISOString(),
        category_id: parseInt(formData.category_id),
        rooms_required: parseInt(formData.rooms_required),
        extra_beds: parseInt(formData.extra_beds) || 0,
        total_estimated_amount: Number(formData.total_estimated_amount) || 0,
        estimated_amount: Number(formData.total_estimated_amount) || 0,
        payment_responsibility:
          formData.category_id === '1' || formData.category_id === 1
            ? 'institute'
            : formData.payment_responsibility,
        undertaking_accepted: true,
        project_code: formData.project_code?.trim() || "",
        assigned_approver_id: formData.assigned_approver_id || "",
      };

      // CRITICAL: Remove File objects from the JSON payload to prevent Zod strict() schema crashes
      delete bookingData.document_1;
      delete bookingData.document_2;

      const formDataToSend = new FormData();
      formDataToSend.append('payload', JSON.stringify(bookingData));

      if (formData.document_1) formDataToSend.append('document_1', formData.document_1);
      if (formData.document_2) formDataToSend.append('document_2', formData.document_2);

      const response = await api.post('/bookings', formDataToSend);

      localStorage.removeItem('nitt_booking_draft');
      navigate('/success', { state: { bookingId: response.data.booking_id } });
    } catch (err) {
      console.error('Backend Submission Error:', err);
      // Extract precise Zod validation messages if the payload gets rejected again
      let errorMsg = err.message || 'Failed to submit booking';
      
      if (err.errors && err.errors.name === 'ZodError') {
        try {
          const zodErrors = JSON.parse(err.errors.message);
          errorMsg = zodErrors
            .map((e) => `${Array.isArray(e.path) ? e.path.join('.') : e.path || 'Field'}: ${e.message}`)
            .join(' | ');
        } catch (parseErr) {
          errorMsg = err.errors.message;
        }
      } else if (err.errors && Array.isArray(err.errors)) {
        errorMsg = err.errors
          .map((e) => `${Array.isArray(e.path) ? e.path.join('.') : e.path || 'Field'}: ${e.message}`)
          .join(' | ');
      }
      setError(errorMsg);
      window.scrollTo(0, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const catMap = {
    1: 'CAT I (Priority)',
    2: 'CAT II (Project)',
    3: 'CAT III (Internal)',
    4: 'CAT IV (Personal)',
  };

  const isAdmin = ['super_admin', 'guest_house_admin'].includes(user?.role);
  const isSelfApproval = formData.assigned_approver_id === user?.user_id || formData.assigned_approver_id === user?.id;

  const selectedApprover = authorities?.find((a) => a.user_id === formData.assigned_approver_id);
  let approverName = 'Unknown Authority';
  if (isAdmin) {
    approverName = 'Auto-Approved (Admin Bypass)';
  } else if (isSelfApproval) {
    approverName = 'Self-Approved (Authority Bypass)';
  } else if (selectedApprover) {
    approverName = `${selectedApprover.full_name} (${selectedApprover.department})`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <img src={nitLogo} alt="NIT Logo" className="w-14 h-14 object-contain" />
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Application Preview
            </h2>
            <p className="text-xs text-slate-500 font-bold tracking-wider mt-1 uppercase">
              National Institute of Technology, Tiruchirappalli
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/book', { state: { formData } })}
          className="flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200"
        >
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
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">
                  Booking By (Applicant)
                </p>
                <p className="font-bold text-slate-800">{user.full_name}</p>
                <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-blue-200"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">
                  Booking For (Guests)
                </p>
                <p className="font-bold text-slate-800 truncate max-w-[200px]">
                  {formData.guests.map((g) => g.guest_name || 'Unnamed Guest').join(', ')}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {formData.guests.length} Guest(s) Included
                </p>
              </div>
            </div>
          </div>

          {/* Stay & Room Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
              <Calendar className="w-5 h-5 mr-2 text-purple-500" /> Stay Schedule
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Earliest Check-in</p>
                <p className="font-semibold text-slate-800">
                  {new Date(
                    Math.min(
                      ...formData.guests.map((g) => new Date(`${g.arrival_date}T${g.arrival_time}`))
                    )
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Latest Check-out</p>
                <p className="font-semibold text-slate-800">
                  {new Date(
                    Math.max(
                      ...formData.guests.map(
                        (g) => new Date(`${g.departure_date}T${g.departure_time}`)
                      )
                    )
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rooms Requested</p>
                <p className="font-semibold text-slate-800">
                  {formData.rooms_required} x {formData.room_type}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Extra Beds</p>
                <p className="font-semibold text-slate-800">{formData.extra_beds}</p>
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 mr-2 text-blue-500" /> Guest Details
            </h3>
            <div className="space-y-4">
              {formData.guests.map((guest, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">
                      {guest.guest_name || 'Unnamed Guest'}
                    </h4>
                    <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
                      {guest.relation_to_applicant}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 mb-3">
                    {guest.phone && (
                      <p>
                        📞 {guest.phone} &nbsp; ✉️ {guest.email}
                      </p>
                    )}
                    <p>
                      🆔 {guest.id_proof_type}:{' '}
                      <span className="font-mono bg-white px-1 border border-slate-200 rounded">
                        {guest.id_proof_number}
                      </span>
                    </p>
                    <p className="mt-2 font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded inline-block">
                      📅 Stay:{' '}
                      {new Date(`${guest.arrival_date}T${guest.arrival_time}`).toLocaleString()}
                      {' to '}
                      {new Date(`${guest.departure_date}T${guest.departure_time}`).toLocaleString()}
                    </p>
                  </div>

                  {/* Guest Meals */}
                  {guest.food_preferences.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center">
                        <Utensils className="w-3 h-3 mr-1" /> Meal Requests
                      </p>
                      <div className="space-y-1">
                        {guest.food_preferences.map((meal, mIdx) => (
                          <div key={mIdx} className="flex gap-4 text-xs font-medium text-slate-600">
                            <span className="w-24 text-slate-800">{meal.date}</span>
                            <span
                              className={
                                meal.breakfast ? 'text-emerald-600 font-bold' : 'text-slate-300'
                              }
                            >
                              B: {meal.breakfast ? '✓' : '-'}
                            </span>
                            <span
                              className={
                                meal.lunch ? 'text-emerald-600 font-bold' : 'text-slate-300'
                              }
                            >
                              L: {meal.lunch ? '✓' : '-'}
                            </span>
                            <span
                              className={
                                meal.dinner ? 'text-emerald-600 font-bold' : 'text-slate-300'
                              }
                            >
                              D: {meal.dinner ? '✓' : '-'}
                            </span>
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
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 mr-2 text-indigo-500" /> Booking Context
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Category</p>
                <p className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                  {catMap[formData.category_id]}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Visit Type</p>
                <p className="font-semibold text-slate-800 capitalize">{formData.visit_type}</p>
              </div>
              {formData.project_code && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Project Code</p>
                  <p className="font-semibold text-slate-800">{formData.project_code}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Routed To</p>
                <p className="font-bold text-slate-800">{approverName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Purpose of Visit</p>
                <p className="text-slate-700 italic">"{formData.purpose_of_visit}"</p>
              </div>
              {(formData.document_1 || formData.document_2) && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Attached Documents
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.document_1 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-xs text-indigo-600 font-semibold flex items-center truncate">
                          <Paperclip className="w-3 h-3 mr-1 flex-shrink-0" />{' '}
                          {formData.document_1.name}
                        </p>
                      </div>
                    )}
                    {formData.document_2 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-xs text-indigo-600 font-semibold flex items-center truncate">
                          <Paperclip className="w-3 h-3 mr-1 flex-shrink-0" />{' '}
                          {formData.document_2.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
              <Wallet className="w-5 h-5 mr-2 text-emerald-500" /> Financial Summary
            </h3>

            {activeTariff && (
              <div className="space-y-3 mb-4 border-b border-slate-100 pb-4 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Room Charges ({days} Days × {formData.rooms_required} {formData.room_type})</span>
                  <span className="font-medium">₹{roomCost}</span>
                </div>
                {Number(formData.extra_beds) > 0 && (
                  <div className="flex justify-between">
                    <span>Extra Beds ({days} Days × {formData.extra_beds})</span>
                    <span className="font-medium">₹{extraBedCost}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>GST (12%)</span>
                  <span>₹{gst}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Est. Total Amount</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  ₹{formData.total_estimated_amount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Payment Routing</span>
                <span className="text-sm font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded capitalize">
                  {formData.category_id === '1'
                    ? 'Institute Billed'
                    : formData.payment_responsibility}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Undertaking & Submit - Full Width */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm mt-8">
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

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8 flex items-start sm:items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0" />
          <p className="text-sm font-bold text-blue-900">
            By submitting, you confirm all details are correct and accept the NITT Guest House
            booking conditions.
          </p>
        </div>

        <label className="flex items-center cursor-pointer group bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition-colors mb-8 shadow-sm">
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

        <button
          onClick={handleSubmit}
          disabled={isLoading || !undertakingAccepted}
          className={`w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-md text-lg font-bold transition-all ${isLoading || !undertakingAccepted ? 'opacity-70 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-600/20 hover:-translate-y-0.5'}`}
        >
          {isLoading ? (
            <>
              <LoadingSpinner /> Securing Booking...
            </>
          ) : (
            'Confirm & Submit Application'
          )}
        </button>
      </div>
    </div>
  );
}
