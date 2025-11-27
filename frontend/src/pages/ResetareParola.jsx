import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function ResetareParola() {
    const [email, setEmail] = useState('');
    const [mesaj, setMesaj] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/', { email });
            setMesaj('VerificÄƒ emailul pentru link-ul de resetare.');
        } catch (err) {
            console.error('Eroare:', err);
            setMesaj('Eroare la trimitere email.');
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">ðŸ” Resetare ParolÄƒ</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Emailul tÄƒu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border p-2 w-full mb-2"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                    Trimite email de resetare
                </button>
            </form>
            {mesaj && <p className="mt-4">{mesaj}</p>}
        </div>
    );
}

export default ResetareParola;

