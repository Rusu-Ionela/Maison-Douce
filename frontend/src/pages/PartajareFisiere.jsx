import { useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

export default function PartajareFisiere() {
  const { user } = useAuth() || {};
  const role = user?.rol || user?.role;
  const isAdmin = role === "admin" || role === "patiser";

  const [files, setFiles] = useState([]);
  const [utilizatorId, setUtilizatorId] = useState("");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLink("");

    if (!files.length) {
      setMsg("Selecteaza cel putin un fisier.");
      return;
    }

    const fd = new FormData();
    files.forEach((f) => fd.append("fisiere", f));
    if (isAdmin && utilizatorId.trim()) {
      fd.append("utilizatorId", utilizatorId.trim());
    }

    try {
      setLoading(true);
      const res = await api.post("/partajare/creare", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const shareLink = res.data?.link || "";
      if (!shareLink) {
        setMsg("Linkul nu a putut fi generat.");
        return;
      }
      setLink(shareLink);
      setMsg("Link generat cu succes.");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Eroare la partajare.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Link copiat in clipboard.");
    } catch {
      setMsg("Nu am putut copia linkul.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Partajare fisiere</h1>
      <p className="text-gray-600">
        Incarca imagini sau documente si genereaza un link unic pentru partajare.
      </p>

      {!user && (
        <div className="border rounded p-3 bg-rose-50 text-rose-700">
          Autentifica-te pentru a putea partaja fisiere. <Link to="/login" className="underline">Login</Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="border rounded-lg p-4 bg-white space-y-3">
        {isAdmin && (
          <label className="block text-sm text-gray-700">
            Client ID (optional)
            <input
              value={utilizatorId}
              onChange={(e) => setUtilizatorId(e.target.value)}
              className="border rounded p-2 w-full mt-1"
              placeholder="Utilizator ID"
            />
          </label>
        )}

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        {files.length > 0 && (
          <div className="text-sm text-gray-600">
            Selectate: {files.map((f) => f.name).join(", ")}
          </div>
        )}

        <button
          type="submit"
          className="bg-pink-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Se genereaza..." : "Genereaza link"}
        </button>
      </form>

      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      {link && (
        <div className="border rounded-lg p-4 bg-white space-y-2">
          <div className="font-semibold">Link partajare</div>
          <a href={link} className="text-pink-600 underline break-all">
            {link}
          </a>
          <div>
            <button onClick={copyLink} className="border px-3 py-1 rounded">
              Copiaza linkul
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
