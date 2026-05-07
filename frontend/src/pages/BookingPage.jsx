import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import BookingForm from '../components/BookingForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const formatToYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [tariffs, setTariffs] = useState([]);

  const [formData, setFormData] = useState(location.state?.formData || {
    arrival_date: formatToYYYYMMDD(today), arrival_time: '12:00', departure_date: formatToYYYYMMDD(tomorrow), departure_time: '12:00',
    rooms_required: 1, purpose_of_visit: 'Testing Auto Fill Flow',
    room_type: 'Standard Room',
    extra_beds: 0,
    total_estimated_amount: 0,
    category_id: '2', // Default to CAT-II as CAT-I is restricted
    visit_type: 'official',
    project_code: 'DST-2026-TEST',
    payment_responsibility: 'guest',
    undertaking_1: true, undertaking_2: true, undertaking_3: true, undertaking_4: true, undertaking_5: true,
    guests: [{
      guest_name: 'Test Guest', designation: 'Visiting Professor', relation_to_applicant: 'Colleague', phone: '9876543210', email: 'guest@example.com',
      gender: 'Male', age: '45', address: '123 Test Ave, Test City', id_proof_type: '', id_proof_number: '',
      food_preferences: [{ date: formatToYYYYMMDD(today), breakfast: 1, lunch: 1, dinner: 1, remarks: 'Veg' }]
    }]
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      navigate('/admin/login');
      return;
    }
    setUser(JSON.parse(storedUser));

    // Fetch live tariffs for payment calculation
    const fetchTariffs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/tariffs`, { headers: { Authorization: `Bearer ${token}` }});
        if (res.data.success) setTariffs(res.data.data);
      } catch (e) {
        console.error('Failed to fetch tariffs');
      }
    };
    fetchTariffs();

    // Actively clear out any previously saved local storage drafts
    localStorage.removeItem('nitt_booking_draft');

    /* --- DRAFT FEATURE TEMPORARILY DISABLED ---
    // const draft = localStorage.getItem('nitt_booking_draft');
    // if (draft) {
    //   try {
    //     setFormData(JSON.parse(draft));
    //   } catch (e) {
    //     console.error("Failed to load draft");
    //   }
    // }
    */
  }, [navigate]);

  // Dynamic Payment Calculation Logic
  useEffect(() => {
    if (!tariffs.length) return;
    
    const arrival = new Date(formData.arrival_date);
    const departure = new Date(formData.departure_date);
    let days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    days = isNaN(days) || days < 1 ? 1 : days; // Minimum 1 day charge

    const activeTariff = tariffs.find(t => String(t.category_id) === String(formData.category_id) && t.room_type === formData.room_type) 
                      || tariffs.find(t => String(t.category_id) === String(formData.category_id));

    if (activeTariff) {
      // Determine occupancy (Double if guests > rooms)
      const guestsCount = formData.guests ? formData.guests.length : 1;
      const isDouble = guestsCount > Number(formData.rooms_required);
      const baseRate = isDouble ? Number(activeTariff.double_occupancy) : Number(activeTariff.single_occupancy);
      const extraBedRate = Number(activeTariff.extra_bed) || 400;

      const roomCost = days * Number(formData.rooms_required) * baseRate;
      const extraBedCost = days * Number(formData.extra_beds) * extraBedRate;
      const subtotal = roomCost + extraBedCost;
      
      // Include 12% GST
      const total = Math.round(subtotal + (subtotal * 0.12));

      setFormData(prev => {
        if (prev.total_estimated_amount !== total) {
          return { ...prev, total_estimated_amount: total };
        }
        return prev;
      });
    }
  }, [formData.arrival_date, formData.departure_date, formData.rooms_required, formData.room_type, formData.extra_beds, formData.category_id, formData.guests, tariffs]);

  /* --- DRAFT FEATURE TEMPORARILY DISABLED ---
  // useEffect(() => {
  //   localStorage.setItem('nitt_booking_draft', JSON.stringify(formData));
  // }, [formData]);
  */

  if (!user) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <BookingForm formData={formData} setFormData={setFormData} user={user} />
    </div>
  );
}