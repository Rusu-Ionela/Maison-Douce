import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

function RecenziiPrestator() {
  const { prestatorId } = useParams();
  const { user } = useAuth() || {};
  const [recenzii, setRecenzii] = useState([]);
  const [stele, setStele] = useState(5);
  const [comentariu, setComentariu] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!prestatorId) return;
    api
      .get(`/recenzii/prestator/${prestatorId}`)
      .then((res) => setRecenzii(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRecenzii([]));
  }, [prestatorId]);

  const adaugaRecenzie = async () => {
    if (!user?._id) {
      setMsg("Autentifica-te pentru a lasa o recenzie.");
      return;
    }
    if (!comentariu.trim()) {
      setMsg("Adauga un comentariu.");
      return;
    }
    setMsg("");
    try {
      let fotoUrl = "";
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const upload = await api.post("/upload", fd);
        fotoUrl = upload.data?.url || "";
      }
      await api.post("/recenzii/prestator", {
        prestatorId,
        stele,
        comentariu,
        foto: fotoUrl,
      });
      const res = await api.get(`/recenzii/prestator/${prestatorId}`);
      setRecenzii(Array.isArray(res.data) ? res.data : []);
      setComentariu("");
      setPhotoFile(null);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la trimitere recenzie.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Recenzii prestator</h2>
      {recenzii.map((r) => (
        <div key={r._id} className="border p-2 my-2">
          <strong>{r.utilizator || "Client"}</strong> Rating: {r.stele} / 5
          <p>{r.comentariu}</p>
          {r.foto && <img src={r.foto} alt="recenzie" className="h-24 mt-2 rounded" />}
          <p className="text-sm text-gray-500">{new Date(r.data).toLocaleString()}</p>
        </div>
      ))}

      <h3 className="mt-6 text-xl font-bold">Lasa o recenzie</h3>
      {msg && <div className="text-rose-700 text-sm mb-2">{msg}</div>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={stele}
          onChange={(e) => setStele(Number(e.target.value))}
          min="1"
          max="5"
          className="border p-1 w-16"
        />{" "}
        /5 stele
      </div>
      <textarea
        value={comentariu}
        onChange={(e) => setComentariu(e.target.value)}
        placeholder="Comentariu"
        className="border w-full p-2 mt-2"
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
        className="border w-full p-2 mt-2"
      />
      <button onClick={adaugaRecenzie} className="bg-green-500 text-white px-4 py-2 rounded mt-2">
        Trimite recenzie
      </button>
    </div>
  );
}

export default RecenziiPrestator;
