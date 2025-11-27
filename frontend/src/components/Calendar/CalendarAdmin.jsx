import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import api from '../lib/api';
import 'react-calendar/dist/Calendar.css';
import '../styles/calendar.css';

export default function AdminCalendar() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newTime, setNewTime] = useState('09:00');

    useEffect(() => {
        loadSlots();
    }, [selectedDate]);

    async function loadSlots() {
        setLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const { data } = await api.get(`/calendar/admin/${dateStr}`);
            setSlots(data.slots || []);
        } catch (err) {
            console.error('Eroare:', err);
            alert('Eroare la încărcarea sloturior');
        } finally {
            setLoading(false);
        }
    }

    async function addSlot() {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await api.post('/calendar/admin/create-slots', {
                date: dateStr,
                times: [newTime],
                capacity: 5
            });
            setNewTime('09:00');
            setShowAddSlot(false);
            loadSlots();
            alert('Slot adăugat cu succes!');
        } catch (err) {
            alert('Eroare: ' + err.message);
        }
    }

    async function updateOrderStatus(time, orderId, newStatus) {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await api.put('/calendar/admin/order-status', {
                date: dateStr,
                time,
                orderId,
                newStatus
            });
            loadSlots();
            alert('Status actualizat!');
        } catch (err) {
            alert('Eroare: ' + err.message);
        }
    }

    async function deleteSlot(time) {
        if (!window.confirm('Ești sigur că vrei să ștergi acest slot?')) return;

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await api.delete(`/calendar/admin/${dateStr}/${time}`);
            loadSlots();
            alert('Slot șters!');
        } catch (err) {
            alert('Eroare: ' + err.message);
        }
    }

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
            ready: 'bg-green-100 text-green-800 border-green-300',
            delivered: 'bg-gray-100 text-gray-800 border-gray-300'
        };
        return colors[status] || 'bg-gray-100';
    };

    const getDeliveryIcon = (method) => {
        const icons = {
            pickup: '🏪 Ridicare',
            delivery: '🚚 Livrare',
            courier: '📦 Curier'
        };
        return icons[method] || '📦';
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: '⏳ În așteptare',
            in_progress: '⚙️ În lucru',
            ready: '✅ Gata',
            delivered: '📦 Livrat'
        };
        return labels[status] || status;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">📅 Calendar Comenzi</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="md:col-span-1">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <Calendar
                            onChange={setSelectedDate}
                            value={selectedDate}
                            minDate={new Date()}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Sloturi și comenzi */}
                <div className="md:col-span-2">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">
                                📆 {selectedDate.toLocaleDateString('ro-RO', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h2>
                            <button
                                onClick={() => setShowAddSlot(!showAddSlot)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                            >
                                {showAddSlot ? '✕ Anulare' : '+ Adaugă oră'}
                            </button>
                        </div>

                        {showAddSlot && (
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        value={newTime}
                                        onChange={e => setNewTime(e.target.value)}
                                        className="border-2 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={addSlot}
                                        className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition font-semibold"
                                    >
                                        ✓ Adaugă
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <p className="text-gray-500 text-center py-8">⏳ Se încarcă...</p>
                        ) : slots.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">📭 Nu există programări pentru această zi</p>
                        ) : (
                            <div className="space-y-4">
                                {slots.map((slot, idx) => (
                                    <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-bold text-blue-600">⏰ {slot.time}</h3>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-sm bg-gray-300 text-gray-800 px-3 py-1 rounded-full font-semibold">
                                                    {slot.booked}/{slot.capacity} booked
                                                </span>
                                                <button
                                                    onClick={() => deleteSlot(slot.time)}
                                                    className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                                                >
                                                    🗑️ Șterge
                                                </button>
                                            </div>
                                        </div>

                                        {slot.orders && slot.orders.length > 0 ? (
                                            <div className="space-y-3">
                                                {slot.orders.map((order, i) => (
                                                    <div key={i} className={`p-4 rounded-lg border-2 ${getStatusColor(order.status)}`}>
                                                        <div className="font-bold text-lg">{order.client}</div>
                                                        <div className="text-sm mt-1 font-semibold">🎂 {order.tort} x{order.qty}</div>
                                                        <div className="text-sm mt-1">
                                                            {getDeliveryIcon(order.delivery)}
                                                            {order.delivery === 'delivery' ? ` - ${order.address}` : ''}
                                                        </div>
                                                        <div className="flex gap-2 mt-3 flex-wrap">
                                                            <select
                                                                value={order.status}
                                                                onChange={e => updateOrderStatus(slot.time, order.orderId, e.target.value)}
                                                                className="text-sm border-2 rounded px-3 py-1 font-semibold focus:outline-none focus:border-blue-500"
                                                            >
                                                                <option value="pending">⏳ În așteptare</option>
                                                                <option value="in_progress">⚙️ În lucru</option>
                                                                <option value="ready">✅ Gata</option>
                                                                <option value="delivered">📦 Livrat</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm italic">Fără comenzi în acest slot</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}