import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminEditProdus() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [nume, setNume] = useState("");
    const [cantitate, setCantitate] = useState("");
    const [dataExpirare, setDataExpirare] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const produs = (await api.get(`/produse-studio/${id}`)).data;
                setNume(produs?.nume ?? "");
                setCantitate(String(produs?.cantitate ?? ""));
                setDataExpirare(
                    produs?.dataExpirare ? new Date(produs.dataExpirare).toISOString().slice(0, 10) : ""
                );
            } catch (e) {
                console.error("Eroare la Ã®ncÄƒrcare produs:", e);
            }
        })();
    }, [id]);

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await api.put(`/produse-studio/${id}`, { nume, cantitate: Number(cantitate), dataExpirare });
            navigate("/admin/produse");
        } catch (e) {
            console.error("Eroare la actualizare produs:", e);
        }
    }

    return (
        <div className="max-w-xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4">âœï¸ EditeazÄƒ Produs (stoc)</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input className="w-full border p-2 rounded" placeholder="Nume" value={nume} onChange={e => setNume(e.target.value)} required />
                <input className="w-full border p-2 rounded" type="number" placeholder="Cantitate" value={cantitate} onChange={e => setCantitate(e.target.value)} required />
                <input className="w-full border p-2 rounded" type="date" value={dataExpirare} onChange={e => setDataExpirare(e.target.value)} />
                <button className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">SalveazÄƒ</button>
            </form>
        </div>
    );
}

