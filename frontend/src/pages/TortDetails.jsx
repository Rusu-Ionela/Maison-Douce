import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ProductsAPI } from "../api/products";
import { useCart } from "../context/CartContext";

export default function TortDetails() {
    const { id } = useParams();
    const { add } = useCart();
    const [tort, setTort] = useState(null);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setTort(await ProductsAPI.get(id)); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <p>Se încarcă...</p>;
    if (!tort) return <p>Nu s-a găsit tortul.</p>;

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold">{tort.nume}</h1>
            {tort.imagine && <img src={tort.imagine} alt={tort.nume} className="mt-4 rounded" />}
            <p className="mt-2">{tort.descriere || ""}</p>
            <p className="mt-2 font-semibold">{tort.pret ? `${tort.pret} MDL/kg` : "Preț la cerere"}</p>
            {Array.isArray(tort.ingrediente) && tort.ingrediente.length > 0 && (
                <div className="mt-3 text-sm opacity-80">Ingrediente: {tort.ingrediente.join(", ")}</div>
            )}

            <div className="mt-4 flex items-center gap-3">
                <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || 1))}
                    className="border rounded p-2 w-24" />
                <button className="btn btn--mint"
                    onClick={() => add({ id: tort._id, name: tort.nume, price: tort.pret || 0, image: tort.imagine, qty })}>
                    Adaugă în coș
                </button>
            </div>
        </div>
    );
}
