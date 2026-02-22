import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";

const TIPURI = ["ingredient", "blat", "crema", "umplutura", "decor", "topping", "culoare", "aroma"];
const UNITATI = ["g", "kg", "ml", "l", "buc"];

function initialForm() {
  return {
    nume: "",
    tip: "ingredient",
    cantitate: 0,
    pragMinim: 0,
    unitate: "g",
    costUnitate: 0,
    pretUnitate: 0,
    dataExpirare: "",
    locatie: "studio",
    observatii: "",
  };
}

function statusLabel(status) {
  if (status === "expirat") return "expirat";
  if (status === "aproape expirat") return "aproape expirat";
  return "bun";
}

export default function PatiserContabilitate() {
  const [dashboard, setDashboard] = useState({ summary: {}, alerts: {}, items: [] });
  const [loading, setLoading] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [filterTip, setFilterTip] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [search, setSearch] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ingrediente/dashboard");
      setDashboard({
        summary: data?.summary || {},
        alerts: data?.alerts || {},
        items: Array.isArray(data?.items) ? data.items : [],
      });
    } catch (e) {
      setMsg(e?.response?.data?.error || "Nu am putut incarca datele de contabilitate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();
    return (dashboard.items || []).filter((item) => {
      if (filterTip && item.tip !== filterTip) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (onlyLowStock && !item.stocScazut) return false;
      if (normalizedSearch && !String(item.nume || "").toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }, [dashboard.items, filterTip, filterStatus, onlyLowStock, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm());
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      nume: item.nume || "",
      tip: item.tip || "ingredient",
      cantitate: Number(item.cantitate || 0),
      pragMinim: Number(item.pragMinim || 0),
      unitate: item.unitate || "g",
      costUnitate: Number(item.costUnitate || 0),
      pretUnitate: Number(item.pretUnitate || 0),
      dataExpirare: item.dataExpirare ? String(item.dataExpirare).slice(0, 10) : "",
      locatie: item.locatie || "studio",
      observatii: item.observatii || "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      ...form,
      cantitate: Number(form.cantitate || 0),
      pragMinim: Number(form.pragMinim || 0),
      costUnitate: Number(form.costUnitate || 0),
      pretUnitate: Number(form.pretUnitate || 0),
    };
    try {
      if (editingId) {
        await api.put(`/ingrediente/${editingId}`, payload);
        setMsg("Ingredient actualizat.");
      } else {
        await api.post("/ingrediente", payload);
        setMsg("Ingredient adaugat.");
      }
      resetForm();
      await loadDashboard();
    } catch (err) {
      setMsg(err?.response?.data?.error || "Nu am putut salva ingredientul.");
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Stergi acest ingredient?")) return;
    try {
      await api.delete(`/ingrediente/${id}`);
      await loadDashboard();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Nu am putut sterge ingredientul.");
    }
  };

  const runAlerts = async () => {
    setCheckingAlerts(true);
    setMsg("");
    try {
      const { data } = await api.post("/ingrediente/check-alerts");
      setMsg(`Verificare completata. Alerte trimise: ${data?.alertsSent || 0}.`);
      await loadDashboard();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Nu am putut rula verificarea alertelor.");
    } finally {
      setCheckingAlerts(false);
    }
  };

  const summary = dashboard.summary || {};

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contabilitate stoc studio</h1>
          <p className="text-gray-600">Gestiune ingrediente, expirari si alerte de suplinire stoc.</p>
        </div>
        <button
          type="button"
          onClick={runAlerts}
          disabled={checkingAlerts}
          className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-rose-700"
        >
          {checkingAlerts ? "Verific..." : "Ruleaza verificare alerte"}
        </button>
      </header>

      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Total ingrediente</div>
          <div className="text-2xl font-bold">{summary.totalItems || 0}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Stoc scazut</div>
          <div className="text-2xl font-bold text-amber-600">{summary.lowStockCount || 0}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Expira curand</div>
          <div className="text-2xl font-bold text-orange-600">{summary.expiringSoonCount || 0}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Expirate</div>
          <div className="text-2xl font-bold text-rose-700">{summary.expiredCount || 0}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Valoare cost estimata</div>
          <div className="text-2xl font-bold">{Number(summary.totalCostValue || 0).toFixed(2)} MDL</div>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          required
          value={form.nume}
          onChange={(e) => setForm((prev) => ({ ...prev, nume: e.target.value }))}
          className="border rounded-lg p-2"
          placeholder="Nume ingredient"
        />
        <select
          value={form.tip}
          onChange={(e) => setForm((prev) => ({ ...prev, tip: e.target.value }))}
          className="border rounded-lg p-2"
        >
          {TIPURI.map((tip) => (
            <option key={tip} value={tip}>
              {tip}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.cantitate}
            onChange={(e) => setForm((prev) => ({ ...prev, cantitate: e.target.value }))}
            className="border rounded-lg p-2"
            placeholder="Cantitate"
            required
          />
          <select
            value={form.unitate}
            onChange={(e) => setForm((prev) => ({ ...prev, unitate: e.target.value }))}
            className="border rounded-lg p-2"
          >
            {UNITATI.map((unitate) => (
              <option key={unitate} value={unitate}>
                {unitate}
              </option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={form.dataExpirare}
          onChange={(e) => setForm((prev) => ({ ...prev, dataExpirare: e.target.value }))}
          className="border rounded-lg p-2"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.pragMinim}
          onChange={(e) => setForm((prev) => ({ ...prev, pragMinim: e.target.value }))}
          className="border rounded-lg p-2"
          placeholder="Prag minim"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.costUnitate}
          onChange={(e) => setForm((prev) => ({ ...prev, costUnitate: e.target.value }))}
          className="border rounded-lg p-2"
          placeholder="Cost/unitate"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.pretUnitate}
          onChange={(e) => setForm((prev) => ({ ...prev, pretUnitate: e.target.value }))}
          className="border rounded-lg p-2"
          placeholder="Pret/unitate"
        />
        <input
          value={form.locatie}
          onChange={(e) => setForm((prev) => ({ ...prev, locatie: e.target.value }))}
          className="border rounded-lg p-2"
          placeholder="Locatie (ex: studio)"
        />
        <input
          value={form.observatii}
          onChange={(e) => setForm((prev) => ({ ...prev, observatii: e.target.value }))}
          className="border rounded-lg p-2 md:col-span-2"
          placeholder="Observatii"
        />
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700">
            {editingId ? "Salveaza modificari" : "Adauga ingredient"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border">
              Renunta
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cauta ingredient"
            className="border rounded-lg p-2 md:col-span-2"
          />
          <select
            value={filterTip}
            onChange={(e) => setFilterTip(e.target.value)}
            className="border rounded-lg p-2"
          >
            <option value="">Toate tipurile</option>
            {TIPURI.map((tip) => (
              <option key={tip} value={tip}>
                {tip}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg p-2"
          >
            <option value="">Toate statusurile</option>
            <option value="bun">bun</option>
            <option value="aproape expirat">aproape expirat</option>
            <option value="expirat">expirat</option>
          </select>
          <label className="border rounded-lg p-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
            />
            doar de suplinit
          </label>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Se incarca datele...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-gray-500">Nu exista ingrediente pentru filtrul curent.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Ingredient</th>
                  <th className="py-2 pr-2">Tip</th>
                  <th className="py-2 pr-2">Stoc</th>
                  <th className="py-2 pr-2">Prag minim</th>
                  <th className="py-2 pr-2">Expirare</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} className="border-b align-top">
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{item.nume}</div>
                      <div className="text-xs text-gray-500">{item.locatie || "studio"}</div>
                    </td>
                    <td className="py-2 pr-2">{item.tip}</td>
                    <td className="py-2 pr-2">
                      {item.cantitate} {item.unitate}
                    </td>
                    <td className="py-2 pr-2">
                      {item.pragMinim || 0} {item.unitate}
                      {item.stocScazut && (
                        <div className="text-xs inline-block ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          de suplinit
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {item.dataExpirare ? new Date(item.dataExpirare).toLocaleDateString() : "-"}
                      <div className="text-xs text-gray-500">
                        {item.zilePanaLaExpirare == null ? "-" : `${item.zilePanaLaExpirare} zile`}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={
                          item.status === "expirat"
                            ? "px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700"
                            : item.status === "aproape expirat"
                            ? "px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700"
                            : "px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"
                        }
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)} className="px-2 py-1 border rounded text-xs">
                          Editeaza
                        </button>
                        <button
                          onClick={() => removeItem(item._id)}
                          className="px-2 py-1 border rounded text-xs text-rose-700"
                        >
                          Sterge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
