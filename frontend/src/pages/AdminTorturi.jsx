import React, { useState, useEffect } from 'react';
import api from '../lib/api.js';

function AdminTorturi() {
    const [torturi, setTorturi] = useState([]);
    const [nume, setNume] = useState('');
    const [ingrediente, setIngrediente] = useState('');
    const [imagine, setImagine] = useState('');
    const [pret, setPret] = useState(0);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    // ✅ Load torturi din DB la mount
    useEffect(() => {
        incarcaTorturi();
    }, []);

    const incarcaTorturi = async () => {
        try {
            const res = await api.get('/torturi');
            const items = res.data?.items || res.data || [];
            setTorturi(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Eroare la încărcare torturi:', err);
            setMsg('❌ Eroare la încărcare torturi');
        }
    };

    // ✅ ADAUGĂ tort ȘI salvează în DB
    const adaugaTort = async (e) => {
        e.preventDefault();
        setMsg('');

        if (!nume.trim()) {
            setMsg('❌ Introdu nume tort!');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                nume,
                ingrediente: ingrediente
                    .split(',')
                    .map(i => i.trim())
                    .filter(i => i),
                imagine: imagine || '',
                pret: Number(pret) || 0,
                stoc: 10,
                activ: true
            };

            const res = await api.post('/torturi', payload);

            // ✅ Adaugă în lista locală
            setTorturi([...torturi, res.data]);
            setMsg('✅ Tort adăugat cu succes în baza de date!');

            // Reset form
            setNume('');
            setIngrediente('');
            setImagine('');
            setPret(0);
        } catch (err) {
            console.error('Eroare la adăugare:', err);
            setMsg(`❌ Eroare: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ✅ ȘTERGE tort din DB
    const stergeTort = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi acest tort?')) {
            return;
        }

        try {
            await api.delete(`/torturi/${id}`);
            setTorturi(torturi.filter(t => t._id !== id));
            setMsg('✅ Tort șters cu succes!');
        } catch (err) {
            console.error('Eroare la ștergere:', err);
            setMsg(`❌ Eroare la ștergere: ${err.message}`);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl">
            <h2 className="text-3xl font-bold mb-2">🧁 Administrare Torturi</h2>
            <p className="text-gray-600 mb-6">Adaugă, editează sau șterge torturi din catalog</p>

            {/* MESAJ STATUS */}
            {msg && (
                <div
                    className={`p-4 rounded-lg mb-6 font-semibold ${
                        msg.includes('✅')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                >
                    {msg}
                </div>
            )}

            {/* FORM ADĂUGARE */}
            <form
                onSubmit={adaugaTort}
                className="bg-white p-6 rounded-lg shadow-lg mb-8 border-2 border-pink-200"
            >
                <h3 className="text-xl font-bold mb-4">➕ Adaugă tort nou</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nume tort *</label>
                        <input
                            type="text"
                            placeholder="ex: Tort Mousse Ciocolată"
                            value={nume}
                            onChange={(e) => setNume(e.target.value)}
                            className="w-full border-2 border-pink-200 p-3 rounded-lg focus:border-pink-400 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Preț (MDL) *</label>
                        <input
                            type="number"
                            placeholder="ex: 250"
                            value={pret}
                            onChange={(e) => setPret(e.target.value)}
                            className="w-full border-2 border-pink-200 p-3 rounded-lg focus:border-pink-400 focus:outline-none"
                            min="0"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Ingrediente (separate prin virgulă)</label>
                        <input
                            type="text"
                            placeholder="ex: ciocolată, frişcă, căpşuni"
                            value={ingrediente}
                            onChange={(e) => setIngrediente(e.target.value)}
                            className="w-full border-2 border-pink-200 p-3 rounded-lg focus:border-pink-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">URL Imagine</label>
                        <input
                            type="text"
                            placeholder="ex: https://..."
                            value={imagine}
                            onChange={(e) => setImagine(e.target.value)}
                            className="w-full border-2 border-pink-200 p-3 rounded-lg focus:border-pink-400 focus:outline-none"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-6 rounded-lg font-bold text-white text-lg transition ${
                        loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-95'
                    }`}
                >
                    {loading ? '⏳ Se adaugă...' : '✅ Adaugă tort în baza de date'}
                </button>
            </form>

            {/* LISTA TORTURI */}
            <div>
                <h3 className="text-xl font-bold mb-4">
                    📊 Torturi în catalog ({torturi.length})
                </h3>
                {torturi.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">
                            📭 Nu sunt torturi în catalog. Adaugă-le mai sus!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {torturi.map((tort) => (
                            <div
                                key={tort._id}
                                className="bg-white border-2 border-pink-200 rounded-lg overflow-hidden shadow hover:shadow-xl transition transform hover:scale-105"
                            >
                                {tort.imagine && (
                                    <img
                                        src={tort.imagine}
                                        alt={tort.nume}
                                        className="w-full h-48 object-cover"
                                        onError={(e) => {
                                            e.target.src =
                                                'https://via.placeholder.com/200?text=Tort';
                                        }}
                                    />
                                )}
                                <div className="p-4">
                                    <h4 className="text-lg font-bold text-gray-800 mb-2">
                                        {tort.nume}
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3 h-12 overflow-hidden">
                                        {Array.isArray(tort.ingrediente)
                                            ? tort.ingrediente.join(', ')
                                            : 'Fără ingrediente'}
                                    </p>
                                    <p className="text-2xl font-bold text-green-600 mb-4">
                                        {tort.pret || 0} MDL
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => alert('✨ Funcția Editare va fi implementată')}
                                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition"
                                        >
                                            ✏️ Editează
                                        </button>
                                        <button
                                            onClick={() => stergeTort(tort._id)}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition"
                                        >
                                            🗑️ Șterge
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminTorturi;