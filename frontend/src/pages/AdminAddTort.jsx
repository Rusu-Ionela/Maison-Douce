import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function AdminAddTort() {
    const [nume, setNume] = useState('');
    const [ingrediente, setIngrediente] = useState('');
    const [imagine, setImagine] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const tortNou = {
            nume,
            ingrediente: ingrediente.split(',').map((i) => i.trim()),
            imagine,
        };

        try {
            await api.post('/torturi', tortNou);

            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Eroare la adÄƒugare:', err);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4">AdaugÄƒ Tort Nou</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Nume tort"
                    value={nume}
                    onChange={(e) => setNume(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="Ingrediente (separate prin virgulÄƒ)"
                    value={ingrediente}
                    onChange={(e) => setIngrediente(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="URL imagine"
                    value={imagine}
                    onChange={(e) => setImagine(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                />
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    AdaugÄƒ Tort
                </button>
            </form>
        </div>
    );
}

export default AdminAddTort;

