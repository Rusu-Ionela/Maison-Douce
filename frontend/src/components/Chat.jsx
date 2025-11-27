import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const socket = io('http://localhost:5000');

function Chat() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('receiveMessage', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off('receiveMessage');
        };
    }, []);

    const sendMessage = () => {
        if (message.trim() !== '') {
            socket.emit('sendMessage', message);
            setMessage('');
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid gray', width: '400px', margin: 'auto' }}>
            <h3>ðŸ’¬ Chat cu TortBot</h3>
            <div style={{ height: '200px', overflowY: 'scroll', border: '1px solid lightgray', padding: '10px' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ margin: '5px 0' }}>{msg}</div>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '300px', marginRight: '10px' }}
            />
            <button onClick={sendMessage}>Trimite</button>
        </div>
    );
}

export default Chat;

