import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ro-RO");
}

export default function AdminCatalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/produse-studio", { params: { limit: 500 } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setItems([]);
      setMessage(e?.response?.data?.message || "Eroare la incarcare catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeItem = async (id) => {
    if (!window.confirm("Stergi produsul din catalog?")) return;
    try {
      await api.delete(`/produse-studio/${id}`);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (e) {
      setMessage(e?.response?.data?.message || "Eroare la stergere.");
    }
  };

  const runExpiryCheck = async () => {
    try {
      const { data } = await api.get("/produse-studio/verifica-expirari");
      const summary = data?.summary || {};
      setMessage(
        `Verificare completata: ${summary.verificate || 0} produse, ` +
          `${summary.expirate || 0} expirate, ${summary.expiraCurand || 0} aproape de expirare, ` +
          `${summary.notificariTrimise || 0} notificari trimise.`
      );
    } catch (e) {
      setMessage(e?.response?.data?.message || "Nu am putut rula verificarea expirarii.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Catalog Produse Studio</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runExpiryCheck}
            className="px-3 py-2 rounded border"
          >
            Verifica expirari
          </button>
          <Link
            to="/admin/adauga-produs"
            className="px-3 py-2 rounded bg-emerald-600 text-white"
          >
            Adauga produs
          </Link>
        </div>
      </div>

      {message && <div className="text-sm text-rose-700">{message}</div>}

      {loading ? (
        <div className="text-gray-600">Se incarca...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-600">Nu exista produse in catalog.</div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-3">Nume</th>
                <th className="p-3">Descriere</th>
                <th className="p-3">Pret</th>
                <th className="p-3">Cantitate</th>
                <th className="p-3">Expira</th>
                <th className="p-3">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id} className="border-b align-top">
                  <td className="p-3 font-medium">{it.nume || "-"}</td>
                  <td className="p-3 text-sm text-gray-700">{it.descriere || "-"}</td>
                  <td className="p-3">{Number(it.pret || 0)} MDL</td>
                  <td className="p-3">
                    {Number(it.cantitate || 0)} {it.unitate || "buc"}
                  </td>
                  <td className="p-3">{formatDate(it.dataExpirare)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/edit-produs/${it._id}`}
                        className="px-2 py-1 rounded border text-sm"
                      >
                        Editeaza
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(it._id)}
                        className="px-2 py-1 rounded border text-sm text-rose-700"
                      >
                        Sterge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
