import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";

export default function RecenzieComanda({ comandaId }) {
  const params = useParams();
  const resolvedId = comandaId || params.comandaId;
  const [recenzie, setRecenzie] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentariu, setComentariu] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!resolvedId) return;
    api
      .get(`/recenzii/comanda/${resolvedId}`)
      .then((res) => setRecenzie(res.data || null))
      .catch(() => setRecenzie(null));
  }, [resolvedId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });

    try {
      let fotoUrl = "";
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const upload = await api.post("/upload", fd);
        fotoUrl = upload.data?.url || "";
      }
      await api.post("/recenzii/comanda", {
        comandaId: resolvedId,
        nota,
        comentariu,
        foto: fotoUrl,
      });
      const res = await api.get(`/recenzii/comanda/${resolvedId}`);
      setRecenzie(res.data || null);
      setPhotoFile(null);
    } catch (err) {
      setStatus({
        type: "error",
        text:
          err?.response?.data?.message || "Eroare la trimiterea recenziei.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (recenzie) {
    return (
      <div className="mt-2 rounded border bg-green-50 p-2">
        <p>Nota: {recenzie.nota}</p>
        <p>Comentariu: {recenzie.comentariu}</p>
        {recenzie.foto && (
          <img src={recenzie.foto} alt="recenzie" className="mt-2 h-24 rounded" />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 rounded border bg-gray-50 p-2">
      <StatusBanner type={status.type || "info"} message={status.text} className="mb-2" />

      <label className="mb-2 block">Nota:</label>
      <select
        value={nota}
        onChange={(e) => setNota(Number(e.target.value))}
        className="mb-2 border p-1"
        disabled={saving}
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label className="mb-2 block">Comentariu:</label>
      <textarea
        value={comentariu}
        onChange={(e) => setComentariu(e.target.value)}
        placeholder="Scrie un comentariu..."
        className="mb-2 w-full border p-2"
        required
        disabled={saving}
      />

      <label className="mb-2 block">Foto (optional):</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
        className="mb-2 w-full border p-2"
        disabled={saving}
      />

      <button
        type="submit"
        className="rounded bg-pink-500 px-3 py-1 text-white disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Se trimite..." : "Trimite recenzie"}
      </button>
    </form>
  );
}
