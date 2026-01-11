import { useState } from "react";
import api from "/src/lib/api.js";

function CreareAlbum() {
  const [titlu, setTitlu] = useState("");
  const [comandaId, setComandaId] = useState("");
  const [fisiere, setFisiere] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!titlu.trim()) return setMsg("Introdu un titlu.");
    if (!fisiere.length) return setMsg("Selecteaza cel putin un fisier.");

    setLoading(true);
    try {
      const urls = [];
      for (const file of fisiere) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post("/upload", fd);
        if (res.data?.url) urls.push(res.data.url);
      }

      await api.post("/albume", {
        titlu,
        fisiere: urls,
        comandaId: comandaId || undefined,
      });

      setMsg("Album creat cu succes!");
      setTitlu("");
      setComandaId("");
      setFisiere([]);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la creare album.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Creare album</h2>
      {msg && <div className="mb-3 text-sm text-rose-700">{msg}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={titlu}
          onChange={(e) => setTitlu(e.target.value)}
          placeholder="Titlu album"
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="text"
          value={comandaId}
          onChange={(e) => setComandaId(e.target.value)}
          placeholder="Comanda ID (optional)"
          className="border p-2 w-full rounded"
        />
        <input type="file" multiple onChange={(e) => setFisiere(Array.from(e.target.files || []))} />
        <button type="submit" className="bg-pink-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "Se salveaza..." : "Creeaza album"}
        </button>
      </form>
    </div>
  );
}

export default CreareAlbum;
