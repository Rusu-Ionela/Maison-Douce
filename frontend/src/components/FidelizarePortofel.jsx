import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function FidelizarePortofel({ userId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRedeem, setShowRedeem] = useState(false);

    useEffect(() => {
        loadPortofel();
    }, [userId]);

    async function loadPortofel() {
        try {
            const { data: response } = await api.get(`/fidelizare/client/${userId}`);
            setData(response);
        } catch (err) {
            console.error('Eroare:', err);
        } finally {
            setLoading(false);
        }
    }

    async function redeemPoints(points, discount) {
        try {
            const { data: response } = await api.post('/fidelizare/redeem', {
                utilizatorId: userId,
                puncte: points,
                discount
            });
            alert(`✓ Cod promo creat: ${response.codig}`);
            setShowRedeem(false);
            loadPortofel();
        } catch (err) {
            alert('❌ Eroare: ' + err.message);
        }
    }

    if (loading) return <div className="text-center py-8">⏳ Se încarcă...</div>;
    if (!data) return <div className="text-center py-8 text-red-500">❌ Eroare la încărcarea datelor</div>;

    const getLevelColor = (level) => {
        const colors = {
            bronze: 'from-amber-600 to-amber-700',
            silver: 'from-gray-400 to-gray-500',
            gold: 'from-yellow-400 to-yellow-600',
            platinum: 'from-cyan-300 to-blue-400'
        };
        return colors[level] || 'from-gray-400 to-gray-500';
    };

    const getLevelIcon = (level) => {
        const icons = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
        return icons[level] || '🏆';
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">💎 Programul Meu de Fidelizare</h2>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                    <div className="text-5xl font-bold mb-2">{data.puncteCurent}</div>
                    <div className="text-blue-100 text-lg">Puncte curente</div>
                    <div className="text-sm mt-2 text-blue-200">Disponibile pentru răscumpărare</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                    <div className="text-5xl font-bold mb-2">{data.puncteTotal}</div>
                    <div className="text-green-100 text-lg">Puncte acumulate</div>
                    <div className="text-sm mt-2 text-green-200">În total din începere</div>
                </div>

                <div className={`bg-gradient-to-br ${getLevelColor(data.nivel)} text-white p-8 rounded-lg shadow-lg hover:shadow-xl transition`}>
                    <div className="text-4xl mb-2">{getLevelIcon(data.nivel)}</div>
                    <div className="text-3xl font-bold mb-2">{data.nivel.toUpperCase()}</div>
                    <div className={`text-sm ${data.nivel === 'platinum' ? 'text-cyan-100' : 'text-opacity-80'}`}>Nivel actual</div>
                </div>
            </div>

            {/* Info Nivele */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { name: 'Bronze', puncte: '0+', icon: '🥉' },
                    { name: 'Silver', puncte: '100+', icon: '🥈' },
                    { name: 'Gold', puncte: '300+', icon: '🥇' },
                    { name: 'Platinum', puncte: '500+', icon: '💎' }
                ].map((level, idx) => (
                    <div key={idx} className={`p-4 rounded-lg text-center ${data.nivel === level.name.toLowerCase() ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}`}>
                        <div className="text-3xl">{level.icon}</div>
                        <div className="font-bold">{level.name}</div>
                        <div className="text-xs text-gray-600">{level.puncte} puncte</div>
                    </div>
                ))}
            </div>

            {/* Reduceri disponibile */}
            {data.reduceriDisponibile && data.reduceriDisponibile.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-8 border-2 border-green-300">
                    <h3 className="text-2xl font-bold mb-4">🎁 Reduceri disponibile</h3>
                    <div className="space-y-3">
                        {data.reduceriDisponibile.map((red, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg flex justify-between items-center shadow hover:shadow-md transition">
                                <div>
                                    <span className="font-bold text-2xl text-green-600">{red.procent}%</span>
                                    <div className="text-xs text-gray-600">
                                        Cod: <span className="font-mono font-bold">{red.codigPromo}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Valabil până: {new Date(red.dataExpirare).toLocaleDateString('ro-RO')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(red.codigPromo);
                                        alert('✓ Cod copiat!');
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                                >
                                    📋 Copie
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Răscumpărare */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg mb-8 border-2 border-blue-300">
                <h3 className="text-2xl font-bold mb-4">🏆 Convertiți punctele în reduceri</h3>
                {showRedeem ? (
                    <div className="space-y-3">
                        <button
                            onClick={() => redeemPoints(50, 5)}
                            disabled={data.puncteCurent < 50}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            50 puncte = 5% reducere {data.puncteCurent < 50 && '(Insuficiente)'}
                        </button>
                        <button
                            onClick={() => redeemPoints(100, 10)}
                            disabled={data.puncteCurent < 100}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            100 puncte = 10% reducere {data.puncteCurent < 100 && '(Insuficiente)'}
                        </button>
                        <button
                            onClick={() => redeemPoints(200, 25)}
                            disabled={data.puncteCurent < 200}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            200 puncte = 25% reducere {data.puncteCurent < 200 && '(Insuficiente)'}
                        </button>
                        <button
                            onClick={() => setShowRedeem(false)}
                            className="w-full bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                        >
                            ✕ Anulare
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowRedeem(true)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-bold text-lg"
                    >
                        🔄 Convertiți punctele
                    </button>
                )}
            </div>

            {/* Istoric */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-4">📊 Istoric activitate</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {data.istoric && data.istoric.length > 0 ? (
                        data.istoric.map((item, idx) => (
                            <div key={idx} className="border-b pb-3 flex justify-between items-center hover:bg-gray-50 p-2 rounded">
                                <div>
                                    <span className={`font-bold text-lg ${item.tip === 'earn' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {item.tip === 'earn' ? '+' : '-'}{item.puncte} ⭐
                                    </span>
                                    <div className="text-sm text-gray-600">{item.descriere}</div>
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                    {new Date(item.data).toLocaleDateString('ro-RO')}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">Fără activitate</p>
                    )}
                </div>
            </div>
        </div>
    );
}