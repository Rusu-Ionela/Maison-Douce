// src/pages/RecenzieComanda.jsx
import React, { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function RecenzieComandaComponent({ comandaId, clientId }) {
    const [recenzie, setRecenzie] = useState(null);
    const [nota, setNota] = useState(5);
    const [comentariu, setComentariu] = useState("");

    useEffect(() => {
        const fetchRecenzie = async () => {
            try {
                const res = await api.get(`http://localhost:5000/api/recenzii-comenzi/${comandaId}`);
                setRecenzie(res.data);
            } catch (err) {
                console.error("Eroare la preluarea recenziei:", err);
            }
        };
        fetchRecenzie();
    }, [comandaId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`http://localhost:5000/api/recenzii-comenzi`, {
                comandaId,
                clientId,
                nota,
                comentariu,
            });
            alert("Recenzia a fost trimisÄƒ!");
            const res = await api.get(`http://localhost:5000/api/recenzii-comenzi/${comandaId}`);
            setRecenzie(res.data);
        } catch (err) {
            alert("Eroare la trimiterea recenziei.");
        }
    };

    if (recenzie) {
        return (
            <div className="mt-2 p-2 border rounded bg-green-50">
                <p>â­ Nota: {recenzie.nota}</p>
                <p>ðŸ“ Comentariu: {recenzie.comentariu}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-2 p-2 border rounded bg-gray-50">
            <label className="block mb-2">â­ Nota:</label>
            <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="border p-1 mb-2">
                {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}</option>
                ))}
            </select>

            <label className="block mb-2">ðŸ“ Comentariu:</label>
            <textarea
                value={comentariu}
                onChange={(e) => setComentariu(e.target.value)}
                placeholder="Scrie un comentariu..."
                className="border p-2 w-full mb-2"
                required
            />

            <button type="submit" className="bg-purple-500 text-white px-3 py-1 rounded">
                Trimite Recenzie
            </button>
        </form>
    );
}

