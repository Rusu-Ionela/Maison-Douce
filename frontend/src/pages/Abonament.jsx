import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

const planuri = [
  {
    id: "basic",
    nume: "Mini Sweet Box",
    descriere: "Cutie lunara cu 5 mini-prajituri artizanale.",
    pret: 400,
  },
  {
    id: "premium",
    nume: "Maison Deluxe",
    descriere: "Cutie lunara cu 10 deserturi variate + surpriza de sezon.",
    pret: 600,
  },
  {
    id: "deluxe",
    nume: "Royal Experience",
    descriere: "Selectie premium de deserturi + editie speciala lunara.",
    pret: 900,
  },
];

export default function Abonament() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const userId = user?._id || user?.id;

  const [planSelectat, setPlanSelectat] = useState(planuri[0]);
  const [preferinte, setPreferinte] = useState("");
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [abonamentCurent, setAbonamentCurent] = useState(null);

  useEffect(() => {
    if (!userId) {
      setAbonamentCurent(null);
      return;
    }

    api
      .get("/cutie-lunara/me")
      .then((res) => setAbonamentCurent(res.data?.abonament || null))
      .catch(() => setAbonamentCurent(null));
  }, [userId]);

  const handleCheckout = async () => {
    setMesaj("");

    if (!userId) {
      setMesaj("Autentifica-te pentru a continua checkout-ul abonamentului.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/cutie-lunara/checkout", {
        plan: planSelectat.id,
        preferinte,
      });

      const comandaId = data?.comandaId;
      if (!comandaId) {
        setMesaj("Nu am putut crea comanda de abonament.");
        return;
      }

      navigate(`/plata?comandaId=${encodeURIComponent(comandaId)}`);
    } catch (e) {
      setMesaj(e?.response?.data?.message || "Nu am putut porni checkout-ul abonamentului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Abonament Maison Douce</h1>
        <p className="text-gray-600">
          Alege planul, completeaza preferintele si continua in checkout-ul de plata.
          Abonamentul se activeaza automat dupa confirmarea platii.
        </p>
      </header>

      {abonamentCurent?.activ && (
        <div className="border rounded-lg bg-emerald-50 border-emerald-200 p-4 text-sm text-emerald-800">
          Abonament activ: <strong>{abonamentCurent.plan}</strong> ({abonamentCurent.pretLunar} MDL/luna)
        </div>
      )}

      {mesaj && <div className="text-sm text-rose-700">{mesaj}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planuri.map((plan) => {
          const selected = planSelectat?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              className={
                selected
                  ? "text-left border rounded-xl p-4 bg-rose-50 border-rose-300"
                  : "text-left border rounded-xl p-4 bg-white hover:border-rose-300"
              }
              onClick={() => setPlanSelectat(plan)}
            >
              <h3 className="text-lg font-semibold">{plan.nume}</h3>
              <p className="text-sm text-gray-600 mt-1">{plan.descriere}</p>
              <p className="mt-3 font-bold text-rose-700">{plan.pret} MDL / luna</p>
            </button>
          );
        })}
      </div>

      <div className="border rounded-xl p-4 bg-white space-y-3">
        <h2 className="text-xl font-semibold">Detalii abonament</h2>
        <div className="text-sm text-gray-600">
          Plan selectat: <strong>{planSelectat.nume}</strong> - {planSelectat.pret} MDL / luna
        </div>

        <label className="block text-sm text-gray-700">
          Preferinte / alergii (optional)
          <textarea
            className="mt-1 border rounded p-2 w-full min-h-[110px]"
            value={preferinte}
            onChange={(e) => setPreferinte(e.target.value)}
            placeholder="Ex: fara nuci, fara gluten"
          />
        </label>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="bg-rose-600 text-white px-4 py-2 rounded hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Se pregateste checkout-ul..." : "Continua la plata"}
        </button>
      </div>
    </div>
  );
}
