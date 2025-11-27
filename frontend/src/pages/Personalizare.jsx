import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Personalizare() {
    const [forma, setForma] = useState('');
    const [culori, setCulori] = useState('');
    const [mesaj, setMesaj] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const personalizare = {
            forma,
            culori,
            mesaj
        };

        try {
            await api.post('/', personalizare);
            alert('âœ… Tortul a fost personalizat!');
        } catch (err) {
            console.error('Eroare la salvarea personalizÄƒrii:', err);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
            <h2 className="text-2xl font-bold mb-4">ðŸŽ¨ PersonalizeazÄƒ Tortul</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="FormÄƒ (rotund, pÄƒtrat...)"
                    value={forma}
                    onChange={(e) => setForma(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="Culori dorite"
                    value={culori}
                    onChange={(e) => setCulori(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="Mesaj pe tort"
                    value={mesaj}
                    onChange={(e) => setMesaj(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    SalveazÄƒ
                </button>
            </form>
        </div>
    );
}

export default Personalizare;

