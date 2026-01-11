import { useState } from "react";
import api from "/src/lib/api.js";

function ResetareParola() {
  const [email, setEmail] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMesaj("");
    setLink("");
    setLoading(true);
    try {
      const res = await api.post("/reset-parola/send-reset-email", { email });
      setMesaj(res.data?.message || res.data?.mesaj || "Verifica emailul pentru link-ul de resetare.");
      if (res.data?.link) setLink(res.data.link);
    } catch (err) {
      console.error("Eroare:", err);
      setMesaj(err?.response?.data?.message || "Eroare la trimitere email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Resetare parola</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Emailul tau"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-2"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "Se trimite..." : "Trimite email de resetare"}
        </button>
      </form>
      {mesaj && <p className="mt-4">{mesaj}</p>}
      {link && (
        <div className="mt-3 text-sm">
          Link reset:{" "}
          <a className="text-pink-600 underline break-all" href={link}>
            {link}
          </a>
        </div>
      )}
    </div>
  );
}

export default ResetareParola;
