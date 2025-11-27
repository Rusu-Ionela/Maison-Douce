import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Contact() {
    const [nume, setNume] = useState('');
    const [email, setEmail] = useState('');
    const [mesaj, setMesaj] = useState('');

    const trimiteMesaj = () => {
        alert(`Mesaj trimis de ${nume} (${email}): ${mesaj}`);
        setNume('');
        setEmail('');
        setMesaj('');
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">ðŸ“ž Contact</h2>
            <input
                type="text"
                placeholder="Nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                className="border p-2 w-full mb-2"
            />
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border p-2 w-full mb-2"
            />
            <textarea
                placeholder="Mesaj"
                value={mesaj}
                onChange={(e) => setMesaj(e.target.value)}
                className="border p-2 w-full mb-2"
            />
            <button onClick={trimiteMesaj} className="bg-blue-500 text-white px-4 py-2 rounded">
                Trimite Mesaj
            </button>
        </div>
    );
}

export default Contact;

