import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, inputs } from "/src/lib/tailwindComponents.js";

export default function AdminAdaugaProdus() {
  const [nume, setNume] = useState("");
  const [pret, setPret] = useState("");
  const [descriere, setDescriere] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const navigate = useNavigate();

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });

    try {
      await api.post("/produse-studio", {
        nume: (nume || "").trim(),
        pret: Number(pret || 0),
        descriere: (descriere || "").trim(),
      });
      setStatus({ type: "success", text: "Produs adaugat cu succes." });
      setNume("");
      setPret("");
      setDescriere("");
      setTimeout(() => navigate("/admin/catalog"), 600);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        text: err?.response?.data?.message || "Eroare la adaugarea produsului.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className={`${cards.elevated} space-y-4`}>
        <h1 className="text-2xl font-bold">Adauga produs (studio)</h1>
        <StatusBanner type={status.type || "info"} message={status.text} />

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className={inputs.default}
            placeholder="Nume"
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            required
            disabled={saving}
          />
          <input
            className={inputs.default}
            type="number"
            placeholder="Pret"
            value={pret}
            onChange={(e) => setPret(e.target.value)}
            required
            disabled={saving}
          />
          <textarea
            className={`${inputs.default} min-h-[110px]`}
            placeholder="Descriere"
            value={descriere}
            onChange={(e) => setDescriere(e.target.value)}
            disabled={saving}
          />
          <button className={buttons.success} disabled={saving}>
            {saving ? "Se salveaza..." : "Salveaza"}
          </button>
        </form>
      </div>
    </div>
  );
}
