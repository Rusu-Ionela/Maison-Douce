import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../lib/api.js';

export default function AdminCalendarView() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [agenda, setAgenda] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const dateStr = selectedDate.toISOString().split('T')[0];

    useEffect(() => {
        fetchAgenda();
    }, [selectedDate]);

    const fetchAgenda = async () => {
        setLoading(true);
        try {
            // ✅ Fetch comenzi pentru data selectată
            const res = await api.get('/comenzi', {
                params: { date: dateStr }
            });
            setAgenda(Array.isArray(res.data) ? res.data : res.data?.items || []);
        } catch (err) {
            console.error('Eroare la fetch agenda:', err);
            setAgenda([]);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/comenzi/${orderId}`, { statusComanda: newStatus });
            fetchAgenda();
            alert('✅ Status actualizat!');
        } catch (err) {
            console.error('Eroare:', err);
            alert('❌ Eroare la actualizare');
        }
    };

    const filteredAgenda = agenda.filter(item => {
        if (filterStatus === 'all') return true;
        return item.statusComanda === filterStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">📅 Calendar Admin — Agenda Zilei</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* CALENDAR */}
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-lg">
                    <Calendar
                        value={selectedDate}
                        onChange={setSelectedDate}
                        minDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                        maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                        className="w-full"
                    />
                    <p className="text-sm text-gray-600 mt-4 text-center font-semibold">
                        📍 {dateStr}
                    </p>
                </div>

                {/* AGENDA */}
                <div className="lg:col-span-3">
                    <h2 className="text-2xl font-bold mb-4">📌 Comenzi pentru {dateStr}</h2>

                    {/* FILTRU */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {['all', 'pending', 'ready', 'in_delivery', 'delivered'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg font-semibold transition ${
                                    filterStatus === status
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {status === 'all' ? '📋 Toate' : status.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-center py-12">⏳ Se încarcă...</div>
                    ) : filteredAgenda.length === 0 ? (
                        <div className="text-center py-12 bg-gray-100 rounded-lg">
                            <p className="text-gray-600 text-lg">📭 Nu sunt comenzi pentru această dată</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAgenda.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white border-l-4 border-blue-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* STÂNGA */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-2">
                                                🛒 {item.numeroComanda || 'Comandă #' + item._id?.slice(0, 6)}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                👤 Client: <span className="font-semibold">{item.numeClient || 'Anonim'}</span>
                                            </p>
                                            <p className="text-sm text-gray-600 mb-2">
                                                📞 {item.telefonClient || '—'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                ⏰ {item.oraLivrare || item.hora || '—'}
                                            </p>
                                        </div>

                                        {/* DREAPTA */}
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                📍 Livrare:
                                                <span className="font-semibold block">
                                                    {item.metodaLivrare === 'delivery'
                                                        ? `🚚 Acasă (+${item.taxaLivrare || 100} MDL)`
                                                        : item.metodaLivrare === 'courier'
                                                        ? '📬 Curier'
                                                        : '🏪 Ridicare din local'}
                                                </span>
                                            </p>
                                            {item.adresaLivrare && (
                                                <p className="text-sm text-gray-600">
                                                    📮 <span className="font-semibold">{item.adresaLivrare}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* PRODUSE */}
                                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                        <p className="font-semibold text-gray-800 mb-2">🧁 Produse:</p>
                                        {item.items && item.items.length > 0 ? (
                                            <ul className="list-disc ml-5 space-y-1">
                                                {item.items.map((prod, i) => (
                                                    <li key={i} className="text-sm text-gray-700">
                                                        <span className="font-semibold">{prod.tortName || prod.name}</span>
                                                        <span className="text-gray-600"> ×{prod.qty || 1}</span>
                                                        <span className="text-green-600 font-bold ml-2">
                                                            {prod.pret || 0} MDL
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-600">—</p>
                                        )}
                                    </div>

                                    {/* TOTAL + STATUS */}
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                        <p className="text-2xl font-bold text-green-600">
                                            💰 {item.total || item.subtotal || 0} MDL
                                        </p>
                                        <span
                                            className={`px-4 py-2 rounded-lg font-bold text-sm ${
                                                item.statusComanda === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : item.statusComanda === 'ready'
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.statusComanda === 'in_delivery'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {item.statusComanda?.toUpperCase() || 'NECUNOSCUT'}
                                        </span>
                                    </div>

                                    {/* ACȚIUNI */}
                                    <div className="flex gap-2 flex-wrap">
                                        {item.statusComanda !== 'delivered' && (
                                            <>
                                                {item.statusComanda === 'pending' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(item._id, 'ready')}
                                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                                    >
                                                        ✅ Marcează Gata
                                                    </button>
                                                )}
                                                {item.statusComanda === 'ready' && (
                                                    <>
                                                        {item.metodaLivrare === 'delivery' && (
                                                            <button
                                                                onClick={() =>
                                                                    updateOrderStatus(item._id, 'in_delivery')
                                                                }
                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                                            >
                                                                🚚 Markează Livrat
                                                            </button>
                                                        )}
                                                        {item.metodaLivrare === 'pickup' && (
                                                            <button
                                                                onClick={() =>
                                                                    updateOrderStatus(item._id, 'delivered')
                                                                }
                                                                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                                            >
                                                                🏪 Ridicat
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {item.statusComanda === 'in_delivery' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(item._id, 'delivered')}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                                    >
                                                        ✨ Finalizează
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}