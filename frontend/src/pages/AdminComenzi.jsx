// frontend/src/pages/AdminComenzi.jsx
import React, { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminComenzi() {
    const [comenzi, setComenzi] = useState([]);

    useEffect(() => {
        async function fetchComenzi() {
            try {
                const { data } = await api.get("/comenzi");
                setComenzi(data || []);
            } catch (err) {
                console.error("Eroare la Ã®ncÄƒrcarea comenzilor:", err);
            }
        }
        fetchComenzi();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">ðŸ“¦ Comenzi Personalizate</h1>

            <button
                onClick={() => window.open(`${API.baseURL}/comenzi/export/csv`)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
            >
                ðŸ“¥ ExportÄƒ CSV
            </button>

            {comenzi.length === 0 ? (
                <p>Nu existÄƒ comenzi momentan.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {comenzi.map((comanda) => (
                        <div key={comanda._id} className="border p-4 rounded shadow">
                            <h3 className="text-lg font-semibold mb-1">ðŸ‘¤ {comanda.numeClient || "Client"}</h3>
                            <p className="mb-2">ðŸŽ¨ PreferinÈ›e: {comanda.preferinte || "-"}</p>
                            {!!comanda.imagineGenerata && (
                                <img
                                    src={comanda.imagineGenerata}
                                    alt="Imagine tort"
                                    className="w-full h-40 object-cover rounded"
                                />
                            )}
                            <p className="text-sm text-gray-600 mt-2">
                                ðŸ•’ Data:{" "}
                                {comanda.data ? new Date(comanda.data).toLocaleString() : "â€”"}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

