import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { calculateHotelNights } from '../../utils/date';
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
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import nitLogo from '../../assets/images/nitt_logo.svg';
import { getGstRate } from '../../utils/booking';

export default function PreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formData, user, authorities, tariffs: initialTariffs = [] } = location.state || {};
  const [tariffs, setTariffs] = useState(initialTariffs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBillingRoomType, setSelectedBillingRoomType] = useState(formData?.room_type || 'Standard Room');

  // Fetch tariffs if they were not passed or are empty
  useEffect(() => {
    if (tariffs.length === 0 && formData) {
      const fetchTariffs = async () => {
        try {
          const res = await api.get('/bookings/tariffs');
          if (res.success) {
            setTariffs(res.data);
          }
        } catch (e) {
          console.error('Failed to fetch tariffs in preview', e);
        }
      };
      fetchTariffs();
    }
  }, [tariffs.length, formData]);

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
  const flatGuests = (formData.rooms || []).flatMap(r => r.guests);
  let minArrival = null;
  let maxDeparture = null;
  
  flatGuests.forEach(g => {
    if (g.arrival_date) {
      const arr = new Date(`${g.arrival_date}T${g.arrival_time || '12:00'}`);
      if (!minArrival || arr < minArrival) minArrival = arr;
    }
    if (g.departure_date) {
      const dep = new Date(`${g.departure_date}T${g.departure_time || '12:00'}`);
      if (!maxDeparture || dep > maxDeparture) maxDeparture = dep;
    }
  });

  const getDurationString = (arrivalDate, arrivalTime, departureDate, departureTime) => {
    if (!arrivalDate || !departureDate) return '';
    const arr = new Date(`${arrivalDate}T${arrivalTime || '12:00'}`);
    const dep = new Date(`${departureDate}T${departureTime || '11:00'}`);
    
    if (dep <= arr) return '0 Days';
    
    const diffMs = dep - arr;
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    
    let parts = [];
    if (days > 0) {
      parts.push(`${days} Day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      parts.push(`${hours} Hour${hours > 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : '0 Days';
  };

  const earliestArrival = minArrival || new Date(`${formData.arrival_date || new Date().toISOString().split('T')[0]}T${formData.arrival_time || '12:00'}`);
  const latestDeparture = maxDeparture || new Date(`${formData.departure_date || new Date().toISOString().split('T')[0]}T${formData.departure_time || '11:00'}`);
  
  let days = 1;
  if (latestDeparture > earliestArrival) {
    days = calculateHotelNights(earliestArrival, latestDeparture);
  }



  const activeTariff = tariffs.find(t => String(t.category_id) === String(formData.category_id) && t.room_type === selectedBillingRoomType) || tariffs.find(t => String(t.category_id) === String(formData.category_id));
  
  const roomsList = formData.rooms || [];
  const roomsCount = roomsList.length;
  const doubleRooms = roomsList.filter(r => r.guests.length > 1).length;
  const singleRooms = roomsList.filter(r => r.guests.length === 1).length;
  const extraBeds = roomsList.filter(r => r.extra_bed).length;

  const singleRate = activeTariff ? Number(activeTariff.single_occupancy) : 0;
  const doubleRate = activeTariff ? Number(activeTariff.double_occupancy) : 0;
  const extraBedRate = activeTariff ? (Number(activeTariff.extra_bed) || 400) : 400;
  
  // Simulate night-by-night tariff calculator exactly mirroring backend
  let subtotal = 0;
  let roomCost = 0;
  let extraBedCost = 0;
  let singleNightsCount = 0;
  let doubleNightsCount = 0;
  let extraBedNightsCount = 0;

  if (minArrival && maxDeparture) {
    // Generate each night date range
    const start = new Date(minArrival.getFullYear(), minArrival.getMonth(), minArrival.getDate());
    const end = new Date(maxDeparture.getFullYear(), maxDeparture.getMonth(), maxDeparture.getDate());
    
    // For each night
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const currentDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      // Calculate active guests in each room for this night
      roomsList.forEach(room => {
        let activeGuestsCount = 0;
        room.guests.forEach(guest => {
          if (guest.arrival_date && guest.departure_date) {
            if (currentDateStr >= guest.arrival_date && currentDateStr < guest.departure_date) {
              activeGuestsCount++;
            }
          }
        });

        if (activeGuestsCount === 1) {
          singleNightsCount++;
          roomCost += singleRate;
        } else if (activeGuestsCount === 2) {
          doubleNightsCount++;
          roomCost += doubleRate;
        } else if (activeGuestsCount >= 3) {
          doubleNightsCount++;
          roomCost += doubleRate;
          if (room.extra_bed) {
            const extraBedsNeeded = activeGuestsCount - 2;
            extraBedNightsCount += extraBedsNeeded;
            extraBedCost += extraBedsNeeded * extraBedRate;
          }
        }
      });
    }
    subtotal = roomCost + extraBedCost;
  } else {
    // Fallback if no guest dates
    roomCost = days * ((singleRooms * singleRate) + (doubleRooms * doubleRate));
    extraBedCost = days * extraBeds * extraBedRate;
    subtotal = roomCost + extraBedCost;
    singleNightsCount = days * singleRooms;
    doubleNightsCount = days * doubleRooms;
    extraBedNightsCount = days * extraBeds;
  }
  const gstRate = getGstRate();
  const gst = Math.round(subtotal * (gstRate / 100));
  const calculatedTotal = subtotal + gst;

  const getPriorities = () => {
    const defaultTypes = ['Standard Room', 'Mini Suite Room'];
    if (!formData.room_priority) return defaultTypes;
    
    return formData.room_priority
      .split(' > ')
      .map(s => s.trim())
      .filter(s => ['Standard Room', 'Mini Suite Room', 'Suite Room'].includes(s));
  };

  const priorities = getPriorities();

  const calculateBillingForRoomType = (roomType) => {
    const targetTariff =
      tariffs.find(
        (t) =>
          String(t.category_id) === String(formData.category_id) &&
          t.room_type === roomType
      ) || tariffs.find((t) => String(t.category_id) === String(formData.category_id));

    if (!targetTariff) return { roomCost: 0, extraBedCost: 0, subtotal: 0, total: 0 };

    const sRate = Number(targetTariff.single_occupancy);
    const dRate = Number(targetTariff.double_occupancy);
    const ebRate = Number(targetTariff.extra_bed) || 400;

    let sub = 0;
    let rCost = 0;
    let ebCost = 0;

    if (minArrival && maxDeparture) {
      const start = new Date(minArrival.getFullYear(), minArrival.getMonth(), minArrival.getDate());
      const end = new Date(maxDeparture.getFullYear(), maxDeparture.getMonth(), maxDeparture.getDate());

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const currentDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        roomsList.forEach(room => {
          let activeGuestsCount = 0;
          room.guests.forEach(guest => {
            if (guest.arrival_date && guest.departure_date) {
              if (currentDateStr >= guest.arrival_date && currentDateStr < guest.departure_date) {
                activeGuestsCount++;
              }
            }
          });

          if (activeGuestsCount === 1) {
            rCost += sRate;
          } else if (activeGuestsCount === 2) {
            rCost += dRate;
          } else if (activeGuestsCount >= 3) {
            rCost += dRate;
            if (room.extra_bed) {
              const extraBedsNeeded = activeGuestsCount - 2;
              ebCost += extraBedsNeeded * ebRate;
            }
          }
        });
      }
      sub = rCost + ebCost;
    } else {
      rCost = days * ((singleRooms * sRate) + (doubleRooms * dRate));
      ebCost = days * extraBeds * ebRate;
      sub = rCost + ebCost;
    }

    const gRate = getGstRate();
    const tot = Math.round(sub + sub * (gRate / 100));
    return { roomCost: rCost, extraBedCost: ebCost, subtotal: sub, total: tot };
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const sanitizedGuests = [];
      (formData.rooms || []).forEach((room, roomIdx) => {
        room.guests.forEach((g, guestIdx) => {
          const guest = { ...g };
          
          // Inject room preferences based on room config
          guest.room_index = roomIdx;
          guest.preferred_occupancy = room.guests.length === 1 ? 'single' : 'double';
          guest.preferred_extra_bed = !!(room.extra_bed && guestIdx >= 2);
          
          // Force age to be a number, or 0 if missing to satisfy Zod
          guest.age = guest.age ? parseInt(guest.age, 10) : 0;

          // Keep empty strings as empty strings to satisfy Zod's z.string()
          if (!guest.email) guest.email = "";
          if (!guest.designation) guest.designation = "";
          if (!guest.address) guest.address = "";
          if (!guest.gender) guest.gender = "";

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

          sanitizedGuests.push(guest);
        });
      });

      const bookingData = {
        ...formData,
        guests: sanitizedGuests,
        user_id: user.user_id || user.id,
        arrival_datetime: earliestArrival.toISOString(),
        departure_datetime: latestDeparture.toISOString(),
        category_id: parseInt(formData.category_id),
        rooms_required: roomsCount,
        extra_beds: extraBeds,
        total_estimated_amount: calculatedTotal,
        estimated_amount: calculatedTotal,
        payment_responsibility:
          formData.category_id === '1' || formData.category_id === 1
            ? 'institute'
            : formData.payment_responsibility,
        undertaking_accepted: true,
        // Fallback to own user ID for Admins (Auto-Approve) to satisfy strict UUID Zod validation
        assigned_approver_id: formData.assigned_approver_id || user.user_id || user.id,
        keep_document_1: !!formData.document_1,
        keep_document_2: !!formData.document_2,
      };

      // CRITICAL: Remove File objects from the JSON payload to prevent Zod strict() schema crashes
      delete bookingData.document_1;
      delete bookingData.document_2;

      const formDataToSend = new FormData();
      formDataToSend.append('payload', JSON.stringify(bookingData));

      if (formData.document_1 && (formData.document_1 instanceof Blob)) {
        formDataToSend.append('document_1', formData.document_1);
      }
      if (formData.document_2 && (formData.document_2 instanceof Blob)) {
        formDataToSend.append('document_2', formData.document_2);
      }

      let response;
      if (location.state?.isEditMode && formData.booking_id) {
        response = await api.put(`/bookings/${formData.booking_id}`, formDataToSend);
      } else {
        response = await api.post('/bookings', formDataToSend);
      }

      localStorage.removeItem('nitt_booking_draft');
      navigate('/success', { state: { bookingId: response.data.formatted_id, rawId: response.data.booking_id } });
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
  const isAdminCat2 = isAdmin && String(formData.category_id) === '2';
  const isSelfApproval = formData.assigned_approver_id === user?.user_id || formData.assigned_approver_id === user?.id;

  const selectedApprover = authorities?.find((a) => a.user_id === formData.assigned_approver_id);
  let approverName = 'Unknown Authority';
  if (isAdmin && !isAdminCat2) {
    approverName = 'Auto-Approved (Admin Bypass)';
  } else if (isSelfApproval && !isAdminCat2) {
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
                  {(formData.rooms || []).flatMap(r => r.guests).map((g) => g.guest_name || 'Unnamed Guest').join(', ')}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {(formData.rooms || []).flatMap(r => r.guests).length} Guest(s) Included
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
                  {earliestArrival.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Latest Check-out</p>
                <p className="font-semibold text-slate-800">
                  {latestDeparture.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rooms Requested</p>
                <p className="font-semibold text-slate-800">
                  {roomsCount} x {formData.room_type}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Preferred Room Priority</p>
                <p className="font-semibold text-blue-700 font-mono text-xs">
                  {formData.room_priority || formData.room_type || 'Standard Room'}
                </p>
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 mr-2 text-blue-500" /> Guest Details
            </h3>
            <div className="space-y-4">
              {(formData.rooms || []).flatMap(r => r.guests).map((guest, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">
                      {guest.guest_name || 'Unnamed Guest'}
                    </h4>
                    {formData.category_id !== '2' && guest.relation_to_applicant && (
                      <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
                        {guest.relation_to_applicant}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 mb-3">
                    {guest.phone && (
                      <p>
                        📞 {guest.phone} &nbsp; ✉️ {guest.email}
                      </p>
                    )}
                    {guest.arrival_date && guest.departure_date && (
                      <div>
                        <p>
                          📅 Stay: <span className="font-bold text-slate-800">{new Date(guest.arrival_date).toLocaleDateString()} ({guest.arrival_time || '12:00'})</span> to <span className="font-bold text-slate-800">{new Date(guest.departure_date).toLocaleDateString()} ({guest.departure_time || '11:00'})</span>
                        </p>
                        <p className="mt-1.5 mb-1.5 flex items-center gap-1">
                          <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100/50 uppercase tracking-wider inline-flex items-center shadow-sm">
                            ⏱️ Duration: {getDurationString(guest.arrival_date, guest.arrival_time, guest.departure_date, guest.departure_time)}
                          </span>
                        </p>
                      </div>
                    )}
                    <p>
                      🆔 {guest.id_proof_type || 'ID'}:{' '}
                      <span className="font-mono bg-white px-1 border border-slate-200 rounded">
                        {guest.id_proof_number || 'N/A'}
                      </span>
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
                <p className="text-slate-700 italic">&quot;{formData.purpose_of_visit}&quot;</p>
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
                          {formData.document_1.name || formData.document_1.file_name}
                        </p>
                      </div>
                    )}
                    {formData.document_2 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-xs text-indigo-600 font-semibold flex items-center truncate">
                          <Paperclip className="w-3 h-3 mr-1 flex-shrink-0" />{' '}
                          {formData.document_2.name || formData.document_2.file_name}
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
              <div className="space-y-4 mb-4 border-b border-slate-100 pb-4 text-sm text-slate-600">
                {/* Granular Breakdown for the selected choice */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-2">
                  <p className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wider mb-2">
                    {selectedBillingRoomType === formData.room_type ? 'Primary Preference' : 'Alternative Preference'} ({selectedBillingRoomType})
                  </p>
                  {singleNightsCount > 0 && (
                    <div className="flex justify-between text-xs mb-1">
                      <span>Single Occupancy ({singleNightsCount} × ₹{singleRate})</span>
                      <span className="font-semibold text-slate-800">₹{singleNightsCount * singleRate}</span>
                    </div>
                  )}
                  {doubleNightsCount > 0 && (
                    <div className="flex justify-between text-xs mb-1">
                      <span>Double Occupancy ({doubleNightsCount} × ₹{doubleRate})</span>
                      <span className="font-semibold text-slate-800">₹{doubleNightsCount * doubleRate}</span>
                    </div>
                  )}
                  {extraBedNightsCount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Extra Bed ({extraBedNightsCount} Nights × ₹{extraBedRate})</span>
                      <span className="font-semibold text-slate-800">₹{extraBedNightsCount * extraBedRate}</span>
                    </div>
                  )}
                </div>



                <div className="flex justify-between pt-2 border-t border-slate-50">
                  <span>Subtotal ({selectedBillingRoomType === formData.room_type ? 'Primary' : 'Alternative'})</span>
                  <span className="font-medium text-slate-800">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>GST (12%)</span>
                  <span className="text-slate-700">₹{gst}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                  Est. Total Amount
                  {selectedBillingRoomType !== formData.room_type && (
                    <span className="text-[8px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">Alt View</span>
                  )}
                </span>
                <span className="text-xl font-extrabold text-emerald-600">
                  ₹{calculatedTotal}
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

      {/* Submit - Full Width */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm mt-8">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8 flex items-start sm:items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0" />
          <p className="text-sm font-bold text-blue-900">
            By submitting, you confirm all details are correct and accept the National Institute of Technology Trichy Guest House
            booking conditions.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-md text-lg font-bold transition-all ${isLoading ? 'opacity-70 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-600/20 hover:-translate-y-0.5'}`}
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
