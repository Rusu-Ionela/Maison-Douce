import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../api/orders";

export default function Cart() {
    const { items, updateQty, remove, clear, subtotal } = useCart();
    const { user } = useAuth() || {};
    const nav = useNavigate();

    const [metodaLivrare, setMetodaLivrare] = useState("ridicare"); // ridicare | livrare
    const [adresa, setAdresa] = useState("");
    const LIVRARE_FEE = 100;
    const total = subtotal + (metodaLivrare === "livrare" ? LIVRARE_FEE : 0);

    async function checkout() {
        if (!user?._id) { alert("Autentifică-te înainte de a continua."); nav("/login"); return; }
        if (items.length === 0) { alert("Coșul este gol."); return; }
        if (metodaLivrare === "livrare" && !adresa.trim()) { alert("Completează adresa."); return; }

        const payload = {
            clientId: user._id,
            items: items.map(it => ({ productId: it.id, name: it.name, qty: it.qty, price: it.price })),
            metodaLivrare: metodaLivrare === "livrare" ? "livrare" : "ridicare",
            adresaLivrare: metodaLivrare === "livrare" ? adresa.trim() : undefined,
            // opțional: data/ora livrare dacă ai selectate deja
        };

        try {
            const comanda = await OrdersAPI.create(payload);
            clear(); // goliți coșul după creare
            nav(`/plata?comandaId=${comanda._id}`);
        } catch (e) {
            alert(e?.response?.data?.message || "Eroare la creare comandă.");
        }
    }

    return (
        <div className="container" style={{ maxWidth: 900 }}>
            <h1>Coș</h1>

            {!items.length && <p>Coșul e gol.</p>}

            {items.map(it => (
                <div key={it.id} className="flex items-center gap-3 py-2 border-b">
                    <img src={it.image || "/images/placeholder.png"} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    <div className="flex-1">
                        <div className="font-semibold">{it.name}</div>
                        <div>{it.price} MDL</div>
                    </div>
                    <input type="number" min={1} value={it.qty} onChange={(e) => updateQty(it.id, parseInt(e.target.value || 1))}
                        className="border rounded p-1 w-20" />
                    <button className="btn" onClick={() => remove(it.id)}>Șterge</button>
                </div>
            ))}

            {!!items.length && (
                <>
                    <div className="mt-4">
                        <label>Metoda predării:{" "}
                            <select value={metodaLivrare} onChange={(e) => setMetodaLivrare(e.target.value)}>
                                <option value="ridicare">Ridicare de la patiserie</option>
                                <option value="livrare">Livrare (+100 MDL)</option>
                            </select>
                        </label>
                    </div>

                    {metodaLivrare === "livrare" && (
                        <div className="mt-2">
                            <input className="w-full border rounded p-2" placeholder="Adresă livrare"
                                value={adresa} onChange={(e) => setAdresa(e.target.value)} />
                        </div>
                    )}

                    <div className="mt-4">
                        <div>Subtotal: <b>{subtotal.toFixed(2)} MDL</b></div>
                        {metodaLivrare === "livrare" && <div>Taxă livrare: <b>{LIVRARE_FEE} MDL</b></div>}
                        <div style={{ fontSize: 18, marginTop: 6 }}>Total: <b>{total.toFixed(2)} MDL</b></div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <button className="btn" onClick={clear}>Golește coșul</button>
                        <button className="btn btn--mint" onClick={checkout}>Continuă la plată</button>
                    </div>
                </>
            )}
        </div>
    );
}
