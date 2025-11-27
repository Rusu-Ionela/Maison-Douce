import React, { useEffect, useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminStats() {
    const [totalComenzi, setTotalComenzi] = useState(0);
    const [totalTorturi, setTotalTorturi] = useState(0);
    const [popularTort, setPopularTort] = useState("");
    const [totalVenituri, setTotalVenituri] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const comenzi = (await api.get("/comenzi")).data ?? [];
                setTotalComenzi(comenzi.length);
                setTotalVenituri(
                    comenzi.reduce((acc, c) => acc + Number(c.total ?? c.subtotal ?? c.pret ?? 0), 0)
                );
            } catch (e) { console.error("Eroare comenzi:", e); }

            try {
                const torturi = (await api.get("/torturi")).data?.items ?? (await api.get("/torturi")).data ?? [];
                setTotalTorturi(Array.isArray(torturi) ? torturi.length : 0);
                if (Array.isArray(torturi) && torturi.length) setPopularTort(torturi[0].nume || torturi[0].name || "");
            } catch (e) { console.error("Eroare torturi:", e); }
        })();
    }, []);

    return (
        <div className="text-center mt-10">
            <h2 className="text-2xl font-bold mb-4">ðŸ“ˆ Statistici PlatformÄƒ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                <div className="border p-4 rounded"><h3>Total Comenzi</h3><p>{totalComenzi}</p></div>
                <div className="border p-4 rounded"><h3>Total Torturi Ã®n Catalog</h3><p>{totalTorturi}</p></div>
                <div className="border p-4 rounded"><h3>Cel Mai Popular Tort</h3><p>{popularTort || "â€”"}</p></div>
                <div className="border p-4 rounded"><h3>Total Venituri</h3><p>{totalVenituri} MDL</p></div>
            </div>
        </div>
    );
}

