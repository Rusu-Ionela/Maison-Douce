import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, inputs } from "/src/lib/tailwindComponents.js";

function normalizeIngredients(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function AdminAddTort() {
  const navigate = useNavigate();
  const [nume, setNume] = useState("");
  const [ingrediente, setIngrediente] = useState("");
  const [imagine, setImagine] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });

    const tortNou = {
      nume: String(nume || "").trim(),
      ingrediente: normalizeIngredients(ingrediente),
      imagine: String(imagine || "").trim(),
    };

    if (!tortNou.ingrediente.length) {
      setSaving(false);
      setStatus({
        type: "warning",
        text: "Introdu cel putin un ingredient separat prin virgula.",
      });
      return;
    }

    try {
      await api.post("/torturi", tortNou);
      setStatus({ type: "success", text: "Tortul a fost adaugat." });
      setNume("");
      setIngrediente("");
      setImagine("");
      setTimeout(() => navigate("/admin/torturi"), 600);
    } catch (error) {
      console.error("Eroare la adaugare:", error);
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Nu am putut adauga tortul.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className={`${cards.elevated} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
            Catalog admin
          </p>
          <h2 className="text-2xl font-bold text-gray-900">Adauga tort nou</h2>
        </div>

        <StatusBanner type={status.type || "info"} message={status.text} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nume tort"
            value={nume}
            onChange={(event) => setNume(event.target.value)}
            className={inputs.default}
            required
            disabled={saving}
          />
          <textarea
            placeholder="Ingrediente separate prin virgula"
            value={ingrediente}
            onChange={(event) => setIngrediente(event.target.value)}
            className={`${inputs.default} min-h-[110px]`}
            required
            disabled={saving}
          />
          <input
            type="text"
            placeholder="URL imagine"
            value={imagine}
            onChange={(event) => setImagine(event.target.value)}
            className={inputs.default}
            required
            disabled={saving}
          />
          <button type="submit" className={buttons.success} disabled={saving}>
            {saving ? "Se salveaza..." : "Adauga tort"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminAddTort;
