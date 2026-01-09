import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "/src/lib/api.js";

export default function PlataSucces() {
  const [sp] = useSearchParams();
  const comandaId = sp.get("comandaId");
  const [comanda, setComanda] = useState(null);

  useEffect(() => {
    if (!comandaId) return;
    api
      .get(`/comenzi/${comandaId}`)
      .then((res) => setComanda(res.data))
      .catch(() => setComanda(null));
  }, [comandaId]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Plata reusita</h1>
      <p className="text-gray-700 mb-4">Multumim! Comanda ta a fost confirmata.</p>

      {comanda && (
        <div className="border rounded-lg p-4 bg-white space-y-2">
          <div className="font-semibold">Numar comanda: {comanda.numeroComanda || comanda._id}</div>
          <div>Status initial: {comanda.status || "plasata"}</div>
          <div>Total: {comanda.total} MDL</div>
          <div>
            Livrare: {comanda.dataLivrare || "-"} {comanda.oraLivrare || ""}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link to="/" className="text-pink-600 underline">
          Inapoi la magazin
        </Link>
      </div>
    </div>
  );
}
