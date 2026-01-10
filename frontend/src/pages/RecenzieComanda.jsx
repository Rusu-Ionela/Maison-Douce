import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "/src/lib/api.js";

export default function RecenzieComanda({ comandaId }) {
  const params = useParams();
  const resolvedId = comandaId || params.comandaId;
  const [recenzie, setRecenzie] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentariu, setComentariu] = useState("");
  const [foto, setFoto] = useState("");

  useEffect(() => {
    if (!resolvedId) return;
    api
      .get(`/recenzii/comanda/${resolvedId}`)
      .then((res) => setRecenzie(res.data || null))
      .catch(() => setRecenzie(null));
  }, [resolvedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/recenzii/comanda", {
        comandaId: resolvedId,
        nota,
        comentariu,
        foto,
      });
      const res = await api.get(`/recenzii/comanda/${resolvedId}`);
      setRecenzie(res.data || null);
    } catch (err) {
      alert("Eroare la trimiterea recenziei.");
    }
  };

  if (recenzie) {
    return (
      <div className="mt-2 p-2 border rounded bg-green-50">
        <p>Nota: {recenzie.nota}</p>
        <p>Comentariu: {recenzie.comentariu}</p>
        {recenzie.foto && <img src={recenzie.foto} alt="recenzie" className="h-24 mt-2 rounded" />}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-2 border rounded bg-gray-50">
      <label className="block mb-2">Nota:</label>
      <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="border p-1 mb-2">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label className="block mb-2">Comentariu:</label>
      <textarea
        value={comentariu}
        onChange={(e) => setComentariu(e.target.value)}
        placeholder="Scrie un comentariu..."
        className="border p-2 w-full mb-2"
        required
      />

      <label className="block mb-2">Link foto (optional):</label>
      <input
        value={foto}
        onChange={(e) => setFoto(e.target.value)}
        placeholder="https://..."
        className="border p-2 w-full mb-2"
      />

      <button type="submit" className="bg-pink-500 text-white px-3 py-1 rounded">
        Trimite recenzie
      </button>
    </form>
  );
}
