// src/pages/AdminProduse.jsx
import { useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminProduse() {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");

    async function handleUpload(e) {
        e.preventDefault();
        if (!file) return;
        const fd = new FormData();
        fd.append("image", file);
        try {
            const data = await upload("/torturi/upload-imagine", fd);
            setMsg(`OK: ${data?.filename || "Ã®ncÄƒrcat"}`);
        } catch (e) {
            setMsg(`Eroare: ${e?.response?.data?.message || e.message}`);
        }
    }

    return (
        <form onSubmit={handleUpload} className="p-4">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="border px-3 py-1 ml-2">ÃŽncarcÄƒ</button>
            {msg && <p className="mt-2">{msg}</p>}
        </form>
    );
}

