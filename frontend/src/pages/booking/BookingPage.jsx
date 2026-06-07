import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { calculateHotelNights } from '../../utils/date';
import BookingForm from '../../components/forms/BookingForm';
import ApplicationRouteSidebar from '../../components/forms/ApplicationRouteSidebar';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editBookingId = searchParams.get('edit');
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!editBookingId);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState(() => {
    if (location.state?.formData) return location.state.formData;
    if (!editBookingId) {
      const saved = localStorage.getItem('nitt_booking_draft');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse draft from local storage');
        }
      }
    }
    return {
      purpose_of_visit: '',
      room_type: 'Standard Room',
      total_estimated_amount: 0,
      category_id: '1',
      visit_type: 'official',
      project_code: '',
      payment_responsibility: 'guest',
      assigned_approver_id: '',
      rooms: [
        {
          guests: [{
            guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
            gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
            arrival_date: todayStr,
            arrival_time: '12:00',
            departure_date: tomorrowStr,
            departure_time: '11:00',
            food_preferences: [],
          }],
          extra_bed: false
        }
      ]
    };
  });

  // Save draft to local storage on change with debounce
  useEffect(() => {
    if (editBookingId || !formData) return;
    
    const timeoutId = setTimeout(() => {
      // Create a clean copy of formData to save, removing any File objects
      const dataToSave = { ...formData };
      if (dataToSave.document_1 instanceof File) delete dataToSave.document_1;
      if (dataToSave.document_2 instanceof File) delete dataToSave.document_2;
      
      localStorage.setItem('nitt_booking_draft', JSON.stringify(dataToSave));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, editBookingId]);

  useEffect(() => {
    if (!user) return;
    if (editBookingId) {
      const fetchBooking = async () => {
        try {
          const res = await api.get(`/bookings/${editBookingId}`);
          if (res.success && res.data) {
            const b = res.data;
            const rooms = Array.from({ length: b.rooms_required || 1 }).map((_, i) => {
                const roomGuests = (b.guests || []).filter(g => g.room_index === i);
                return {
                    guests: roomGuests.length > 0 ? roomGuests.map(g => {
                        const arr = new Date(g.arrival_datetime);
                        const dep = new Date(g.departure_datetime);
                        return {
                            ...g,
                            id_proof_type: g.identity_proof_type,
                            id_proof_number: g.identity_proof_number,
                            arrival_date: arr.toISOString().split('T')[0],
                            arrival_time: arr.toTimeString().substring(0, 5),
                            departure_date: dep.toISOString().split('T')[0],
                            departure_time: dep.toTimeString().substring(0, 5),
                        }
                    }) : [{
                        guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
                        gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
                        arrival_date: todayStr, arrival_time: '12:00', departure_date: tomorrowStr, departure_time: '11:00', food_preferences: []
                    }],
                    extra_bed: roomGuests.some(g => g.preferred_extra_bed)
                };
            });

            setFormData({
              booking_id: b.booking_id,
              purpose_of_visit: b.purpose_of_visit || '',
              room_type: b.room_type || 'Standard Room',
              total_estimated_amount: b.total_estimated_amount || 0,
              category_id: String(b.category_id || '1'),
              visit_type: b.visit_type || 'official',
              project_code: b.project_code || '',
              payment_responsibility: b.payment_responsible || 'guest',
              assigned_approver_id: String(b.assigned_approver_id || ''),
              rooms: rooms
            });
          }
        } catch (e) {
          console.error('Failed to fetch booking for editing', e);
        } finally {
          setIsLoadingEdit(false);
        }
      };
      fetchBooking();
    }
  }, [editBookingId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Fetch live tariffs for payment calculation
    const fetchTariffs = async () => {
      try {
        const res = await api.get('/bookings/tariffs');
        if (res.success) setTariffs(res.data);
      } catch (e) {
        console.error('Failed to fetch tariffs');
      }
    };
    fetchTariffs();
  }, [user]);

  useEffect(() => {
    const fetchAuthorities = async () => {
      if (!formData.category_id || !user) return;
      try {
        const res = await api.get(`/bookings/authorities?category_id=${formData.category_id}`);
        if (res.success) {
          setAuthorities(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch authorities');
      }
    };
    fetchAuthorities();
  }, [formData.category_id, user]);

  // Dynamic Payment Calculation Logic (Debounced)
  useEffect(() => {
    if (!tariffs.length) return;

    const timeoutId = setTimeout(() => {
      const activeTariff =
        tariffs.find(
          (t) =>
            String(t.category_id) === String(formData.category_id) &&
            t.room_type === formData.room_type
        ) || tariffs.find((t) => String(t.category_id) === String(formData.category_id));

      if (!activeTariff) return;

      const singleRate = Number(activeTariff.single_occupancy);
      const doubleRate = Number(activeTariff.double_occupancy);
      const extraBedRate = Number(activeTariff.extra_bed) || 400;

      const flatGuests = (formData.rooms || []).flatMap(r => r.guests || []);
      const guestsDates = flatGuests
        .filter(g => g.arrival_date && g.departure_date)
        .map(g => ({
          arrival: new Date(`${g.arrival_date}T${g.arrival_time || '12:00'}`),
          departure: new Date(`${g.departure_date}T${g.departure_time || '11:00'}`)
        }));

      let minDate = null;
      let maxDate = null;
      for (const g of guestsDates) {
          if (!minDate || g.arrival < minDate) minDate = g.arrival;
          if (!maxDate || g.departure > maxDate) maxDate = g.departure;
      }

      let subtotal = 0;
      let roomCost = 0;
      let extraBedCost = 0;

      if (minDate && maxDate && maxDate > minDate) {
        const start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

        // Cap the max days to 30 to prevent massive loop freeze if dates are accidentally set years apart
        const diffDays = calculateHotelNights(minDate, maxDate);
        const maxDaysToLoop = Math.min(diffDays, 30);

        for (let i = 0; i < maxDaysToLoop; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const currentDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          (formData.rooms || []).forEach(room => {
            let activeGuestsCount = 0;
            (room.guests || []).forEach(guest => {
              if (guest.arrival_date && guest.departure_date) {
                if (currentDateStr >= guest.arrival_date && currentDateStr < guest.departure_date) {
                  activeGuestsCount++;
                }
              }
            });

            if (activeGuestsCount === 1) {
              roomCost += singleRate;
            } else if (activeGuestsCount === 2) {
              roomCost += doubleRate;
            } else if (activeGuestsCount >= 3) {
              roomCost += doubleRate;
              if (room.extra_bed) {
                const extraBedsNeeded = activeGuestsCount - 2;
                extraBedCost += extraBedsNeeded * extraBedRate;
              }
            }
          });
        }
        
        // If the stay is longer than 30 days, approximate the rest to avoid freezing
        if (diffDays > 30) {
          const remainingDays = diffDays - 30;
          subtotal = roomCost + extraBedCost;
          const avgDaily = subtotal / 30;
          subtotal += (avgDaily * remainingDays);
        } else {
          subtotal = roomCost + extraBedCost;
        }

      } else {
        // Fallback
        const roomsList = formData.rooms || [];
        const doubleRooms = roomsList.filter(r => r.guests.length > 1).length;
        const singleRooms = roomsList.filter(r => r.guests.length === 1).length;
        const extraBeds = roomsList.filter(r => r.extra_bed).length;
        
        subtotal = (singleRooms * singleRate) + (doubleRooms * doubleRate) + (extraBeds * extraBedRate);
      }

      // Include 12% GST
      const total = Math.round(subtotal + subtotal * 0.12);

      setFormData((prev) => {
        if (prev.total_estimated_amount !== total) {
          return { ...prev, total_estimated_amount: total };
        }
        return prev;
      });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [
    formData.rooms,
    formData.room_type,
    formData.category_id,
    tariffs,
  ]);

  if (isLoadingEdit) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600 font-medium">Loading Application Details...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="w-full max-w-[95%] 2xl:max-w-[100rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 relative">
      {/* Sidebar - Application Route */}
      <div className="hidden lg:block lg:col-span-4">
        <ApplicationRouteSidebar formData={formData} user={user} />
      </div>

      {/* Main Form */}
      <div className="lg:col-span-8">
        <BookingForm
          formData={formData}
          setFormData={setFormData}
          user={user}
          authorities={authorities}
          tariffs={tariffs}
          isEditMode={!!editBookingId}
        />
      </div>
    </div>
  );
}
