import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

export default function AbonamentCutieForm() {
  const { user } = useAuth() || {};
  const userId = user?._id || user?.id;
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const initialPlan = sp.get("plan") || "basic";
  const [plan, setPlan] = useState(initialPlan);
  const [preferinte, setPreferinte] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!userId) {
      setMsg("Autentifica-te pentru a porni abonamentul.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/cutie-lunara/checkout", { plan, preferinte });
      const comandaId = data?.comandaId;
      if (!comandaId) {
        setMsg("Nu am putut crea comanda de abonament.");
        return;
      }
      navigate(`/plata?comandaId=${encodeURIComponent(comandaId)}`);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la pornirea checkout-ului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Aboneaza-te la cutia lunara</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm text-gray-700">
          Plan
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 border rounded p-2 w-full">
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="deluxe">Deluxe</option>
          </select>
        </label>

        <label className="block text-sm text-gray-700">
          Preferinte / alergii
          <textarea
            className="mt-1 border rounded p-2 w-full min-h-[90px]"
            value={preferinte}
            onChange={(e) => setPreferinte(e.target.value)}
            placeholder="Ex: fara nuci, fara gluten"
          />
        </label>

        <button type="submit" className="bg-pink-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "Se pregateste checkout-ul..." : "Continua la plata"}
        </button>
      </form>
    </div>
  );
}
