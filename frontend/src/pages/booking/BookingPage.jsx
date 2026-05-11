import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import BookingForm from '../../components/forms/BookingForm';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [authorities, setAuthorities] = useState([]);

  const [formData, setFormData] = useState(
    location.state?.formData || {
      rooms_required: 1,
      purpose_of_visit: '',
      room_type: 'Standard Room',
      extra_beds: 0,
      total_estimated_amount: 0,
      category_id: '1',
      visit_type: 'official',
      project_code: '',
      payment_responsibility: 'guest',
      assigned_approver_id: '',
      guests: [],
    }
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      return;
    }

    // Fetch live tariffs for payment calculation
    const fetchTariffs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/bookings/tariffs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setTariffs(res.data.data);
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
        const res = await axios.get(
          `${API_BASE_URL}/bookings/authorities?category_id=${formData.category_id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (res.data.success) {
          setAuthorities(res.data.data);
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
    const guests = formData.guests || [];
    if (guests.length > 0 && guests[0].arrival_date && guests[0].departure_date) {
      const arrivalDates = guests.map(
        (g) => new Date(`${g.arrival_date}T${g.arrival_time || '12:00'}`)
      );
      const departureDates = guests.map(
        (g) => new Date(`${g.departure_date}T${g.departure_time || '11:00'}`)
      );
      const earliestArrival = new Date(Math.min(...arrivalDates));
      const latestDeparture = new Date(Math.max(...departureDates));
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
      // Determine occupancy (Double if guests > rooms)
      const guestsCount = formData.guests ? formData.guests.length : 1;
      const isDouble = guestsCount > Number(formData.rooms_required);
      const baseRate = isDouble
        ? Number(activeTariff.double_occupancy)
        : Number(activeTariff.single_occupancy);
      const extraBedRate = Number(activeTariff.extra_bed) || 400;

      const roomCost = days * Number(formData.rooms_required) * baseRate;
      const extraBedCost = days * Number(formData.extra_beds) * extraBedRate;
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
    formData.rooms_required,
    formData.room_type,
    formData.extra_beds,
    formData.category_id,
    formData.guests,
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
      />
    </div>
  );
}
