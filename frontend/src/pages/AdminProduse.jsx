import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

const TIPURI = ["ingredient", "blat", "crema", "umplutura", "decor", "topping", "culoare", "aroma"];
const UNITATI = ["g", "kg", "ml", "l", "buc"];

export default function AdminProduse() {
  const [items, setItems] = useState([]);
  const [filterTip, setFilterTip] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nume: "",
    tip: "ingredient",
    cantitate: 0,
    unitate: "g",
    costUnitate: 0,
    pretUnitate: 0,
    dataExpirare: "",
  });
  const [msg, setMsg] = useState("");

  const load = async () => {
    const params = filterTip ? { tip: filterTip } : {};
    const res = await api.get("/ingrediente", { params });
    setItems(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [filterTip]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      nume: "",
      tip: "ingredient",
      cantitate: 0,
      unitate: "g",
      costUnitate: 0,
      pretUnitate: 0,
      dataExpirare: "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editingId) {
        await api.put(`/ingrediente/${editingId}`, form);
        setMsg("Ingredient actualizat.");
      } else {
        await api.post("/ingrediente", form);
        setMsg("Ingredient adaugat.");
      }
      resetForm();
      load();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Eroare la salvare.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      nume: item.nume || "",
      tip: item.tip || "ingredient",
      cantitate: item.cantitate || 0,
      unitate: item.unitate || "g",
      costUnitate: item.costUnitate || 0,
      pretUnitate: item.pretUnitate || 0,
      dataExpirare: item.dataExpirare ? item.dataExpirare.slice(0, 10) : "",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Stergi ingredientul?")) return;
    await api.delete(`/ingrediente/${id}`);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Ingrediente & Optiuni</h1>
      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      <form onSubmit={submit} className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={form.nume}
          onChange={(e) => setForm((f) => ({ ...f, nume: e.target.value }))}
          placeholder="Nume"
          className="border rounded p-2"
          required
        />
        <select
          value={form.tip}
          onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
          className="border rounded p-2"
        >
          {TIPURI.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={form.cantitate}
          onChange={(e) => setForm((f) => ({ ...f, cantitate: e.target.value }))}
          placeholder="Cantitate"
          className="border rounded p-2"
          required
        />
        <select
          value={form.unitate}
          onChange={(e) => setForm((f) => ({ ...f, unitate: e.target.value }))}
          className="border rounded p-2"
        >
          {UNITATI.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={form.costUnitate}
          onChange={(e) => setForm((f) => ({ ...f, costUnitate: e.target.value }))}
          placeholder="Cost/unitate"
          className="border rounded p-2"
        />
        <input
          type="number"
          value={form.pretUnitate}
          onChange={(e) => setForm((f) => ({ ...f, pretUnitate: e.target.value }))}
          placeholder="Pret/unitate"
          className="border rounded p-2"
        />
        <input
          type="date"
          value={form.dataExpirare}
          onChange={(e) => setForm((f) => ({ ...f, dataExpirare: e.target.value }))}
          className="border rounded p-2"
          required
        />
        <div className="flex gap-2 md:col-span-3">
          <button className="bg-pink-500 text-white px-4 py-2 rounded" type="submit">
            {editingId ? "Salveaza" : "Adauga"}
          </button>
          {editingId && (
            <button type="button" className="border px-4 py-2 rounded" onClick={resetForm}>
              Renunta
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold">Filtru tip:</label>
        <select value={filterTip} onChange={(e) => setFilterTip(e.target.value)} className="border rounded p-2">
          <option value="">Toate</option>
          {TIPURI.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it._id} className="border rounded-lg p-3 bg-white">
            <div className="font-semibold">{it.nume}</div>
            <div className="text-sm text-gray-600">
              Tip: {it.tip} | {it.cantitate} {it.unitate}
            </div>
            <div className="text-sm text-gray-600">
              Cost: {it.costUnitate} | Pret: {it.pretUnitate}
            </div>
            <div className="text-xs text-gray-500">Expira: {new Date(it.dataExpirare).toLocaleDateString()}</div>
            <div className="flex gap-2 mt-2">
              <button className="border px-3 py-1 rounded" onClick={() => startEdit(it)}>
                Editeaza
              </button>
              <button className="border px-3 py-1 rounded" onClick={() => remove(it._id)}>
                Sterge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
