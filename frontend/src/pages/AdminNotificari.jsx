import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

export default function AdminNotificari() {
  const [notificari, setNotificari] = useState([]);
  const [form, setForm] = useState({ userId: "", titlu: "", mesaj: "", tip: "info" });
  const [msg, setMsg] = useState("");

  const load = async () => {
    const data = (await api.get("/notificari")).data;
    setNotificari(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load().catch(() => setNotificari([]));
  }, []);

  const markAsRead = async (id) => {
    await api.put(`/notificari/${id}/citita`);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/notificari/${id}`);
    load();
  };

  const send = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/notificari", form);
      setMsg("Notificare trimisa.");
      setForm({ userId: "", titlu: "", mesaj: "", tip: "info" });
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la trimitere.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Notificari admin</h1>
      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      <form onSubmit={send} className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={form.userId}
          onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          placeholder="User ID client"
          className="border rounded p-2 md:col-span-1"
          required
        />
        <input
          value={form.titlu}
          onChange={(e) => setForm((f) => ({ ...f, titlu: e.target.value }))}
          placeholder="Titlu"
          className="border rounded p-2 md:col-span-1"
        />
        <input
          value={form.mesaj}
          onChange={(e) => setForm((f) => ({ ...f, mesaj: e.target.value }))}
          placeholder="Mesaj"
          className="border rounded p-2 md:col-span-2"
          required
        />
        <select
          value={form.tip}
          onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
          className="border rounded p-2 md:col-span-1"
        >
          <option value="info">info</option>
          <option value="status">status</option>
          <option value="warning">warning</option>
          <option value="update">update</option>
        </select>
        <button className="bg-pink-500 text-white px-4 py-2 rounded md:col-span-3" type="submit">
          Trimite notificare
        </button>
      </form>

      <div className="space-y-3">
        {notificari.map((n) => (
          <div key={n._id} className="border p-3 rounded bg-white flex justify-between gap-3">
            <div>
              <div className="font-semibold">{n.titlu || "Notificare"}</div>
              <div className="text-sm text-gray-700">{n.mesaj}</div>
              <div className="text-xs text-gray-500">{new Date(n.data).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              {!n.citita && (
                <button onClick={() => markAsRead(n._id)} className="border px-3 py-1 rounded text-sm">
                  Marcat citit
                </button>
              )}
              <button onClick={() => remove(n._id)} className="border px-3 py-1 rounded text-sm">
                Sterge
              </button>
            </div>
          </div>
        ))}
        {notificari.length === 0 && <div className="text-gray-500">Nu exista notificari.</div>}
      </div>
    </div>
  );
}
