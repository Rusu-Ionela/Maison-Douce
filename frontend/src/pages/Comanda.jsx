// frontend/src/pages/Comanda.jsx
import { useState } from "react";
import { creeazaComanda } from "../api/comenzi";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function Comanda() {
    const [loading, setLoading] = useState(false);
    const [mesaj, setMesaj] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMesaj("");

        const comanda = {
            clientId: "66f4a9e2e13c4a77e0a1abcd",
            produse: [{ numeProdus: "Medovik", cantitate: 1 }],
            preferinte: "Decor roz, text IONELA",
            dataLivrare: "2025-10-15",
            oraLivrare: "14:00",
            metodaLivrare: "livrare",
            adresaLivrare: "Str. Florilor 10"
        };

        try {
            const result = await creeazaComanda(comanda); // POST la backend
            setMesaj(result.message || "Comanda creatÄƒ cu succes!");
        } catch (err) {
            setMesaj(err.message || "Eroare la trimitere");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-[80vh] bg-[#fffaf5] flex flex-col items-center justify-center">
            <h1 className="text-3xl font-serif mb-6 text-[#5a2d34]">PlaseazÄƒ o comandÄƒ</h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-6 w-[90%] max-w-md">
                <p className="mb-4 text-sm text-gray-600">
                    CompleteazÄƒ detaliile pentru a comanda tortul tÄƒu personalizat ðŸ’
                </p>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#8b1e3f] text-white rounded-md hover:bg-[#5a2d34] transition"
                >
                    {loading ? "Se trimite..." : "Trimite comanda"}
                </button>
                {mesaj && <p className="mt-4 text-center text-green-600 font-medium">{mesaj}</p>}
            </form>
        </section>
    );
}

