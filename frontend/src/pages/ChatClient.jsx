import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function ChatClient() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() === '') return;
        const newMessage = { text: input, sender: 'client' };
        setMessages([...messages, newMessage]);
        setInput('');

        // Simulare rÄƒspuns bot
        setTimeout(() => {
            setMessages(prev => [...prev, { text: 'âœ… Am Ã®nÈ›eles. Spune-mi mai multe detalii despre tort!', sender: 'bot' }]);
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-indigo-600">ðŸ’¬ TortBot Chat</h2>
            <div className="h-80 overflow-y-scroll border rounded p-4 mb-4 bg-gray-50">
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-2 ${msg.sender === 'client' ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-block px-3 py-2 rounded ${msg.sender === 'client' ? 'bg-blue-200' : 'bg-green-200'}`}>
                            {msg.text}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 border p-2 rounded"
                    placeholder="Scrie un mesaj..."
                />
                <button onClick={handleSend} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                    Trimite
                </button>
            </div>
        </div>
    );
}

export default ChatClient;

