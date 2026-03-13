import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, inputs } from "/src/lib/tailwindComponents.js";

function AdminEditTort() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nume, setNume] = useState("");
  const [ingrediente, setIngrediente] = useState("");
  const [imagine, setImagine] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/torturi/${id}`);
        if (cancelled) return;
        const tort = res.data;
        setNume(tort.nume || "");
        setIngrediente(Array.isArray(tort.ingrediente) ? tort.ingrediente.join(", ") : "");
        setImagine(tort.imagine || "");
      } catch (err) {
        if (!cancelled) {
          console.error("Eroare la preluare tort:", err);
          setStatus({
            type: "error",
            text: err?.response?.data?.message || "Nu am putut incarca tortul.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });

    const tortActualizat = {
      nume,
      ingrediente: ingrediente.split(",").map((item) => item.trim()).filter(Boolean),
      imagine,
    };

    try {
      await api.put(`/torturi/${id}`, tortActualizat);
      setStatus({ type: "success", text: "Tortul a fost actualizat." });
      setTimeout(() => navigate("/admin/torturi"), 600);
    } catch (err) {
      console.error("Eroare la actualizare:", err);
      setStatus({
        type: "error",
        text: err?.response?.data?.message || "Eroare la actualizare.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className={`${cards.elevated} space-y-4`}>
        <h2 className="text-2xl font-bold">Editare Tort</h2>
        <StatusBanner type={status.type || "info"} message={status.text} />

        {loading ? (
          <div className="text-sm text-gray-600">Se incarca tortul...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nume tort"
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              className={inputs.default}
              required
              disabled={saving}
            />
            <input
              type="text"
              placeholder="Ingrediente (separate prin virgula)"
              value={ingrediente}
              onChange={(e) => setIngrediente(e.target.value)}
              className={inputs.default}
              required
              disabled={saving}
            />
            <input
              type="text"
              placeholder="URL imagine"
              value={imagine}
              onChange={(e) => setImagine(e.target.value)}
              className={inputs.default}
              required
              disabled={saving}
            />
            <button type="submit" className={buttons.primary} disabled={saving}>
              {saving ? "Se salveaza..." : "Salveaza modificarile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminEditTort;
