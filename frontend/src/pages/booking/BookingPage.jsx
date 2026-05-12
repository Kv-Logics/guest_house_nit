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

  const [formData, setFormData] = useState(
    location.state?.formData || {
      purpose_of_visit: '',
      room_type: 'Standard Room',
      total_estimated_amount: 0,
      category_id: '1',
      visit_type: 'official',
      arrival_date: '',
      arrival_time: '12:00',
      departure_date: '',
      departure_time: '11:00',
      project_code: '',
      payment_responsibility: 'guest',
      assigned_approver_id: '',
      rooms: [
        {
          guests: [{
            guest_name: '', designation: '', relation_to_applicant: '', phone: '', email: '',
            gender: 'Male', age: '', address: '', id_proof_type: '', id_proof_number: '',
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

    let days = 1;
    if (formData.arrival_date && formData.departure_date) {
      const earliestArrival = new Date(`${formData.arrival_date}T${formData.arrival_time || '12:00'}`);
      const latestDeparture = new Date(`${formData.departure_date}T${formData.departure_time || '11:00'}`);
      if (latestDeparture > earliestArrival) {
        const diffTime = Math.abs(latestDeparture - earliestArrival);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const activeTariff =
      tariffs.find(
        (t) =>
          String(t.category_id) === String(formData.category_id) &&
          t.room_type === formData.room_type
      ) || tariffs.find((t) => String(t.category_id) === String(formData.category_id));

    if (activeTariff) {
      const roomsList = formData.rooms || [];
      const doubleRooms = roomsList.filter(r => r.guests.length > 1).length;
      const singleRooms = roomsList.filter(r => r.guests.length === 1).length;
      const extraBeds = roomsList.filter(r => r.extra_bed).length;

      const singleRate = Number(activeTariff.single_occupancy);
      const doubleRate = Number(activeTariff.double_occupancy);
      const extraBedRate = Number(activeTariff.extra_bed) || 400;

      const roomCost = days * ((singleRooms * singleRate) + (doubleRooms * doubleRate));
      const extraBedCost = days * extraBeds * extraBedRate;
      const subtotal = roomCost + extraBedCost;

      // Include 12% GST
      const total = Math.round(subtotal + subtotal * 0.12);

      setFormData((prev) => {
        if (prev.total_estimated_amount !== total) {
          return { ...prev, total_estimated_amount: total };
        }
        return prev;
      });
    }
  }, [
    formData.rooms,
    formData.room_type,
    formData.category_id,
    formData.arrival_date,
    formData.departure_date,
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
