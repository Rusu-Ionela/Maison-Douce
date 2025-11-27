import { useEffect, useState } from "react";
import { ProductsAPI } from "../api/products";
import { useCart } from "../context/CartContext";
import "./Catalog.css";

export default function Catalog() {
  const { add } = useCart();
  const [state, setState] = useState({ items: [], loading: true });

  useEffect(() => {
    (async () => {
      try {
        const data = await ProductsAPI.list({ activ: true, limit: 48 });
        setState({ items: data.items || [], loading: false });
      } catch {
        setState({ items: [], loading: false });
      }
    })();
  }, []);

  if (state.loading) return <div className="container catalog">Se încarcă…</div>;

  return (
    <div className="container catalog">
      <div className="title-major">
        <div className="over">Colecțiile noastre</div>
        <h2>Catalog</h2>
      </div>

      <div className="filters">
        <button className="chip active">Toate</button>
        {/* filtre reale ulterior */}
      </div>

      <div className="grid">
        {state.items.map((p) => (
          <article key={p._id} className="card">
            <div className="thumb"><img src={p.imagine || "/images/placeholder.png"} alt={p.nume} /></div>
            <div className="body">
              <h3>{p.nume}</h3>
              <div className="price">{p.pret ? `${p.pret} MDL` : "—"}</div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <a className="btn" href={`/tort/${p._id}`}>Detalii</a>
                <button className="btn btn--mint"
                  onClick={() => add({ id: p._id, name: p.nume, price: p.pret || 0, image: p.imagine, qty: 1 })}>
                  Adaugă în coș
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
