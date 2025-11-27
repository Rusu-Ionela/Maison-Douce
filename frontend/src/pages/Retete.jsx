// src/pages/Retete.jsx
import { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';
export default function Retete() {
    const [items, setItems] = useState([]);
    useEffect(() => { api.get("/produseStudio/retete-publice").then(r => setItems(r.data)); }, []);
    return (
        <div className="max-w-3xl mx-auto p-4 grid md:grid-cols-2 gap-4">
            {items.map(r => (
                <article key={r._id} className="border rounded p-4">
                    <h2 className="font-semibold">{r.title}</h2>
                    <p className="text-sm opacity-80">{r.description}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm">{r.ingredients.map(i => <li key={i}>{i}</li>)}</ul>
                </article>
            ))}
        </div>
    );
}

