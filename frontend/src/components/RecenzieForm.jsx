// frontend/src/components/RecenzieForm.jsx
import React, { useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function RecenzieForm({ comandaId, productId, onDone }) {
    const [rating, setRating] = useState(5);
    const [text, setText] = useState("");

    async function submit() {
        try {
            await api("/api/recenzii", {
                method: "POST",
                body: JSON.stringify({ comandaId, productId, rating: Number(rating), text }),
            });
            onDone?.();
        } catch (e) {
            alert(e.message || "Eroare la trimitere recenzie");
        }
    }

    return (
        <div>
            <h4>LasÄƒ o recenzie</h4>
            <label>Rating</label>
            <select value={rating} onChange={e => setRating(e.target.value)}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <label>Comentariu</label>
            <textarea value={text} onChange={e => setText(e.target.value)} />
            <button onClick={submit}>Trimite</button>
        </div>
    );
}

