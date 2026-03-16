import { useEffect, useState } from "react";
import StatusBanner from "../components/StatusBanner";
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
  const [reportingReviewId, setReportingReviewId] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!prestatorId) return;
    api
      .get(`/recenzii/prestator/${prestatorId}`)
      .then((res) => setRecenzii(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRecenzii([]));
  }, [prestatorId]);

  const adaugaRecenzie = async () => {
    if (!user?._id) {
      setStatus({
        type: "error",
        text: "Autentifica-te pentru a lasa o recenzie.",
      });
      return;
    }
    if (!comentariu.trim()) {
      setStatus({ type: "error", text: "Adauga un comentariu." });
      return;
    }
    setStatus({ type: "", text: "" });
    try {
      let fotoUrl = "";
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const upload = await api.post("/upload", fd);
        fotoUrl = upload.data?.url || "";
      }
      const response = await api.post("/recenzii/prestator", {
        prestatorId,
        stele,
        comentariu,
        foto: fotoUrl,
      });
      setComentariu("");
      setPhotoFile(null);
      setStatus({
        type: "success",
        text:
          response?.data?.message ||
          "Recenzia a fost trimisa spre moderare si va deveni publica dupa aprobare.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error?.response?.data?.message || "Eroare la trimitere recenzie.",
      });
    }
  };

  const reportReview = async (reviewId) => {
    if (!user?._id) {
      setStatus({
        type: "error",
        text: "Autentifica-te pentru a raporta o recenzie.",
      });
      return;
    }

    setReportingReviewId(reviewId);
    setStatus({ type: "", text: "" });

    try {
      const response = await api.post(`/recenzii/prestator/${reviewId}/report`, {
        reason: "Raportata din pagina prestatorului",
      });
      setStatus({
        type: "success",
        text: response?.data?.message || "Raportarea a fost inregistrata.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error?.response?.data?.message || "Nu am putut raporta recenzia.",
      });
    } finally {
      setReportingReviewId("");
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
          <button
            type="button"
            onClick={() => reportReview(r._id)}
            disabled={reportingReviewId === r._id}
            className="mt-2 rounded border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
          >
            {reportingReviewId === r._id ? "Se raporteaza..." : "Raporteaza abuz"}
          </button>
        </div>
      ))}

      <h3 className="mt-6 text-xl font-bold">Lasa o recenzie</h3>
      <StatusBanner type={status.type || "info"} message={status.text} className="mb-2" />
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
