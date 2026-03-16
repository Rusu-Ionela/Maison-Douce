import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { badges, buttons, inputs } from "../lib/tailwindComponents";

const TIPURI = [
  "ingredient",
  "blat",
  "crema",
  "umplutura",
  "decor",
  "topping",
  "culoare",
  "aroma",
];
const UNITATI = ["g", "kg", "ml", "l", "buc"];

function emptyForm() {
  return {
    nume: "",
    tip: "ingredient",
    cantitate: "0",
    unitate: "g",
    costUnitate: "0",
    pretUnitate: "0",
    dataExpirare: "",
  };
}

async function fetchIngredients(filterTip) {
  const params = filterTip ? { tip: filterTip } : {};
  const res = await api.get("/ingrediente", { params });
  return Array.isArray(res.data) ? res.data : [];
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getExpiryInfo(value) {
  if (!value) return { label: "Fara data", className: badges.warning };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: "Expirat", className: badges.error };
  if (diffDays <= 7) return { label: "Expira curand", className: badges.warning };
  return { label: "In termen", className: badges.success };
}

export default function AdminProduse() {
  const [items, setItems] = useState([]);
  const [filterTip, setFilterTip] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await fetchIngredients(filterTip);
      setItems(nextItems);
    } catch (error) {
      setItems([]);
      setFeedback({
        type: "error",
        message: error?.response?.data?.error || "Nu am putut incarca ingredientele.",
      });
    } finally {
      setLoading(false);
    }
  }, [filterTip]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        if (!normalizedSearch) return true;
        return `${item.nume || ""} ${item.tip || ""}`.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => String(a.nume || "").localeCompare(String(b.nume || "")));
  }, [items, search]);

  const metrics = useMemo(() => {
    const expiringSoon = items.filter((item) => {
      const info = getExpiryInfo(item.dataExpirare);
      return info.label === "Expira curand";
    }).length;
    const expired = items.filter((item) => {
      const info = getExpiryInfo(item.dataExpirare);
      return info.label === "Expirat";
    }).length;
    const lowStock = items.filter((item) => toNumber(item.cantitate) <= 10).length;

    return [
      {
        label: "Articole stoc",
        value: items.length,
        hint: "Elemente gestionate in inventarul operational.",
        tone: "rose",
      },
      {
        label: "Stoc redus",
        value: lowStock,
        hint: "Cantitate 10 sau mai mica.",
        tone: "gold",
      },
      {
        label: "Expira curand",
        value: expiringSoon,
        hint: "Necesita verificare in urmatoarele 7 zile.",
        tone: "sage",
      },
      {
        label: "Expirate",
        value: expired,
        hint: "Ar trebui retrase sau corectate din evidenta.",
        tone: "slate",
      },
    ];
  }, [items]);

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "info", message: "" });

    const payload = {
      nume: form.nume.trim(),
      tip: form.tip,
      cantitate: toNumber(form.cantitate),
      unitate: form.unitate,
      costUnitate: toNumber(form.costUnitate),
      pretUnitate: toNumber(form.pretUnitate),
      dataExpirare: form.dataExpirare,
    };

    try {
      if (editingId) {
        await api.put(`/ingrediente/${editingId}`, payload);
        setFeedback({ type: "success", message: "Ingredient actualizat." });
      } else {
        await api.post("/ingrediente", payload);
        setFeedback({ type: "success", message: "Ingredient adaugat." });
      }
      resetForm();
      await loadItems();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.error || "Eroare la salvare.",
      });
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      nume: item.nume || "",
      tip: item.tip || "ingredient",
      cantitate: String(item.cantitate || 0),
      unitate: item.unitate || "g",
      costUnitate: String(item.costUnitate || 0),
      pretUnitate: String(item.pretUnitate || 0),
      dataExpirare: item.dataExpirare ? item.dataExpirare.slice(0, 10) : "",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Stergi ingredientul?")) return;

    try {
      await api.delete(`/ingrediente/${id}`);
      setFeedback({ type: "success", message: "Ingredient sters." });
      await loadItems();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.error || "Nu am putut sterge ingredientul.",
      });
    }
  };

  const clearFilters = () => {
    setFilterTip("");
    setSearch("");
  };

  return (
    <AdminShell
      title="Ingrediente si optiuni"
      description="Gestioneaza inventarul de baza, preturile interne si data de expirare pentru tot ce intra in productie."
      actions={
        <>
          {(filterTip || search.trim()) ? (
            <button type="button" className={buttons.outline} onClick={clearFilters}>
              Reseteaza filtrele
            </button>
          ) : null}
          <button type="button" className={buttons.primary} onClick={loadItems}>
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner type={feedback.type} message={feedback.message} />
      <AdminMetricGrid items={metrics} />

      <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
        <AdminPanel
          title={editingId ? "Editeaza articolul" : "Adauga articol nou"}
          description="Valorile numerice sunt normalizate inainte de salvare pentru a evita date incoerente in baza de date."
        >
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Nume
              <input
                value={form.nume}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nume: event.target.value }))
                }
                placeholder="Nume"
                className={`mt-2 ${inputs.default}`}
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tip
                <select
                  value={form.tip}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tip: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                >
                  {TIPURI.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Unitate
                <select
                  value={form.unitate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unitate: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                >
                  {UNITATI.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Cantitate
                <input
                  type="number"
                  value={form.cantitate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cantitate: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Data expirare
                <input
                  type="date"
                  value={form.dataExpirare}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dataExpirare: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Cost / unitate
                <input
                  type="number"
                  value={form.costUnitate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, costUnitate: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Pret / unitate
                <input
                  type="number"
                  value={form.pretUnitate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, pretUnitate: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className={buttons.primary} type="submit">
                {editingId ? "Salveaza modificarile" : "Adauga articolul"}
              </button>
              {editingId ? (
                <button type="button" className={buttons.outline} onClick={resetForm}>
                  Renunta
                </button>
              ) : null}
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Inventar"
          description="Cauta rapid dupa nume si filtreaza dupa tip pentru a vedea doar ce te intereseaza."
        >
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Cautare
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ingredient, crema, topping"
                className={`mt-2 ${inputs.default}`}
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Filtru tip
              <select
                value={filterTip}
                onChange={(event) => setFilterTip(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              >
                <option value="">Toate</option>
                {TIPURI.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[180px] animate-pulse rounded-[24px] border border-rose-100 bg-white/80"
                />
              ))}
            </div>
          ) : null}

          {!loading && filteredItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
              Nu exista articole pentru filtrul curent.
            </div>
          ) : null}

          {!loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const expiryInfo = getExpiryInfo(item.dataExpirare);
                return (
                  <article
                    key={item._id}
                    className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{item.nume}</div>
                        <div className="mt-1 text-sm text-gray-500">{item.tip}</div>
                      </div>
                      <span className={expiryInfo.className}>{expiryInfo.label}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Cantitate
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {item.cantitate} {item.unitate}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Expira
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {item.dataExpirare
                            ? new Date(item.dataExpirare).toLocaleDateString("ro-RO")
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Cost
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {toNumber(item.costUnitate).toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Pret
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {toNumber(item.pretUnitate).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button className={buttons.secondary} onClick={() => startEdit(item)}>
                        Editeaza
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-soft hover:bg-rose-50"
                        onClick={() => remove(item._id)}
                      >
                        Sterge
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
