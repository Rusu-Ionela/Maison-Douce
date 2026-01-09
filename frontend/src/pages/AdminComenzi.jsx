import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";

const STATUSES = ["plasata", "acceptata", "in_lucru", "gata", "livrata", "ridicata", "anulata", "refuzata"];

export default function AdminComenzi() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [schedule, setSchedule] = useState({ id: null, data: "", ora: "" });
  const [refuz, setRefuz] = useState({ id: null, motiv: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/comenzi");
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return list.filter((c) => {
      const okStatus = status ? (c.status || "") === status : true;
      const okDate = date ? c.dataLivrare === date || c.dataRezervare === date : true;
      return okStatus && okDate;
    });
  }, [list, status, date]);

  const updateStatus = async (id, next) => {
    setMsg("");
    try {
      await api.patch(`/comenzi/${id}/status`, { status: next });
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la actualizare status.");
    }
  };

  const submitSchedule = async () => {
    if (!schedule.id || !schedule.data || !schedule.ora) return;
    await api.patch(`/comenzi/${schedule.id}/schedule`, {
      dataLivrare: schedule.data,
      oraLivrare: schedule.ora,
    });
    setSchedule({ id: null, data: "", ora: "" });
    load();
  };

  const submitRefuz = async () => {
    if (!refuz.id) return;
    await api.patch(`/comenzi/${refuz.id}/refuza`, { motiv: refuz.motiv });
    setRefuz({ id: null, motiv: "" });
    load();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Comenzi</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <div className="flex flex-wrap gap-3 items-center">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded p-2">
          <option value="">Toate statusurile</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-2" />
        <button className="border px-3 py-2 rounded" onClick={load}>
          Reincarca
        </button>
      </div>

      {loading && <div>Se incarca...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div key={c._id} className="border rounded-lg p-4 bg-white space-y-2">
            <div className="flex justify-between">
              <div className="font-semibold">#{c.numeroComanda || c._id.slice(-6)}</div>
              <div className="text-sm text-gray-600">{c.status || "plasata"}</div>
            </div>
            <div className="text-sm text-gray-600">
              {c.dataLivrare || c.dataRezervare || "-"} {c.oraLivrare || c.oraRezervare || ""}
            </div>
            <div className="text-sm">
              {(c.items || []).map((it) => `${it.name || it.nume} x${it.qty || it.cantitate || 1}`).join(" | ")}
            </div>
            <div className="text-sm font-semibold">Total: {c.total || 0} MDL</div>
            <div className="text-xs text-gray-500">Plata: {c.paymentStatus || c.statusPlata || "unpaid"}</div>

            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const paid = c.paymentStatus === "paid" || c.statusPlata === "paid";
                const requiresPaid = ["acceptata", "in_lucru", "gata", "livrata", "ridicata", "confirmata"];
                const disabled = !paid && requiresPaid.includes(s);
                return (
                <button
                  key={s}
                  className="border px-2 py-1 rounded text-xs disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => updateStatus(c._id, s)}
                  title={disabled ? "Confirmarea necesita plata" : "Actualizeaza status"}
                >
                  {s}
                </button>
              )})}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <div className="text-sm font-semibold">Reprogramare</div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={schedule.id === c._id ? schedule.data : ""}
                  onChange={(e) => setSchedule({ id: c._id, data: e.target.value, ora: schedule.ora })}
                  className="border rounded p-1"
                />
                <input
                  type="time"
                  value={schedule.id === c._id ? schedule.ora : ""}
                  onChange={(e) => setSchedule({ id: c._id, data: schedule.data, ora: e.target.value })}
                  className="border rounded p-1"
                />
                <button className="border px-2 py-1 rounded text-xs" onClick={submitSchedule}>
                  Salveaza
                </button>
              </div>

              <div className="text-sm font-semibold">Refuza comanda</div>
              <div className="flex gap-2">
                <input
                  value={refuz.id === c._id ? refuz.motiv : ""}
                  onChange={(e) => setRefuz({ id: c._id, motiv: e.target.value })}
                  placeholder="Motiv refuz"
                  className="border rounded p-1 flex-1"
                />
                <button className="border px-2 py-1 rounded text-xs" onClick={submitRefuz}>
                  Refuza
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
