import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function CalendarClient() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [address, setAddress] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const date = selectedDate.toISOString().split('T')[0];
        const { data } = await api.get(`/api/calendar/availability/default?from=${date}`);
        setAvailableSlots(data.slots || []);
      } catch (err) {
        setError('Eroare la încărcarea sloturilor disponibile');
      }
    };
    fetchSlots();
  }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const reservation = {
        clientId: user.id,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        metoda: deliveryMethod,
        adresaLivrare: deliveryMethod === 'livrare' ? address : undefined
      };

      const { data } = await api.post('/api/calendar/reserve', reservation);
      window.location.href = `/plata?rezervareId=${data.rezervareId}`;
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la rezervare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Programează livrarea</h1>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-2">Data:</label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate.toISOString().split('T')[0]}
            onChange={e => setSelectedDate(new Date(e.target.value))}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Ora disponibilă:</label>
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map(slot => (
              <button
                key={slot.time}
                type="button"
                onClick={() => setSelectedTime(slot.time)}
                className={`p-2 border rounded ${
                  selectedTime === slot.time 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-50'
                }`}
                disabled={slot.free === 0}
              >
                {slot.time}
                {slot.free === 0 && ' (ocupat)'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2">Metoda de livrare:</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="pickup"
                checked={deliveryMethod === 'pickup'}
                onChange={e => setDeliveryMethod(e.target.value)}
                className="mr-2"
              />
              Ridicare personală (gratuit)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="livrare"
                checked={deliveryMethod === 'livrare'}
                onChange={e => setDeliveryMethod(e.target.value)}
                className="mr-2"
              />
              Livrare la domiciliu (+100 MDL)
            </label>
          </div>
        </div>

        {deliveryMethod === 'livrare' && (
          <div>
            <label className="block font-medium mb-2">Adresa de livrare:</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full border rounded p-2"
              rows="3"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedTime}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Se procesează...' : 'Confirmă rezervarea'}
        </button>
      </form>
    </div>
  );
}