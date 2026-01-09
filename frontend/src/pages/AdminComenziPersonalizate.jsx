import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

const STATUS_OPTIONS = ["noua", "in_discutie", "aprobata", "respinsa"];

export default function AdminComenziPersonalizate() {
  const [comenzi, setComenzi] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/comenzi-personalizate", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setComenzi(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Eroare la incarcare comenzi personalizate:", e);
      setComenzi([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateComanda = async (id, payload) => {
    await api.patch(`/comenzi-personalizate/${id}/status`, payload);
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comenzi personalizate</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded p-2"
        >
          <option value="">Toate statusurile</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <div>Se incarca...</div>}

      {comenzi.length === 0 && !loading && (
        <div className="text-gray-600">Nu exista comenzi personalizate.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comenzi.map((c) => (
          <div key={c._id} className="border rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.numeClient || "Client"}</div>
              <span className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-700">{c.status || "noua"}</span>
            </div>
            <div className="text-sm text-gray-600">{new Date(c.data || c.createdAt).toLocaleString()}</div>
            {c.preferinte && <div className="text-sm">Preferinte: {c.preferinte}</div>}

            {c.options && (
              <div className="text-xs text-gray-600">
                {Object.entries(c.options)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" | ")}
              </div>
            )}

            {c.imagine && (
              <img src={c.imagine} alt="Design" className="w-full h-48 object-contain border rounded" />
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                className="border rounded p-2 w-32"
                defaultValue={c.pretEstimat || 0}
                onBlur={(e) => updateComanda(c._id, { pretEstimat: Number(e.target.value || 0) })}
              />
              <span className="text-sm text-gray-600">MDL</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className="border px-2 py-1 rounded text-xs"
                  onClick={() => updateComanda(c._id, { status: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
