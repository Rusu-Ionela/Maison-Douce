import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { getTodayDateInput } from "../lib/date";
import {
  buildLibraryProductionRecipes,
  scaleProductionRows,
} from "../lib/patiserRecipeScaling";
import { buttons, inputs } from "../lib/tailwindComponents";

function defaultIngredientRow() {
  return { ingredient: "", qty: 0, unit: "g", note: "" };
}

function defaultNewRecipe() {
  return {
    nume: "",
    descriere: "",
    pret: "",
    imagine: "",
    retetaBaseKg: 1,
    ocazii: "",
    ingredients: [defaultIngredientRow()],
  };
}

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function formatScaledValue(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

const STATUS_META = {
  livrata: { label: "Livrata", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ridicata: { label: "Ridicata", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  gata: { label: "Gata", className: "border-sky-200 bg-sky-50 text-sky-700" },
  confirmata: { label: "Confirmata", className: "border-sky-200 bg-sky-50 text-sky-700" },
  acceptata: { label: "Acceptata", className: "border-sky-200 bg-sky-50 text-sky-700" },
  in_lucru: { label: "In lucru", className: "border-amber-200 bg-amber-50 text-amber-800" },
  in_asteptare: { label: "In asteptare", className: "border-amber-200 bg-amber-50 text-amber-800" },
  plasata: { label: "Plasata", className: "border-amber-200 bg-amber-50 text-amber-800" },
  noua: { label: "Noua", className: "border-amber-200 bg-amber-50 text-amber-800" },
  comanda_generata: { label: "Comanda generata", className: "border-sky-200 bg-sky-50 text-sky-700" },
};

const PAYMENT_META = {
  paid: { label: "Platita", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  unpaid: { label: "Neplatita", className: "border-rose-200 bg-rose-50 text-rose-700" },
  estimare: { label: "Estimare", className: "border-slate-200 bg-slate-100 text-slate-700" },
};

function getChipMeta(map, rawValue, fallbackLabel) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  const meta = map[normalized];
  if (meta) return meta;
  return {
    label: fallbackLabel || String(rawValue || "Nespecificat"),
    className: "border-slate-200 bg-slate-100 text-slate-700",
  };
}

function formatProductionMethodLabel(order) {
  if (order?.source === "personalizata") return "Brief personalizat";
  if (order?.method === "livrare") return "Livrare";
  if (order?.method === "ridicare") return "Ridicare";
  return order?.method || "Ridicare";
}

function summarizePersonalizari(personalizari = {}) {
  if (!personalizari || typeof personalizari !== "object") return "";

  const pairs = [
    ["mesaj", personalizari.mesaj],
    ["decor", personalizari.decor],
    ["crema", personalizari.crema],
    ["marime", personalizari.marime],
    ["etaje", personalizari.tiers],
    ["inaltime", personalizari.heightProfile],
  ];

  return pairs
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join(" | ");
}

function mapRowsForForm(rows = []) {
  return rows.length
    ? rows.map((row) => ({
        ingredient: row.ingredient || "",
        qty: Number(row.qty || 0),
        unit: row.unit || "g",
        note: row.note || "",
      }))
    : [defaultIngredientRow()];
}

export default function AdminProduction() {
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState([]);
  const [board, setBoard] = useState([]);
  const [date, setDate] = useState(getTodayDateInput());
  const [selectedTort, setSelectedTort] = useState("");
  const [targetKg, setTargetKg] = useState(1);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [msg, setMsg] = useState("");
  const [editIngredients, setEditIngredients] = useState([defaultIngredientRow()]);
  const [baseKgInput, setBaseKgInput] = useState(1);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeNotice, setRecipeNotice] = useState("");
  const [newRecipeForm, setNewRecipeForm] = useState(() => defaultNewRecipe());
  const [newRecipeMsg, setNewRecipeMsg] = useState("");
  const [newRecipeSaving, setNewRecipeSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const libraryRecipes = useMemo(() => buildLibraryProductionRecipes(), []);
  const allRecipes = useMemo(() => [...recipes, ...libraryRecipes], [recipes, libraryRecipes]);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const { data } = await api.get("/notificari");
      setNotifications(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (error) {
      console.error("Nu pot incarca notificarile.", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingRecipes(true);
      try {
        const { data } = await api.get("/admin/production/recipes");
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setRecipes(list);
        if (list.length) {
          setSelectedTort((current) => current || list[0]._id);
        }
      } catch {
        if (!cancelled) {
          setMsg("Nu am putut incarca retetele.");
        }
      } finally {
        if (!cancelled) {
          setLoadingRecipes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingBoard(true);
      try {
        const { data } = await api.get("/admin/production/board", { params: { date } });
        if (!cancelled) {
          setBoard(data.board || []);
        }
      } catch {
        if (!cancelled) {
          setMsg("Nu am putut incarca boardul de productie.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBoard(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!allRecipes.length) return;

    const requestedLibrarySlug = String(searchParams.get("libraryRecipe") || "").trim();
    const requestedTargetKg = Number(searchParams.get("targetKg") || 0);
    const preferredId = requestedLibrarySlug ? `library:${requestedLibrarySlug}` : "";

    if (preferredId && allRecipes.some((item) => String(item._id) === preferredId)) {
      setSelectedTort(preferredId);
    } else if (!selectedTort) {
      setSelectedTort(allRecipes[0]._id);
    }

    if (requestedTargetKg > 0) {
      setTargetKg(requestedTargetKg);
    }
  }, [allRecipes, searchParams, selectedTort]);

  const recipe = useMemo(
    () => allRecipes.find((item) => String(item._id) === String(selectedTort)) || null,
    [allRecipes, selectedTort]
  );

  useEffect(() => {
    if (!recipe) {
      setEditIngredients([defaultIngredientRow()]);
      setBaseKgInput(1);
      return;
    }

    setRecipeNotice("");
    setBaseKgInput(Number(recipe.retetaBaseKg || 1) || 1);
    setEditIngredients(mapRowsForForm(Array.isArray(recipe.reteta) ? recipe.reteta : []));
  }, [recipe]);

  const scaledIngredients = useMemo(() => {
    if (!recipe || !Array.isArray(recipe.reteta)) return [];

    return scaleProductionRows(recipe.reteta, recipe.retetaBaseKg || 1, targetKg).map((item) => ({
      ...item,
      scaledLabel:
        item.scaledQty == null ? "" : `${formatScaledValue(item.scaledQty)} ${item.unit}`,
    }));
  }, [recipe, targetKg]);

  const ingredientRows = editIngredients.length ? editIngredients : [defaultIngredientRow()];
  const newIngredientRows = newRecipeForm.ingredients.length
    ? newRecipeForm.ingredients
    : [defaultIngredientRow()];

  const updateIngredient = (idx, key, value) => {
    setEditIngredients((current) =>
      current.map((ingredient, index) =>
        index === idx ? { ...ingredient, [key]: value } : ingredient
      )
    );
  };

  const addIngredient = () => {
    setEditIngredients((current) => [...current, defaultIngredientRow()]);
  };

  const removeIngredient = (idx) => {
    setEditIngredients((current) => current.filter((_, index) => index !== idx));
  };

  const updateNewRecipeField = (key, value) => {
    setNewRecipeForm((current) => ({ ...current, [key]: value }));
  };

  const updateNewIngredient = (idx, key, value) => {
    setNewRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, index) =>
        index === idx ? { ...ingredient, [key]: value } : ingredient
      ),
    }));
  };

  const addNewIngredient = () => {
    setNewRecipeForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, defaultIngredientRow()],
    }));
  };

  const removeNewIngredient = (idx) => {
    setNewRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, index) => index !== idx),
    }));
  };

  const copyCurrentRecipeToNewForm = () => {
    if (!recipe) return;

    setNewRecipeForm({
      nume: `${recipe.nume} - productie`,
      descriere: recipe.descriere || "",
      pret: "",
      imagine: "",
      retetaBaseKg: Number(recipe.retetaBaseKg || 1) || 1,
      ocazii: Array.isArray(recipe.ocazii) ? recipe.ocazii.join(", ") : "",
      ingredients: mapRowsForForm(Array.isArray(recipe.reteta) ? recipe.reteta : []),
    });
    setNewRecipeMsg("Reteta selectata a fost copiata in formularul de reteta noua.");
  };

  const createRecipe = async () => {
    if (!newRecipeForm.nume.trim()) {
      setNewRecipeMsg("Completeaza numele tortului.");
      return;
    }
    if (!newRecipeForm.ingredients.some((ingredient) => ingredient.ingredient?.trim())) {
      setNewRecipeMsg("Adauga cel putin un ingredient.");
      return;
    }

    setNewRecipeSaving(true);
    setNewRecipeMsg("");
    try {
      const payload = {
        nume: newRecipeForm.nume.trim(),
        descriere: newRecipeForm.descriere.trim(),
        pret: Number(newRecipeForm.pret || 0),
        imagine: newRecipeForm.imagine.trim(),
        retetaBaseKg: Number(newRecipeForm.retetaBaseKg || 1) || 1,
        ocazii: String(newRecipeForm.ocazii || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        reteta: newIngredientRows.map((ingredient) => ({
          ingredient: String(ingredient.ingredient || "").trim(),
          qty: Number(ingredient.qty || 0),
          unit: String(ingredient.unit || "g").trim(),
          note: String(ingredient.note || "").trim(),
        })),
      };

      const { data } = await api.post("/admin/production/recipes", payload);
      if (data?.tort) {
        setRecipes((current) => [...current, data.tort]);
        setSelectedTort(data.tort._id);
        setNewRecipeMsg("Reteta a fost creata.");
        setNewRecipeForm(defaultNewRecipe());
      } else {
        setNewRecipeMsg("Nu am creat reteta.");
      }
    } catch (error) {
      setNewRecipeMsg(error?.response?.data?.message || "Nu am putut crea reteta.");
    } finally {
      setNewRecipeSaving(false);
    }
  };

  const saveRecipe = async () => {
    if (!recipe || recipe.isLibrary) return;

    setRecipeNotice("");
    setSavingRecipe(true);
    try {
      const payload = {
        retetaBaseKg: Number(baseKgInput) || 1,
        reteta: ingredientRows.map((ingredient) => ({
          ingredient: String(ingredient.ingredient || "").trim(),
          qty: Number(ingredient.qty || 0),
          unit: String(ingredient.unit || "g").trim(),
          note: String(ingredient.note || ""),
        })),
      };

      const { data } = await api.put(`/admin/production/recipes/${recipe._id}`, payload);
      if (Array.isArray(data?.tort?.reteta)) {
        setRecipes((current) =>
          current.map((item) =>
            String(item._id) === String(data.tort._id) ? { ...item, ...data.tort } : item
          )
        );
        setRecipeNotice("Reteta a fost salvata.");
      } else {
        setRecipeNotice("Reteta nu a fost actualizata.");
      }
    } catch (error) {
      setRecipeNotice(error?.response?.data?.message || "Nu am putut salva reteta.");
    } finally {
      setSavingRecipe(false);
    }
  };

  const refreshAll = async () => {
    setMsg("");
    setLoadingRecipes(true);
    setLoadingBoard(true);
    setLoadingNotifications(true);

    try {
      const [recipesResponse, boardResponse, notificationsResponse] = await Promise.all([
        api.get("/admin/production/recipes"),
        api.get("/admin/production/board", { params: { date } }),
        api.get("/notificari"),
      ]);

      const recipeList = Array.isArray(recipesResponse.data) ? recipesResponse.data : [];
      const boardList = boardResponse.data?.board || [];
      const notificationsList = Array.isArray(notificationsResponse.data)
        ? notificationsResponse.data.slice(0, 5)
        : [];

      setRecipes(recipeList);
      setBoard(boardList);
      setNotifications(notificationsList);

      if (recipeList.length) {
        setSelectedTort((current) => {
          const currentStillInDb = recipeList.some((item) => String(item._id) === String(current));
          const currentIsLibrary = String(current || "").startsWith("library:");
          if (currentIsLibrary) return current;
          return currentStillInDb ? current : recipeList[0]._id;
        });
      }
    } catch {
      setMsg("Nu am putut reincarca datele de productie.");
    } finally {
      setLoadingRecipes(false);
      setLoadingBoard(false);
      setLoadingNotifications(false);
    }
  };

  const metrics = useMemo(() => {
    const plannedKg = board.reduce((sum, order) => sum + Number(order.weightKg || 0), 0);
    const boardValue = board.reduce(
      (sum, order) => sum + Number(order.total || order.totalFinal || 0),
      0
    );
    const deliveries = board.filter((order) => order.method === "livrare").length;
    const pickups = board.filter((order) => order.method !== "livrare").length;
    const unpaidOrders = board.filter(
      (order) => String(order.payment || "").trim().toLowerCase() !== "paid"
    ).length;

    return [
      {
        label: "Retete disponibile",
        value: allRecipes.length,
        hint: `${recipes.length} in baza de date si ${libraryRecipes.length} in biblioteca.`,
        tone: "rose",
      },
      {
        label: "Comenzi in board",
        value: board.length,
        hint: `${deliveries} livrari, ${pickups} ridicari pentru ${date}.`,
        tone: "sage",
      },
      {
        label: "Kg planificate",
        value: `${plannedKg.toFixed(1)} kg`,
        hint: `Valoare cumulata: ${formatCurrency(boardValue)}.`,
        tone: "gold",
      },
      {
        label: "Notificari recente",
        value: notifications.length,
        hint: `${unpaidOrders} comenzi in board fara plata confirmata.`,
        tone: "slate",
      },
    ];
  }, [allRecipes.length, board, date, libraryRecipes.length, notifications.length, recipes.length]);

  return (
    <AdminShell
      title="Productie si retete"
      description="Scaleaza retetele in functie de volum, verifica board-ul zilei si gestioneaza rapid catalogul tehnic folosit de laborator."
      actions={
        <button
          type="button"
          onClick={refreshAll}
          className={buttons.outline}
          disabled={loadingRecipes || loadingBoard || loadingNotifications}
        >
          Reincarca datele
        </button>
      }
    >
      <StatusBanner type="error" message={msg} />
      <AdminMetricGrid items={metrics} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <AdminPanel
          title="Scalare retete"
          description="Selecteaza reteta, seteaza cantitatea tinta si vezi instant gramajele necesare pentru productie."
          className="space-y-6"
        >
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Tort</label>
            <select
              value={selectedTort}
              onChange={(event) => setSelectedTort(event.target.value)}
              className={inputs.default}
            >
              {recipes.length ? (
                <optgroup label="Retete din baza de date">
                  {recipes.map((tort) => (
                    <option key={tort._id} value={tort._id}>
                      {tort.nume}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {libraryRecipes.length ? (
                <optgroup label="Biblioteca de cercetare">
                  {libraryRecipes.map((tort) => (
                    <option key={tort._id} value={tort._id}>
                      {tort.nume} (biblioteca)
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>

            <label className="block text-sm font-semibold text-gray-700">
              Kilograme dorite
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={targetKg}
                onChange={(event) => setTargetKg(Number(event.target.value || 0))}
                className={`mt-2 ${inputs.default}`}
              />
            </label>

            <div className="text-sm text-gray-500">
              {recipe
                ? `Reteta de baza: ${recipe.retetaBaseKg || 1} kg`
                : "Selecteaza un tort pentru reteta."}
            </div>

            {recipe?.isLibrary ? (
              <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
                Ai selectat o reteta din biblioteca interna. O poti scala aici si o poti copia in
                formularul de reteta noua daca vrei sa o salvezi permanent in baza de date.
              </div>
            ) : null}
          </div>

          <div className="min-h-[160px] space-y-2 rounded-xl border border-rose-100 bg-rose-50 p-3">
            {loadingRecipes ? (
              <div className="text-sm text-gray-500">Se incarca retetele...</div>
            ) : recipe && scaledIngredients.length > 0 ? (
              scaledIngredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.ingredient}-${ingredient.unit}-${index}`}
                  className="rounded-lg border bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold">{ingredient.ingredient}</div>
                      {ingredient.group ? (
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8d775c]">
                          {ingredient.group}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-gray-700">
                      {ingredient.scaledLabel || "dupa gust / nescalabil"}
                    </div>
                  </div>
                  {ingredient.note ? (
                    <div className="mt-2 text-xs text-gray-500">{ingredient.note}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                Reteta nu contine ingrediente detaliate.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-rose-100 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-rose-600">Reteta</p>
                <h3 className="text-xl font-semibold text-gray-900">Editeaza ingredientele</h3>
                <p className="text-xs text-gray-500">
                  Retetele din biblioteca sunt doar pentru consultare si scalare.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipe?.isLibrary ? (
                  <button
                    type="button"
                    onClick={copyCurrentRecipeToNewForm}
                    className={buttons.outline}
                  >
                    Copiaza in reteta noua
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveRecipe}
                  disabled={!recipe || recipe?.isLibrary || savingRecipe}
                  className={buttons.primary}
                >
                  {savingRecipe ? "Salvez..." : "Salveaza reteta"}
                </button>
              </div>
            </div>

            {recipe?.isLibrary ? (
              <div className="space-y-3">
                <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
                  Fisa tehnica selectata provine din biblioteca de cercetare. Pentru editare
                  permanenta, foloseste butonul de copiere si salveaza apoi o reteta noua.
                </div>
                <Link to="/admin/retete" className={buttons.outline}>
                  Deschide biblioteca completa
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Kg baza
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={baseKgInput}
                      onChange={(event) => setBaseKgInput(Number(event.target.value || 0))}
                      className={`mt-1 ${inputs.default}`}
                    />
                  </label>
                  <div className="text-sm text-gray-500">
                    {recipe ? `Setat pentru ${recipe.nume}` : "Selecteaza un tort pentru date."}
                  </div>
                </div>

                <div className="space-y-3">
                  {ingredientRows.map((ingredient, idx) => (
                    <div
                      key={`${ingredient.ingredient}-${idx}`}
                      className="rounded-lg border bg-rose-50 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-12">
                        <input
                          className={`sm:col-span-5 ${inputs.default}`}
                          type="text"
                          placeholder="Ingredient"
                          value={ingredient.ingredient}
                          onChange={(event) =>
                            updateIngredient(idx, "ingredient", event.target.value)
                          }
                        />
                        <input
                          className={`sm:col-span-2 ${inputs.default}`}
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Cantitate"
                          value={ingredient.qty}
                          onChange={(event) =>
                            updateIngredient(idx, "qty", Number(event.target.value || 0))
                          }
                        />
                        <input
                          className={`sm:col-span-2 ${inputs.default}`}
                          type="text"
                          placeholder="Unitate"
                          value={ingredient.unit}
                          onChange={(event) => updateIngredient(idx, "unit", event.target.value)}
                        />
                        <input
                          className={`sm:col-span-3 ${inputs.default}`}
                          type="text"
                          placeholder="Note"
                          value={ingredient.note}
                          onChange={(event) => updateIngredient(idx, "note", event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          disabled={ingredientRows.length <= 1}
                          className="mt-1 text-xs text-rose-700 hover:underline sm:col-span-12"
                        >
                          Sterge ingredient
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-rose-600 hover:underline"
                  >
                    + Adauga ingredient
                  </button>
                  {recipeNotice ? <span className="text-rose-700">{recipeNotice}</span> : null}
                </div>
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Board productie"
          description="Ecran de lucru pentru laborator: deadline, metoda de predare, status, plata, note si referinte vizuale."
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Program productie</h2>
              <p className="text-sm text-gray-500">
                Selecteaza ziua pentru lista comenzilor.
              </p>
            </div>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputs.default}
            />
          </div>

          {loadingBoard ? (
            <div className="text-gray-600">Se incarca board-ul...</div>
          ) : board.length === 0 ? (
            <div className="text-gray-600">Nu exista comenzi pentru data selectata.</div>
          ) : (
            <div className="space-y-4">
              {board.map((order) => {
                const methodLabel = formatProductionMethodLabel(order);
                const totalValue = Number(order.total || order.totalFinal || 0);
                const statusMeta = getChipMeta(
                  STATUS_META,
                  order.status,
                  order.status || "Noua"
                );
                const paymentMeta = getChipMeta(
                  PAYMENT_META,
                  order.payment,
                  order.payment || "Necunoscut"
                );
                const referenceImages = Array.isArray(order.referenceImages)
                  ? order.referenceImages.filter(Boolean)
                  : order.image
                    ? [order.image]
                    : [];
                const detailTarget =
                  order.source === "personalizata"
                    ? "/admin/comenzi-personalizate"
                    : "/admin/comenzi";

                return (
                  <article
                    key={order.orderId}
                    className="rounded-[28px] border border-rose-100 bg-[rgba(255,249,242,0.9)] p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                          {order.data} | {order.time || "ora nedefinita"}
                        </div>
                        <div className="text-xl font-semibold text-gray-900">
                          {order.numeroComanda || order.orderId}
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.clientName || order.clientId || "Client necunoscut"}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7d6655]">
                          {methodLabel}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${paymentMeta.className}`}
                        >
                          {paymentMeta.label}
                        </span>
                        {order.source ? (
                          <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d6655]">
                            {order.source}
                          </span>
                        ) : null}
                        <Link to={detailTarget} className={buttons.outline}>
                          Deschide comanda
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[150px,1fr]">
                      <div className="space-y-3">
                        <div className="h-32 overflow-hidden rounded-[22px] border border-rose-100 bg-white">
                          {referenceImages[0] ? (
                            <img
                              src={referenceImages[0]}
                              alt="Referinta productie"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
                              Fara referinta vizuala
                            </div>
                          )}
                        </div>

                        {referenceImages.length > 1 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {referenceImages.slice(1, 4).map((imageUrl, index) => (
                              <a
                                key={`${order.orderId}-thumb-${index}`}
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-[16px] border border-rose-100 bg-white"
                              >
                                <img
                                  src={imageUrl}
                                  alt="Referinta suplimentara"
                                  className="h-16 w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Client
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-gray-700">
                            <div className="font-semibold text-gray-900">
                              {order.clientName || order.clientId || "Client necunoscut"}
                            </div>
                            {order.clientPhone ? <div>Telefon: {order.clientPhone}</div> : null}
                            {order.clientEmail ? <div>Email: {order.clientEmail}</div> : null}
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Predare
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-gray-700">
                            <div className="font-semibold text-gray-900">{methodLabel}</div>
                            {order.address ? <div>Adresa: {order.address}</div> : null}
                            {order.deliveryWindow ? <div>Interval: {order.deliveryWindow}</div> : null}
                            {order.deliveryInstructions ? (
                              <div>Instructiuni: {order.deliveryInstructions}</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Comanda
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-gray-700">
                            <div>Greutate estimata: {Number(order.weightKg || 0).toFixed(1)} kg</div>
                            <div>Total: {formatCurrency(totalValue)}</div>
                            {order.customDescription ? <div>Brief: {order.customDescription}</div> : null}
                            <div className="space-y-2 pt-1">
                              {order.items.map((item, index) => {
                                const personalizationSummary = summarizePersonalizari(
                                  item.personalizari
                                );

                                return (
                                  <div
                                    key={`${order.orderId}-${item.name}-${index}`}
                                    className="rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.65)] px-3 py-3"
                                  >
                                    <div className="font-semibold text-gray-900">
                                      {item.name} x {item.qty}
                                    </div>
                                    {personalizationSummary ? (
                                      <div className="mt-1 text-xs leading-6 text-gray-600">
                                        {personalizationSummary}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Note si alerte
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-gray-700">
                            {order.latestStatusNote ? (
                              <div>Ultima nota status: {order.latestStatusNote}</div>
                            ) : null}
                            {order.notesClient ? <div>Client: {order.notesClient}</div> : null}
                            {order.notesAdmin ? <div>Admin: {order.notesAdmin}</div> : null}
                            {!order.latestStatusNote && !order.notesClient && !order.notesAdmin ? (
                              <div className="text-gray-500">Nu exista note suplimentare.</div>
                            ) : null}
                            {Array.isArray(order.attachments) && order.attachments.length > 0 ? (
                              <div className="pt-2">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d775c]">
                                  Atasamente
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {order.attachments.map((attachment, index) => (
                                    <a
                                      key={`${order.orderId}-attachment-${index}`}
                                      href={attachment?.url || "#"}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-rose-200 bg-[rgba(255,249,242,0.88)] px-3 py-1 text-xs font-semibold text-[#7d6655]"
                                    >
                                      {attachment?.name || `Fisier ${index + 1}`}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Reteta noua"
          description="Adauga rapid o reteta sau un batch nou direct in catalogul tehnic activ."
          className="space-y-4"
          action={
            <button
              type="button"
              onClick={createRecipe}
              disabled={newRecipeSaving}
              className={buttons.primary}
            >
              {newRecipeSaving ? "Salvez..." : "Salveaza reteta"}
            </button>
          }
        >
          <div className="grid gap-3">
            <input
              type="text"
              placeholder="Numele tortului"
              value={newRecipeForm.nume}
              onChange={(event) => updateNewRecipeField("nume", event.target.value)}
              className={inputs.default}
            />
            <textarea
              placeholder="Descriere scurta"
              value={newRecipeForm.descriere}
              onChange={(event) => updateNewRecipeField("descriere", event.target.value)}
              className={`${inputs.default} h-24`}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                placeholder="Pret (MDL)"
                value={newRecipeForm.pret}
                onChange={(event) => updateNewRecipeField("pret", event.target.value)}
                className={inputs.default}
              />
              <input
                type="text"
                placeholder="URL imagine (optional)"
                value={newRecipeForm.imagine}
                onChange={(event) => updateNewRecipeField("imagine", event.target.value)}
                className={inputs.default}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Kg baza"
                value={newRecipeForm.retetaBaseKg}
                onChange={(event) =>
                  updateNewRecipeField("retetaBaseKg", Number(event.target.value || 0))
                }
                className={inputs.default}
              />
              <input
                type="text"
                placeholder="Ocazii (separate prin virgula)"
                value={newRecipeForm.ocazii}
                onChange={(event) => updateNewRecipeField("ocazii", event.target.value)}
                className={inputs.default}
              />
            </div>
          </div>

          <div className="space-y-3">
            {newIngredientRows.map((ingredient, idx) => (
              <div
                key={`${ingredient.ingredient}-${idx}`}
                className="rounded-lg border bg-rose-50 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-12">
                  <input
                    className={`sm:col-span-5 ${inputs.default}`}
                    type="text"
                    placeholder="Ingredient"
                    value={ingredient.ingredient}
                    onChange={(event) =>
                      updateNewIngredient(idx, "ingredient", event.target.value)
                    }
                  />
                  <input
                    className={`sm:col-span-2 ${inputs.default}`}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Cantitate"
                    value={ingredient.qty}
                    onChange={(event) =>
                      updateNewIngredient(idx, "qty", Number(event.target.value || 0))
                    }
                  />
                  <input
                    className={`sm:col-span-2 ${inputs.default}`}
                    type="text"
                    placeholder="Unitate"
                    value={ingredient.unit}
                    onChange={(event) => updateNewIngredient(idx, "unit", event.target.value)}
                  />
                  <input
                    className={`sm:col-span-3 ${inputs.default}`}
                    type="text"
                    placeholder="Note"
                    value={ingredient.note}
                    onChange={(event) => updateNewIngredient(idx, "note", event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeNewIngredient(idx)}
                    disabled={newIngredientRows.length <= 1}
                    className="mt-1 text-xs text-rose-700 hover:underline sm:col-span-12"
                  >
                    Sterge ingredient
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <button
              type="button"
              onClick={addNewIngredient}
              className="text-rose-600 hover:underline"
            >
              + Adauga ingredient
            </button>
            {newRecipeMsg ? <span className="text-rose-700">{newRecipeMsg}</span> : null}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Notificari operationale"
          description="Ultimele semnale utile pentru productie si coordonarea comenzilor."
          className="space-y-4"
          action={
            <button type="button" onClick={fetchNotifications} className={buttons.outline}>
              Reincarca
            </button>
          }
        >
          {loadingNotifications ? (
            <div className="text-sm text-gray-500">Se incarca notificari...</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-gray-500">Nu exista notificari.</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className="rounded-lg border border-rose-100 bg-rose-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {notification.titlu || "Notificare"}
                      </div>
                      <div className="text-xs text-gray-700">{notification.mesaj}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {notification.tip || "info"}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500">
                    {new Date(notification.data).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
