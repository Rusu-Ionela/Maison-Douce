import React, { useEffect, useMemo, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminComenziComplete() {
    const [comenzi, setComenzi] = useState([]);
    const [filtru, setFiltru] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = (await api.get("/comenzi")).data;
                setComenzi(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Eroare:", e);
                setComenzi([]);
            }
        })();
    }, []);

    const comenziFiltrate = useMemo(() =>
        comenzi.filter(c =>
            (filtru === "" || (c.status ?? "").toLowerCase() === filtru.toLowerCase()) &&
            (email === "" || (c.clientEmail ?? "").toLowerCase().includes(email.toLowerCase()))
        ), [comenzi, filtru, email]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">ðŸ“¦ Istoric Comenzi</h2>
            <div className="mb-4 flex gap-4 items-center">
                <label> Status:{" "}
                    <select value={filtru} onChange={e => setFiltru(e.target.value)}>
                        <option value="">Toate</option>
                        <option value="NouÄƒ">NouÄƒ</option>
                        <option value="ConfirmatÄƒ">ConfirmatÄƒ</option>
                        <option value="in_asteptare">ÃŽn aÈ™teptare</option>
                        <option value="platita">PlÄƒtitÄƒ</option>
                        <option value="predat_curierului">Predat curierului</option>
                        <option value="ridicat_client">Ridicat client</option>
                        <option value="livrata">LivratÄƒ</option>
                        <option value="anulata">AnulatÄƒ</option>
                    </select>
                </label>
                <label>Email client:{" "}
                    <input className="border p-1" placeholder="CautÄƒ dupÄƒ email" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
            </div>

            <table className="w-full border text-sm">
                <thead><tr>
                    <th className="border p-2">ID</th>
                    <th className="border p-2">Email Client</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Data</th>
                    <th className="border p-2">PreÈ›</th>
                </tr></thead>
                <tbody>
                    {comenziFiltrate.map((c) => (
                        <tr key={c._id} className="border-b">
                            <td className="p-2">{c._id}</td>
                            <td className="p-2">{c.clientEmail || "â€”"}</td>
                            <td className="p-2">{c.status || "â€”"}</td>
                            <td className="p-2">{new Date(c.createdAt || c.data).toLocaleString()}</td>
                            <td className="p-2">{Number(c.total ?? c.pret ?? 0)} MDL</td>
                        </tr>
                    ))}
                    {comenziFiltrate.length === 0 && (
                        <tr><td className="p-3 text-center" colSpan={5}>Nimic de afiÈ™at.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

