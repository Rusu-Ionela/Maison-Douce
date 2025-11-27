import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import api from '../lib/api';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

export default function ClientCalendar({ onConfirm }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState('pickup');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedDate) {
            fetchAvailableSlots(selectedDate);
        }
    }, [selectedDate]);

    async function fetchAvailableSlots(date) {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const { data } = await api.get(`/calendar/available/${dateStr}`);
            setAvailableSlots(data);
            setSelectedTime(null);
        } catch (err) {
            console.error('Eroare:', err);
            setAvailableSlots([]);
        } finally {
            setLoading(false);
        }
    }

    const handleConfirm = () => {
        if (!selectedDate || !selectedTime) {
            alert('❌ Selectează data și ora');
            return;
        }

        if (deliveryMethod === 'delivery' && !address.trim()) {
            alert('❌ Adresa este obligatorie pentru livrare');
            return;
        }

        onConfirm({
            date: selectedDate.toISOString().split('T')[0],
            time: selectedTime,
            deliveryMethod,
            address: deliveryMethod === 'delivery' ? address : null,
            deliveryFee: deliveryMethod === 'delivery' ? 100 : 0
        });
    };

    return (
        <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-center">🗓️ Selectează data și ora de preluare</h2>

            {/* Step 1: Data */}
            <div className="mb-8 pb-8 border-b-2">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
                    📅 Alege data
                </h3>
                <div className="flex justify-center">
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        minDate={new Date()}
                        className="rounded shadow-lg"
                    />
                </div>
            </div>

            {/* Step 2: Ora */}
            {selectedDate && (
                <div className="mb-8 pb-8 border-b-2">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
                        ⏰ Alege ora
                    </h3>
                    {loading ? (
                        <p className="text-gray-500 text-center py-4">Se încarcă orele disponibile...</p>
                    ) : availableSlots.length === 0 ? (
                        <p className="text-red-500 text-center py-4 font-semibold">❌ Nu sunt ore disponibile pentru această dată</p>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {availableSlots.map((slot, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedTime(slot.time)}
                                    disabled={!slot.available}
                                    className={`p-3 rounded-lg font-bold text-sm transition duration-200 ${selectedTime === slot.time
                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                            : slot.available
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-300'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {slot.available ? '✓' : '✗'} {slot.time}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Metoda livrare */}
            {selectedTime && (
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
                        🚚 Metoda preluare
                    </h3>
                    <div className="space-y-3">
                        <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition">
                            <input
                                type="radio"
                                name="delivery"
                                value="pickup"
                                checked={deliveryMethod === 'pickup'}
                                onChange={e => setDeliveryMethod(e.target.value)}
                                className="w-5 h-5 cursor-pointer"
                            />
                            <span className="ml-3">
                                <div className="font-bold">🏪 Ridicare personală</div>
                                <div className="text-sm text-green-600 font-semibold">✓ Gratuit</div>
                            </span>
                        </label>

                        <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition">
                            <input
                                type="radio"
                                name="delivery"
                                value="delivery"
                                checked={deliveryMethod === 'delivery'}
                                onChange={e => setDeliveryMethod(e.target.value)}
                                className="w-5 h-5 cursor-pointer"
                            />
                            <span className="ml-3">
                                <div className="font-bold">🚚 Livrare la domiciliu</div>
                                <div className="text-sm text-orange-600 font-semibold">+ 100 MDL</div>
                            </span>
                        </label>

                        <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition">
                            <input
                                type="radio"
                                name="delivery"
                                value="courier"
                                checked={deliveryMethod === 'courier'}
                                onChange={e => setDeliveryMethod(e.target.value)}
                                className="w-5 h-5 cursor-pointer"
                            />
                            <span className="ml-3">
                                <div className="font-bold">📦 Curier (pentru comenzi mari)</div>
                                <div className="text-sm text-orange-600 font-semibold">+ 50 MDL</div>
                            </span>
                        </label>

                        {deliveryMethod === 'delivery' && (
                            <textarea
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Introduce adresa completă (strada, nr, bloc, apt, oras...)"
                                className="w-full border-2 border-orange-300 rounded-lg p-3 mt-2 focus:outline-none focus:border-orange-500 bg-orange-50"
                                rows="3"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Buton confirmare */}
            {selectedDate && selectedTime && (
                <div className="mt-6">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl"
                    >
                        ✓ Confirmă programarea
                    </button>
                </div>
            )}

            {/* Rezumat */}
            {selectedDate && selectedTime && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <p className="text-sm"><strong>📅 Data:</strong> {selectedDate.toLocaleDateString('ro-RO')}</p>
                    <p className="text-sm"><strong>⏰ Ora:</strong> {selectedTime}</p>
                    <p className="text-sm"><strong>📍 Preluare:</strong> {deliveryMethod === 'pickup' ? '🏪 Ridicare personală' : `🚚 Livrare la domiciliu`}</p>
                    {deliveryMethod === 'delivery' && <p className="text-sm text-orange-600"><strong>💰 Taxa:</strong> +100 MDL</p>}
                </div>
            )}
        </div>
    );
}