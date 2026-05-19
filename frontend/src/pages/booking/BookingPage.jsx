import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import BookingForm from '../../components/forms/BookingForm';
import { useAuth } from '../../context/AuthContext';

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [authorities, setAuthorities] = useState([]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState(
    location.state?.formData || {
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
    }
  );

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

    // Actively clear out any previously saved local storage drafts
    localStorage.removeItem('nitt_booking_draft');
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

  // Dynamic Payment Calculation Logic
  useEffect(() => {
    if (!tariffs.length) return;

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

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
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
      subtotal = roomCost + extraBedCost;
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
  }, [
    formData.rooms,
    formData.room_type,
    formData.category_id,
    tariffs,
  ]);

  if (!user) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <BookingForm
        formData={formData}
        setFormData={setFormData}
        user={user}
        authorities={authorities}
        tariffs={tariffs}
      />
    </div>
  );
}
