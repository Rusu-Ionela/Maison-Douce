import React, { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminNotificari() {
    const [notificari, setNotificari] = useState([]);
    const [loading, setLoading] = useState(true);

    async function fetchNotificari() {
        try {
            const data = (await api.get("/notificari")).data;
            setNotificari(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Eroare la preluarea notificÄƒrilor:", e);
            setNotificari([]);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchNotificari(); }, []);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notificari/${id}/citita`);
            setNotificari((list) => list.map(n => n._id === id ? { ...n, citita: true } : n));
        } catch (e) { console.error("Eroare la marcare ca citit:", e); }
    };

    const deleteNotificare = async (id) => {
        try {
            await api.delete(`/notificari/${id}`);
            setNotificari((list) => list.filter(n => n._id !== id));
        } catch (e) { console.error("Eroare la È™tergerea notificÄƒrii:", e); }
    };

    if (loading) return <div className="p-6">Se Ã®ncarcÄƒâ€¦</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">ðŸ”” NotificÄƒri</h1>
            {notificari.length === 0 ? (
                <p className="text-gray-600">Nu ai notificÄƒri.</p>
            ) : (
                <ul className="space-y-4">
                    {notificari.map((n) => (
                        <li key={n._id} className="border p-4 rounded shadow flex justify-between items-center">
                            <div>
                                <p className={n.citita ? "text-gray-500" : "text-black font-semibold"}>{n.mesaj}</p>
                                <small className="text-gray-400">{new Date(n.data || n.createdAt).toLocaleString()}</small>
                            </div>
                            <div className="flex space-x-2">
                                {!n.citita && (
                                    <button onClick={() => markAsRead(n._id)} className="bg-green-600 text-white px-3 py-1 rounded">
                                        Marcat citit
                                    </button>
                                )}
                                <button onClick={() => deleteNotificare(n._id)} className="bg-red-600 text-white px-3 py-1 rounded">
                                    È˜terge
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

