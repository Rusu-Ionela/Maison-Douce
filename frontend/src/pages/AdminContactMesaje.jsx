import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

const STATUS_OPTIONS = ["nou", "in_proces", "rezolvat"];

export default function AdminContactMesaje() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = async (status = statusFilter) => {
    setLoading(true);
    setMsg("");
    try {
      const { data } = await api.get("/contact", {
        params: {
          limit: 200,
          ...(status ? { status } : {}),
        },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setMsg(e?.response?.data?.message || "Nu am putut incarca mesajele de contact.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/contact/${id}/status`, { status });
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Nu am putut actualiza statusul.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mesaje Contact</h1>
        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = e.target.value;
              setStatusFilter(next);
              load(next);
            }}
            className="border rounded p-2"
          >
            <option value="">Toate statusurile</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={() => load()} className="px-3 py-2 border rounded">
            Reincarca
          </button>
        </div>
      </div>

      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      {loading ? (
        <div className="text-gray-600">Se incarca...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-600">Nu exista mesaje pentru filtrul curent.</div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Nume</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Telefon</th>
                <th className="p-3 text-left">Subiect</th>
                <th className="p-3 text-left">Mesaj</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b align-top">
                  <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-medium">{item.nume || "-"}</td>
                  <td className="p-3">{item.email || "-"}</td>
                  <td className="p-3">{item.telefon || "-"}</td>
                  <td className="p-3">{item.subiect || "-"}</td>
                  <td className="p-3 max-w-[320px] whitespace-pre-wrap">{item.mesaj || "-"}</td>
                  <td className="p-3">
                    <select
                      value={item.status || "nou"}
                      onChange={(e) => changeStatus(item._id, e.target.value)}
                      className="border rounded p-1"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
