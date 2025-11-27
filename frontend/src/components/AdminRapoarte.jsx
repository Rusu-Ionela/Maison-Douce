import React, { useState } from 'react';
import api from '../lib/api';

export default function AdminRapoarte() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [raportData, setRaportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('');

    const handleGenerateReport = async (type) => {
        if (!startDate || !endDate) {
            alert('❌ Selectează interval de date');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('❌ Data de început trebuie să fie înainte de data de sfârșit');
            return;
        }

        setLoading(true);
        try {
            if (type === 'reservations') {
                const { data } = await api.get(`/rapoarte/reservations/${startDate}/${endDate}`);
                setRaportData(data);
                setReportType('reservations');
            } else if (type === 'sales') {
                const { data } = await api.get(`/rapoarte/sales/${startDate}/${endDate}`);
                setRaportData(data);
                setReportType('sales');
            }
        } catch (err) {
            alert('❌ Eroare: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        if (!startDate || !endDate) {
            alert('❌ Selectează interval de date');
            return;
        }

        try {
            const response = await api.get(`/rapoarte/export/csv/${startDate}/${endDate}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `raport-rezervari-${startDate}-${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('❌ Eroare: ' + err.message);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">📊 Rapoarte și Analize</h1>

            {/* Selector date */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-xl font-bold mb-4">🔍 Filtrează raportele</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">📅 Data de început</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full border-2 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">📅 Data de sfârșit</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full border-2 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <button
                            onClick={() => handleGenerateReport('reservations')}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-bold"
                        >
                            📅 Rezervări
                        </button>
                    </div>
                    <div className="flex gap-2 items-end">
                        <button
                            onClick={() => handleGenerateReport('sales')}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-bold"
                        >
                            💰 Vânzări
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={handleExportCSV}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition font-bold"
                        >
                            📥 Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Rezultate */}
            {loading && (
                <div className="text-center py-8">
                    <p className="text-gray-600 text-lg">⏳ Se generează raportul...</p>
                </div>
            )}

            {raportData && (
                <div className="space-y-6">
                    {/* Statistici generale - VÂNZĂRI */}
                    {reportType === 'sales' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-4xl font-bold">{raportData.totalOrders}</div>
                                    <div className="text-blue-100">Comenzi totale</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-4xl font-bold">{raportData.totalRevenue.toFixed(0)}</div>
                                    <div className="text-green-100">MDL venituri</div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-3xl font-bold">{raportData.averageOrder}</div>
                                    <div className="text-yellow-100">MDL/comandă</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-3xl font-bold">{raportData.deliveryRevenue}</div>
                                    <div className="text-purple-100">MDL livrare</div>
                                </div>
                            </div>

                            {/* Metode livrare - VÂNZĂRI */}
                            {raportData.deliveryMethodBreakdown && (
                                <div className="bg-white p-6 rounded-lg shadow-lg">
                                    <h2 className="text-2xl font-bold mb-4">📦 Metode de livrare</h2>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                                            <div className="text-3xl font-bold text-blue-600">{raportData.deliveryMethodBreakdown.pickup}</div>
                                            <div className="text-gray-700 font-semibold">🏪 Ridicare</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {((raportData.deliveryMethodBreakdown.pickup / raportData.totalOrders) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                                            <div className="text-3xl font-bold text-green-600">{raportData.deliveryMethodBreakdown.delivery}</div>
                                            <div className="text-gray-700 font-semibold">🚚 Livrare</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {((raportData.deliveryMethodBreakdown.delivery / raportData.totalOrders) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                                            <div className="text-3xl font-bold text-yellow-600">{raportData.deliveryMethodBreakdown.courier}</div>
                                            <div className="text-gray-700 font-semibold">📦 Curier</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {((raportData.deliveryMethodBreakdown.courier / raportData.totalOrders) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Top produse */}
                            {raportData.topProducts && raportData.topProducts.length > 0 && (
                                <div className="bg-white p-6 rounded-lg shadow-lg">
                                    <h2 className="text-2xl font-bold mb-4">🏆 Produse top-vândute</h2>
                                    <div className="space-y-3">
                                        {raportData.topProducts.map((product, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 border-blue-500 hover:shadow-md transition">
                                                <div className="flex items-center">
                                                    <span className="text-2xl font-bold text-blue-600 mr-4">#{idx + 1}</span>
                                                    <span className="font-semibold text-gray-800">{product.product}</span>
                                                </div>
                                                <span className="text-2xl font-bold text-green-600">{product.quantity} buc</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Statistici generale - REZERVĂRI */}
                    {reportType === 'reservations' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-red-500 to-red-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-4xl font-bold">{raportData.totalReservations}</div>
                                    <div className="text-red-100">Rezervări totale</div>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-3xl font-bold">{raportData.deliveryMethods.pickup}</div>
                                    <div className="text-indigo-100">🏪 Ridicare</div>
                                </div>
                                <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-6 rounded-lg shadow-lg">
                                    <div className="text-3xl font-bold">{raportData.deliveryMethods.delivery}</div>
                                    <div className="text-teal-100">🚚 Livrare</div>
                                </div>
                            </div>

                            {/* Tabel detalii comenzi */}
                            {raportData.details && raportData.details.length > 0 && (
                                <div className="bg-white p-6 rounded-lg shadow-lg overflow-hidden">
                                    <h2 className="text-2xl font-bold mb-4">📋 Detalii rezervări</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                                                <tr>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">📅 Data</th>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">⏰ Ora</th>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">👤 Client</th>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">🎂 Produs</th>
                                                    <th className="p-3 text-center font-bold text-gray-700 border-b-2">📊 Cantitate</th>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">📍 Livrare</th>
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b-2">✅ Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {raportData.details.map((order, idx) => (
                                                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                                                        <td className="p-3 text-gray-800">{order.data}</td>
                                                        <td className="p-3 text-gray-800 font-semibold">{order.ora}</td>
                                                        <td className="p-3 text-gray-800">{order.client}</td>
                                                        <td className="p-3 text-gray-800">{order.tort}</td>
                                                        <td className="p-3 text-center font-bold text-blue-600">{order.cantitate}</td>
                                                        <td className="p-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.livrare === 'pickup' ? 'bg-blue-100 text-blue-800' :
                                                                    order.livrare === 'delivery' ? 'bg-green-100 text-green-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {order.livrare === 'pickup' ? '🏪 Ridicare' : order.livrare === 'delivery' ? '🚚 Livrare' : '📦 Curier'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {order.status === 'pending' ? '⏳ Așteptare' :
                                                                    order.status === 'in_progress' ? '⚙️ Lucru' :
                                                                        order.status === 'ready' ? '✅ Gata' : '📦 Livrat'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Info perioadă */}
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700">
                            <strong>📊 Raport pentru perioada:</strong> {new Date(raportData.period.startDate).toLocaleDateString('ro-RO')} - {new Date(raportData.period.endDate).toLocaleDateString('ro-RO')}
                        </p>
                    </div>
                </div>
            )}

            {/* Mesaj gol */}
            {!raportData && !loading && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">📭 Selectează un interval de date și generează un raport</p>
                </div>
            )}
        </div>
    );
}