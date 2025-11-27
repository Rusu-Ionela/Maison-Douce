// src/pages/Fidelizare.jsx
import { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function Fidelizare() {
    const [info, setInfo] = useState(null);
    useEffect(() => { api.get("/fidelizare/me").then(r => setInfo(r.data)); }, []);
    if (!info) return null;
    return (
        <div className="max-w-md mx-auto p-4">
            <h1 className="text-xl mb-2">Punctele mele</h1>
            <p className="mb-4">Total: {info.points}</p>
            {/* buton foloseÈ™te puncteâ€¦ */}
        </div>
    );
}

