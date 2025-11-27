import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function RecenziiPrestator() {
    const { prestatorId } = useParams();
    const [recenzii, setRecenzii] = useState([]);
    const [stele, setStele] = useState(5);
    const [comentariu, setComentariu] = useState('');
    const [utilizator, setUtilizator] = useState(localStorage.getItem('nume') || '');

    useEffect(() => {
        const fetchRecenzii = async () => {
            const res = await api.get(`http://localhost:5000/api/recenzii-prestator/${prestatorId}`);
            setRecenzii(res.data);
        };
        fetchRecenzii();
    }, [prestatorId]);

    const adaugaRecenzie = async () => {
        await api.post('/', {
            prestatorId,
            utilizator,
            stele,
            comentariu
        });
        const res = await api.get(`http://localhost:5000/api/recenzii-prestator/${prestatorId}`);
        setRecenzii(res.data);
        setComentariu('');
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">ðŸŒŸ Recenzii Prestator</h2>
            {recenzii.map((r, index) => (
                <div key={index} className="border p-2 my-2">
                    <strong>{r.utilizator}</strong> â€“ {r.stele}â­
                    <p>{r.comentariu}</p>
                    <p className="text-sm text-gray-500">{new Date(r.data).toLocaleString()}</p>
                </div>
            ))}

            <h3 className="mt-6 text-xl font-bold">LasÄƒ o recenzie</h3>
            <input
                type="number"
                value={stele}
                onChange={(e) => setStele(e.target.value)}
                min="1"
                max="5"
                className="border p-1 w-16"
            /> /5 stele
            <textarea
                value={comentariu}
                onChange={(e) => setComentariu(e.target.value)}
                placeholder="Comentariu"
                className="border w-full p-2 mt-2"
            />
            <button onClick={adaugaRecenzie} className="bg-green-500 text-white px-4 py-2 rounded mt-2">
                Trimite recenzie
            </button>
        </div>
    );
}

export default RecenziiPrestator;

