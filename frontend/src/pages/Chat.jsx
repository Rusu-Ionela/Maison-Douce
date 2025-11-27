// src/pages/Chat.jsx
import { useEffect, useRef, useState } from "react";
import api from '/src/lib/api.js';
import { getSocket } from '/src/lib/socket.js';

export default function Chat() {
    const [room, setRoom] = useState(null), [msgs, setMsgs] = useState([]), [text, setText] = useState("");
    const socketRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            // creezi/iei camera pentru comanda curentă sau user (endpoint optional)
            // Dacă serverul are un endpoint pentru room, îl poți folosi; altfel se poate folosi userId
            try {
                const { data } = await api.post("/chat/room-for-user").catch(() => ({ data: { roomId: `user-${localStorage.getItem('userId') || 'anon'}` } }));
                const roomId = data.roomId;
                if (!mounted) return;
                setRoom(roomId);

                // obține istoric mesaje (dacă există)
                try {
                    const res = await api.get(`/mesaje-chat/room/${encodeURIComponent(roomId)}`);
                    if (mounted) setMsgs(res.data || []);
                } catch (e) {
                    console.warn('Nu am putut încărca istoricul:', e?.message || e);
                }

                const socket = getSocket('/'); // base namespace
                socket.connect();
                socket.emit('joinRoom', roomId);
                socket.on('receiveMessage', (m) => {
                    if (!mounted) return;
                    setMsgs(prev => [...prev, m]);
                });
                socketRef.current = socket;
            } catch (err) {
                console.error('Chat init error:', err);
            }
        })();

        return () => {
            mounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect?.();
            }
        };
    }, []);

    const send = async () => {
        if (!text || !room) return;
        const payload = { text, utilizator: localStorage.getItem('username') || 'Client', room, authorId: localStorage.getItem('userId') || undefined };

        // emit via socket
        try {
            socketRef.current?.emit('sendMessage', payload);
        } catch (e) {
            console.warn('Socket emit failed, fallback HTTP:', e?.message || e);
        }

        // optimistic add
        setMsgs(prev => [...prev, { ...payload, at: Date.now() }]);
        setText("");
    };

    return (
        <div className="max-w-xl mx-auto p-4">
            <h1 className="text-lg mb-2">Chat cu patiserul</h1>
            <div className="border rounded h-72 overflow-auto p-2 mb-2">
                {msgs.map((m, i) => <div key={i} className="my-1">{m.author}: {m.text}</div>)}
            </div>
            <div className="flex gap-2">
                <input className="border flex-1 p-2" value={text} onChange={e => setText(e.target.value)} placeholder="Scrie un mesaj..." />
                <button onClick={send} className="border px-3 py-2 rounded">Trimite</button>
            </div>
        </div>
    );
}

