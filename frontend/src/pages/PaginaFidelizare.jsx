import React, { useState, useEffect } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Fidelizare() {
    const [email, setEmail] = useState('');
    const [puncte, setPuncte] = useState(0);

    const fetchPuncte = async () => {
        if (email.trim() === '') return;
        try {
            const res = await api.get(`http://localhost:5000/api/fidelizare/${email}`);
            setPuncte(res.data.puncte);
        } catch (err) {
            alert('Nu s-au gÄƒsit puncte pentru acest email.');
        }
    };

    const folosestePuncte = async () => {
        try {
            await api.post(`http://localhost:5000/api/fidelizare/reseteaza`, { email });
            alert('Punctele au fost folosite!');
            setPuncte(0);
        } catch (err) {
            alert('Eroare la resetarea punctelor.');
        }
    };

    return (
        <div className="text-center mt-10">
            <h2 className="text-2xl font-bold mb-4">ðŸŽ Fidelizare ClienÈ›i</h2>
            <input
                type="email"
                placeholder="Introdu emailul tÄƒu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border p-2"
            />
            <button onClick={fetchPuncte} className="bg-green-500 text-white px-4 py-2 rounded ml-2">
                AfiÈ™eazÄƒ Puncte
            </button>
            <div className="mt-4">
                <p>Puncte disponibile: {puncte}</p>
                {puncte > 0 && (
                    <button onClick={folosestePuncte} className="bg-yellow-500 text-white px-4 py-2 rounded">
                        FoloseÈ™te Puncte
                    </button>
                )}
            </div>
        </div>
    );
}

export default Fidelizare;

