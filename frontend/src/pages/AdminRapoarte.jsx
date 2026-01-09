import { useMemo, useState } from "react";
import api, { BASE_URL } from "/src/lib/api.js";

export default function AdminRapoarte() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateRez, setDateRez] = useState("");
  const [comenzi, setComenzi] = useState([]);
  const [torturi, setTorturi] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setMsg("");
    try {
      const res = await api.get("/comenzi");
      setComenzi(Array.isArray(res.data) ? res.data : []);
      const tortRes = await api.get("/torturi", { params: { limit: 200 } });
      setTorturi(Array.isArray(tortRes.data?.items) ? tortRes.data.items : []);
    } catch (e) {
      setMsg("Eroare la incarcare raport.");
    }
  };

  const filtered = useMemo(() => {
    if (!from && !to) return comenzi;
    return comenzi.filter((c) => {
      const d = c.dataLivrare || c.dataRezervare;
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [comenzi, from, to]);

  const totalRevenue = filtered.reduce((sum, c) => sum + Number(c.total || 0), 0);
  const costMap = useMemo(() => {
    const map = new Map();
    torturi.forEach((t) => map.set(String(t._id), Number(t.costEstim || 0)));
    return map;
  }, [torturi]);

  const profitEstim = filtered.reduce((sum, c) => {
    const items = c.items || [];
    const cost = items.reduce((s, it) => {
      const id = it.productId || it.tortId || it._id;
      const costUnit = costMap.get(String(id)) || 0;
      const qty = Number(it.qty || it.cantitate || 1);
      return s + costUnit * qty;
    }, 0);
    return sum + (Number(c.total || 0) - cost);
  }, [filtered, costMap]);
  const totalOrders = filtered.length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Rapoarte</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded p-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded p-2" />
        <button className="border px-3 py-2 rounded" onClick={load}>
          Genereaza raport
        </button>
        <button
          className="border px-3 py-2 rounded"
          onClick={() => window.open(`${BASE_URL}/comenzi/export/csv?from=${from}&to=${to}`, "_blank")}
        >
          Export CSV comenzi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Total comenzi</div>
          <div className="text-2xl font-bold">{totalOrders}</div>
        </div>
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Venituri</div>
          <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} MDL</div>
        </div>
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Profit estimat</div>
          <div className="text-2xl font-bold">{profitEstim.toFixed(2)} MDL</div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Export rezervari pe zi</h2>
        <div className="flex gap-2 items-center">
          <input type="date" value={dateRez} onChange={(e) => setDateRez(e.target.value)} className="border rounded p-2" />
          <button
            className="border px-3 py-2 rounded"
            onClick={() => dateRez && window.open(`${BASE_URL}/calendar/admin/${dateRez}/export`, "_blank")}
          >
            Export CSV rezervari
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">Comenzi (filtrate)</h2>
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {filtered.map((c) => (
            <div key={c._id} className="border-b pb-2 text-sm">
              #{c.numeroComanda || c._id.slice(-6)} - {c.dataLivrare || c.dataRezervare} - {c.status || "plasata"} - {c.total || 0} MDL
            </div>
          ))}
          {filtered.length === 0 && <div className="text-gray-500">Nu exista comenzi in interval.</div>}
        </div>
      </div>
    </div>
  );
}

