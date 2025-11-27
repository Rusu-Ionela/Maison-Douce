import React, { useEffect, useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function NotificariFoto() {
    const [notificari, setNotificari] = useState([]);

    useEffect(() => {
        const fetchNotificari = async () => {
            const res = await api.get(`http://localhost:5000/api/notificari-foto/${localStorage.getItem('utilizatorId')}`);
            setNotificari(res.data);
        };
        fetchNotificari();
    }, []);

    const citesteNotificare = async (id) => {
        await api.put(`http://localhost:5000/api/notificari-foto/citeste/${id}`);
        setNotificari(notificari.map(n => n._id === id ? { ...n, citit: true } : n));
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4">ðŸ”” NotificÄƒrile Mele</h2>
            {notificari.map((n) => (
                <div key={n._id} className={`border p-2 my-2 ${n.citit ? 'bg-gray-200' : 'bg-white'}`}>
                    <p>{n.mesaj}</p>
                    <p className="text-sm text-gray-500">{new Date(n.data).toLocaleString()}</p>
                    {!n.citit && (
                        <button onClick={() => citesteNotificare(n._id)} className="bg-green-500 text-white px-2 py-1 rounded mt-1">
                            Marcare ca cititÄƒ
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

export default NotificariFoto;

