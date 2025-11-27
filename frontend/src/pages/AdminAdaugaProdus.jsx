// frontend/src/pages/AdminAdaugaProdus.jsx
import React, { useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminAdaugaProdus() {
    const [nume, setNume] = useState("");
    const [pret, setPret] = useState("");
    const [descriere, setDescriere] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        try {
            await api.post("/produse-studio", {
                nume: (nume || "").trim(),
                pret: Number(pret || 0),
                descriere: (descriere || "").trim(),
            });
            alert("âœ… Produs adÄƒugat!");
            setNume("");
            setPret("");
            setDescriere("");
        } catch (err) {
            console.error(err);
            alert("âŒ Eroare la adÄƒugarea produsului.");
        }
    }

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">AdaugÄƒ produs (studio)</h1>
            <form onSubmit={onSubmit} className="space-y-3">
                <input
                    className="border p-2 w-full"
                    placeholder="Nume"
                    value={nume}
                    onChange={(e) => setNume(e.target.value)}
                    required
                />
                <input
                    className="border p-2 w-full"
                    type="number"
                    placeholder="PreÈ›"
                    value={pret}
                    onChange={(e) => setPret(e.target.value)}
                    required
                />
                <textarea
                    className="border p-2 w-full"
                    placeholder="Descriere"
                    value={descriere}
                    onChange={(e) => setDescriere(e.target.value)}
                />
                <button className="bg-emerald-600 text-white px-4 py-2 rounded">SalveazÄƒ</button>
            </form>
        </div>
    );
}

