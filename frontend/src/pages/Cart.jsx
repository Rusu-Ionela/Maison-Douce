import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../api/orders";
import { buttons, cards, inputs, containers } from "/src/lib/tailwindComponents.js";

export default function Cart() {
  const { items, updateQty, remove, clear, subtotal } = useCart();
  const { user } = useAuth() || {};
  const nav = useNavigate();

  const [metodaLivrare, setMetodaLivrare] = useState("ridicare"); // ridicare | livrare
  const [adresa, setAdresa] = useState("");
  const LIVRARE_FEE = 100;
  const total = subtotal + (metodaLivrare === "livrare" ? LIVRARE_FEE : 0);

  async function checkout() {
    if (!user?._id) {
      alert("AutentificŽŸ-te Arnainte de a continua.");
      nav("/login");
      return;
    }
    if (items.length === 0) {
      alert("CoETul este gol.");
      return;
    }
    if (metodaLivrare === "livrare" && !adresa.trim()) {
      alert("CompleteazŽŸ adresa.");
      return;
    }

    const payload = {
      clientId: user._id,
      items: items.map((it) => ({
        productId: it.id,
        name: it.name,
        qty: it.qty,
        price: it.price,
      })),
      metodaLivrare: metodaLivrare === "livrare" ? "livrare" : "ridicare",
      adresaLivrare: metodaLivrare === "livrare" ? adresa.trim() : undefined,
    };

    try {
      const comanda = await OrdersAPI.create(payload);
      clear();
      nav(`/plata?comandaId=${comanda._id}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Eroare la creare comandŽŸ.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-pink-500 font-semibold uppercase tracking-wide">Checkout</p>
            <h1 className="text-3xl font-bold text-gray-900">CoET</h1>
          </div>
          <span className="text-gray-600">{items.length} produse</span>
        </div>

        {!items.length && (
          <div className={cards.bordered}>
            <p className="text-gray-700 mb-3">CoETul este gol.</p>
            <button className={buttons.outline} onClick={() => nav("/catalog")}>
              Mergi la catalog
            </button>
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {items.map((it) => (
                <div key={it.id} className={`${cards.default} flex items-center gap-4`}>
                  <div className="h-16 w-16 rounded-xl bg-rose-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={it.image || "/images/placeholder.png"}
                      alt={it.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{it.name}</div>
                    <div className="text-pink-600 font-bold">{it.price} MDL</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateQty(it.id, parseInt(e.target.value || 1))}
                    className={`${inputs.default} w-24`}
                  />
                  <button className={buttons.outline} onClick={() => remove(it.id)}>
                    E~terge
                  </button>
                </div>
              ))}
            </div>

            <aside className={cards.elevated}>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Rezumat</h3>

              <label className="block text-sm font-semibold text-gray-700 mb-2">Metoda predŽŸrii</label>
              <select
                value={metodaLivrare}
                onChange={(e) => setMetodaLivrare(e.target.value)}
                className={`${inputs.default} mb-3`}
              >
                <option value="ridicare">Ridicare de la patiserie</option>
                <option value="livrare">Livrare (+100 MDL)</option>
              </select>

              {metodaLivrare === "livrare" && (
                <input
                  className={`${inputs.default} mb-4`}
                  placeholder="AdresŽŸ livrare"
                  value={adresa}
                  onChange={(e) => setAdresa(e.target.value)}
                />
              )}

              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} MDL</span>
                </div>
                {metodaLivrare === "livrare" && (
                  <div className="flex justify-between">
                    <span>TaxŽŸ livrare</span>
                    <span className="font-semibold">{LIVRARE_FEE} MDL</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-1">
                  <span>Total</span>
                  <span className="font-bold text-gray-900">{total.toFixed(2)} MDL</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button className={buttons.outline} onClick={clear}>
                  GoleETte coETul
                </button>
                <button className={buttons.primary} onClick={checkout}>
                  ContinuŽŸ la platŽŸ
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
