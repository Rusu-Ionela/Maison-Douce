import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

export default function Retete() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    api
      .get("/produse-studio/retete-publice")
      .then((r) => {
        if (!alive) return;
        setItems(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 grid md:grid-cols-2 gap-4">
      {items.map((r) => (
        <article key={r._id} className="border rounded p-4">
          <h2 className="font-semibold">{r.title}</h2>
          <p className="text-sm opacity-80">{r.description}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {(r.ingredients || []).map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
