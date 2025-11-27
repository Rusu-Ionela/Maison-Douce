import React, { useState, useEffect } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function CalendarPrestator() {
    const [disponibilitati, setDisponibilitati] = useState([]);
    const [data, setData] = useState('');
    const [interval, setInterval] = useState('');

    const adaugaDisponibilitate = async () => {
        await api.post('/', {
            prestatorId: localStorage.getItem('utilizatorId'),
            data,
            interval
        });
        fetchDisponibilitati();
    };

    const fetchDisponibilitati = async () => {
        const res = await api.get(`http://localhost:5000/api/calendar-prestator/${localStorage.getItem('utilizatorId')}`);
        setDisponibilitati(res.data);
    };

    useEffect(() => {
        fetchDisponibilitati();
    }, []);

    return (
        <div className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">ðŸ“… Calendar DisponibilitÄƒÈ›i</h2>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="border p-2 mb-2 w-full" />
            <input type="text" placeholder="Ex: 10:00-12:00" value={interval} onChange={(e) => setInterval(e.target.value)} className="border p-2 mb-2 w-full" />
            <button onClick={adaugaDisponibilitate} className="bg-green-500 text-white px-4 py-2 rounded mb-4">AdaugÄƒ Disponibilitate</button>
            <h3 className="text-lg font-semibold mb-2">Intervale Disponibile</h3>
            {disponibilitati.map((d) => (
                <div key={d._id} className="border p-2 my-2">
                    {new Date(d.data).toLocaleDateString()} â€“ {d.interval}
                </div>
            ))}
        </div>
    );
}

export default CalendarPrestator;

