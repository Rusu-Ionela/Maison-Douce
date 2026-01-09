import { useState } from "react";
import api from "/src/lib/api.js";

export default function AdminAlbume() {
  const [utilizatorId, setUtilizatorId] = useState("");
  const [titlu, setTitlu] = useState("");
  const [fisiere, setFisiere] = useState([]);
  const [msg, setMsg] = useState("");
  const [albume, setAlbume] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAlbume = async () => {
    if (!utilizatorId) return;
    try {
      const res = await api.get("/albume", { params: { userId: utilizatorId } });
      setAlbume(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setAlbume([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!utilizatorId.trim()) return setMsg("Introdu utilizatorId.");
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
        utilizatorId,
      });

      setMsg("Album creat si notificat clientul.");
      setTitlu("");
      setFisiere([]);
      await loadAlbume();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la creare album.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Albume (Admin)</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Creare album pentru client</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={utilizatorId}
            onChange={(e) => setUtilizatorId(e.target.value)}
            placeholder="Client ID"
            className="border p-2 w-full rounded"
          />
          <input
            type="text"
            value={titlu}
            onChange={(e) => setTitlu(e.target.value)}
            placeholder="Titlu album"
            className="border p-2 w-full rounded"
          />
          <input type="file" multiple onChange={(e) => setFisiere(Array.from(e.target.files || []))} />
          <button type="submit" className="bg-pink-500 text-white px-4 py-2 rounded" disabled={loading}>
            {loading ? "Se salveaza..." : "Creeaza album"}
          </button>
        </form>
      </div>

      <div className="border rounded-lg p-4 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Albume client</h2>
          <button className="border px-3 py-2 rounded" onClick={loadAlbume}>
            Incarca
          </button>
        </div>
        {albume.length === 0 && <div className="text-gray-600">Nu exista albume.</div>}
        <div className="space-y-4">
          {albume.map((album) => (
            <div key={album._id} className="border p-3 rounded">
              <div className="font-semibold">{album.titlu}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {(album.fisiere || []).map((f, index) => (
                  <img key={index} src={f} alt="Fisier" className="w-full h-32 object-cover rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
