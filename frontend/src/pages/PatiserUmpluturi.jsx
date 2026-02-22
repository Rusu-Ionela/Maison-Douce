import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";

function defaultIngredientRow() {
  return { ingredient: "", qty: 0, unit: "g", note: "" };
}

function defaultForm() {
  return {
    nume: "",
    descriere: "",
    bazaDiametruCm: 20,
    bazaKg: 1,
    ingrediente: [defaultIngredientRow()],
  };
}

export default function PatiserUmpluturi() {
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [targetDiameter, setTargetDiameter] = useState(20);
  const [targetKg, setTargetKg] = useState(1);
  const [manualCoef, setManualCoef] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/umpluturi");
      const list = Array.isArray(data) ? data : [];
      setRecipes(list);
      if (!selectedId && list.length) {
        setSelectedId(list[0]._id);
      }
    } catch (e) {
      setMsg(e?.response?.data?.message || "Nu am putut incarca umpluturile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedRecipe = useMemo(
    () => recipes.find((item) => String(item._id) === String(selectedId)) || null,
    [recipes, selectedId]
  );

  useEffect(() => {
    if (!selectedRecipe) return;
    setTargetDiameter(Number(selectedRecipe.bazaDiametruCm || 20));
    setTargetKg(Number(selectedRecipe.bazaKg || 1));
  }, [selectedRecipe]);

  const diameterCoef = useMemo(() => {
    if (!selectedRecipe) return 1;
    const base = Number(selectedRecipe.bazaDiametruCm || 0);
    const target = Number(targetDiameter || 0);
    if (base <= 0 || target <= 0) return 1;
    return (target * target) / (base * base);
  }, [selectedRecipe, targetDiameter]);

  const kgCoef = useMemo(() => {
    if (!selectedRecipe) return 1;
    const baseKg = Number(selectedRecipe.bazaKg || 0);
    const desiredKg = Number(targetKg || 0);
    if (baseKg <= 0 || desiredKg <= 0) return 1;
    return desiredKg / baseKg;
  }, [selectedRecipe, targetKg]);

  const totalCoef = useMemo(() => {
    const manual = Number(manualCoef || 0);
    if (manual > 0) return manual;
    return diameterCoef * kgCoef;
  }, [manualCoef, diameterCoef, kgCoef]);

  const scaledRows = useMemo(() => {
    if (!selectedRecipe || !Array.isArray(selectedRecipe.ingrediente)) return [];
    return selectedRecipe.ingrediente.map((row) => ({
      ...row,
      scaledQty: (Number(row.qty || 0) * totalCoef).toFixed(2),
    }));
  }, [selectedRecipe, totalCoef]);

  const startCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
  };

  const startEdit = (recipe) => {
    setEditingId(recipe._id);
    setForm({
      nume: recipe.nume || "",
      descriere: recipe.descriere || "",
      bazaDiametruCm: Number(recipe.bazaDiametruCm || 20),
      bazaKg: Number(recipe.bazaKg || 1),
      ingrediente:
        Array.isArray(recipe.ingrediente) && recipe.ingrediente.length
          ? recipe.ingrediente.map((row) => ({ ...row }))
          : [defaultIngredientRow()],
    });
  };

  const updateIngredient = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      ingrediente: prev.ingrediente.map((row, index) =>
        index === idx ? { ...row, [key]: value } : row
      ),
    }));
  };

  const addIngredient = () => {
    setForm((prev) => ({ ...prev, ingrediente: [...prev.ingrediente, defaultIngredientRow()] }));
  };

  const removeIngredient = (idx) => {
    setForm((prev) => ({
      ...prev,
      ingrediente: prev.ingrediente.filter((_, index) => index !== idx),
    }));
  };

  const saveRecipe = async () => {
    const payload = {
      nume: String(form.nume || "").trim(),
      descriere: String(form.descriere || "").trim(),
      bazaDiametruCm: Number(form.bazaDiametruCm || 20),
      bazaKg: Number(form.bazaKg || 1),
      ingrediente: (Array.isArray(form.ingrediente) ? form.ingrediente : [])
        .map((row) => ({
          ingredient: String(row.ingredient || "").trim(),
          qty: Number(row.qty || 0),
          unit: String(row.unit || "g").trim(),
          note: String(row.note || "").trim(),
        }))
        .filter((row) => row.ingredient),
    };
    if (!payload.nume) {
      setMsg("Completeaza numele umpluturii.");
      return;
    }
    if (!payload.ingrediente.length) {
      setMsg("Adauga cel putin un ingredient.");
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      if (editingId) {
        await api.put(`/umpluturi/${editingId}`, payload);
        setMsg("Umplutura a fost actualizata.");
      } else {
        await api.post("/umpluturi", payload);
        setMsg("Umplutura a fost adaugata.");
      }
      await load();
      startCreate();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Nu am putut salva umplutura.");
    } finally {
      setSaving(false);
    }
  };

  const archiveRecipe = async (id) => {
    if (!window.confirm("Arhivezi aceasta umplutura?")) return;
    try {
      await api.delete(`/umpluturi/${id}`);
      if (String(selectedId) === String(id)) setSelectedId("");
      await load();
      setMsg("Umplutura arhivata.");
    } catch (e) {
      setMsg(e?.response?.data?.message || "Nu am putut arhiva umplutura.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Umpluturi si calculator gramaj</h1>
        <p className="text-gray-600">
          Definesti retete de umpluturi si scalezi automat orice gramaj dupa diametru, kg sau coeficient.
        </p>
      </header>

      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista umpluturi</h2>
            <button type="button" onClick={startCreate} className="text-sm text-rose-600 hover:underline">
              + noua
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Se incarca...</div>
          ) : recipes.length === 0 ? (
            <div className="text-sm text-gray-500">Nu exista umpluturi salvate.</div>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-auto pr-1">
              {recipes.map((recipe) => (
                <div
                  key={recipe._id}
                  className={
                    String(selectedId) === String(recipe._id)
                      ? "border rounded-xl p-3 bg-rose-50 border-rose-300"
                      : "border rounded-xl p-3 hover:bg-gray-50"
                  }
                >
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => setSelectedId(recipe._id)}
                  >
                    <div className="font-semibold">{recipe.nume}</div>
                    <div className="text-xs text-gray-500">
                      baza: {recipe.bazaDiametruCm || 20} cm, {recipe.bazaKg || 1} kg
                    </div>
                  </button>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => startEdit(recipe)}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      Editeaza
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveRecipe(recipe._id)}
                      className="text-xs px-2 py-1 border rounded text-rose-700"
                    >
                      Arhiveaza
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? "Editeaza umplutura" : "Adauga umplutura"}</h2>
            <button
              type="button"
              onClick={saveRecipe}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-rose-700"
            >
              {saving ? "Salvez..." : editingId ? "Salveaza" : "Creeaza"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded-lg p-2"
              value={form.nume}
              onChange={(e) => setForm((prev) => ({ ...prev, nume: e.target.value }))}
              placeholder="Nume umplutura"
            />
            <input
              type="number"
              min="1"
              step="1"
              className="border rounded-lg p-2"
              value={form.bazaDiametruCm}
              onChange={(e) => setForm((prev) => ({ ...prev, bazaDiametruCm: Number(e.target.value || 0) }))}
              placeholder="Diametru baza (cm)"
            />
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="border rounded-lg p-2"
              value={form.bazaKg}
              onChange={(e) => setForm((prev) => ({ ...prev, bazaKg: Number(e.target.value || 0) }))}
              placeholder="Kg baza"
            />
          </div>
          <textarea
            className="border rounded-lg p-2 w-full h-20"
            value={form.descriere}
            onChange={(e) => setForm((prev) => ({ ...prev, descriere: e.target.value }))}
            placeholder="Descriere scurta"
          />

          <div className="space-y-2">
            {form.ingrediente.map((row, idx) => (
              <div key={`${row.ingredient}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-lg p-2">
                <input
                  className="md:col-span-4 border rounded-lg p-2"
                  value={row.ingredient}
                  onChange={(e) => updateIngredient(idx, "ingredient", e.target.value)}
                  placeholder="Ingredient"
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="md:col-span-2 border rounded-lg p-2"
                  value={row.qty}
                  onChange={(e) => updateIngredient(idx, "qty", Number(e.target.value || 0))}
                  placeholder="Cantitate"
                />
                <input
                  className="md:col-span-2 border rounded-lg p-2"
                  value={row.unit}
                  onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                  placeholder="Unitate"
                />
                <input
                  className="md:col-span-3 border rounded-lg p-2"
                  value={row.note}
                  onChange={(e) => updateIngredient(idx, "note", e.target.value)}
                  placeholder="Nota"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  disabled={form.ingrediente.length <= 1}
                  className="md:col-span-1 text-xs border rounded-lg p-2 disabled:opacity-50"
                >
                  X
                </button>
              </div>
            ))}
            <button type="button" onClick={addIngredient} className="text-sm text-rose-600 hover:underline">
              + adauga ingredient
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 space-y-4">
        <h2 className="text-xl font-semibold">Calculator conversie gramaj</h2>
        {!selectedRecipe ? (
          <div className="text-sm text-gray-500">Selecteaza o umplutura din lista pentru calcul.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-sm">
                Diametru tinta (cm)
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="mt-1 border rounded-lg p-2 w-full"
                  value={targetDiameter}
                  onChange={(e) => setTargetDiameter(Number(e.target.value || 0))}
                />
              </label>
              <label className="text-sm">
                Kg tinta
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="mt-1 border rounded-lg p-2 w-full"
                  value={targetKg}
                  onChange={(e) => setTargetKg(Number(e.target.value || 0))}
                />
              </label>
              <label className="text-sm">
                Coeficient manual (optional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 border rounded-lg p-2 w-full"
                  value={manualCoef}
                  onChange={(e) => setManualCoef(e.target.value)}
                  placeholder="ex: 2.00"
                />
              </label>
              <div className="text-sm border rounded-lg p-3 bg-rose-50">
                <div>Coef. diametru: {diameterCoef.toFixed(3)}</div>
                <div>Coef. kg: {kgCoef.toFixed(3)}</div>
                <div className="font-semibold">Coef. final: {totalCoef.toFixed(3)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Ingredient</th>
                    <th className="py-2 pr-2">Baza</th>
                    <th className="py-2 pr-2">Scalat</th>
                    <th className="py-2 pr-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {scaledRows.map((row, idx) => (
                    <tr key={`${row.ingredient}-${idx}`} className="border-b">
                      <td className="py-2 pr-2 font-semibold">{row.ingredient}</td>
                      <td className="py-2 pr-2">
                        {row.qty} {row.unit}
                      </td>
                      <td className="py-2 pr-2 text-rose-700 font-semibold">
                        {row.scaledQty} {row.unit}
                      </td>
                      <td className="py-2 pr-2 text-gray-600">{row.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500">
              Formula implicita: cantitate_noua = cantitate_baza * ((diametru_tinta / diametru_baza)^2) * (kg_tinta / kg_baza).
              Daca setezi coeficient manual, acela suprascrie formula.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
