// src/pages/DesignerAI.jsx
import { useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function DesignerAI() {
    const [prompt, setPrompt] = useState("tort 2 etaje, cremÄƒ vanilie, decor trandafiri roz");
    const [img, setImg] = useState(null), [loading, setLoading] = useState(false);
    const generate = async () => {
        setLoading(true);
        try {
            const { data } = await api.post("/ai/generate-cake", { prompt });
            setImg(data.imageUrl); // backend salveazÄƒ È™i returneazÄƒ URL
        } finally { setLoading(false); }
    };
    return (
        <div className="max-w-xl mx-auto p-4">
            <h1 className="text-xl mb-2">Designer AI â€“ previzualizare tort</h1>
            <textarea className="border w-full p-2 h-24" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={generate} className="border px-4 py-2 rounded mt-2">{loading ? "Generezâ€¦" : "GenereazÄƒ"}</button>
            {img && <img src={img} alt="previzualizare tort" className="mt-4 rounded shadow" />}
        </div>
    );
}

