import React, { useEffect, useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function ChatHistory() {
    const [mesaje, setMesaje] = useState([]);

    useEffect(() => {
        api.get('/')
            .then(res => setMesaje(res.data))
            .catch(err => console.error('Eroare:', err));
    }, []);

    return (
        <div className="text-center mt-10">
            <h2 className="text-2xl font-bold mb-4">ðŸ“œ Istoric Mesaje Chat</h2>
            <div className="border p-4">
                {mesaje.map((mesaj, index) => (
                    <div key={index} className="my-2 border-b">
                        <p>{mesaj.text}</p>
                        <p className="text-xs text-gray-500">{new Date(mesaj.data).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatHistory;

