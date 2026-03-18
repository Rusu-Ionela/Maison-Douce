import { useEffect, useMemo, useState } from "react";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
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

export default function AdminProduction() {
  const [recipes, setRecipes] = useState([]);
  const [board, setBoard] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTort, setSelectedTort] = useState("");
  const [targetKg, setTargetKg] = useState(1);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [msg, setMsg] = useState("");
  const [editIngredients, setEditIngredients] = useState([]);
  const [baseKgInput, setBaseKgInput] = useState(1);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeNotice, setRecipeNotice] = useState("");
  const [newRecipeForm, setNewRecipeForm] = useState(() => defaultNewRecipe());
  const [newRecipeMsg, setNewRecipeMsg] = useState("");
  const [newRecipeSaving, setNewRecipeSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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
          setSelectedTort((prev) => prev || list[0]._id);
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

  const recipe = useMemo(
    () => recipes.find((item) => String(item._id) === String(selectedTort)) || null,
    [recipes, selectedTort]
  );

  useEffect(() => {
    if (!recipe) {
      setEditIngredients([defaultIngredientRow()]);
      setBaseKgInput(1);
      return;
    }

    setRecipeNotice("");
    setBaseKgInput(recipe.retetaBaseKg || 1);
    setEditIngredients(
      Array.isArray(recipe.reteta) && recipe.reteta.length
        ? recipe.reteta.map((ingredient) => ({ ...ingredient }))
        : [defaultIngredientRow()]
    );
  }, [recipe]);

  const scaledIngredients = useMemo(() => {
    if (!recipe || !Array.isArray(recipe.reteta)) return [];
    const baseKg = Number(recipe.retetaBaseKg || 1);
    return recipe.reteta.map((item) => {
      const scaled = ((Number(item.qty) || 0) * Number(targetKg || 0)) / baseKg;
      return { ...item, scaled: scaled.toFixed(2) };
    });
  }, [recipe, targetKg]);

  const ingredientRows = editIngredients.length ? editIngredients : [defaultIngredientRow()];

  const updateIngredient = (idx, key, value) => {
    setEditIngredients((prev) =>
      prev.map((ingredient, index) =>
        index === idx ? { ...ingredient, [key]: value } : ingredient
      )
    );
  };

  const addIngredient = () => {
    setEditIngredients((prev) => [...prev, defaultIngredientRow()]);
  };

  const removeIngredient = (idx) => {
    setEditIngredients((prev) => prev.filter((_, index) => index !== idx));
  };

  const updateNewRecipeField = (key, value) => {
    setNewRecipeForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateNewIngredient = (idx, key, value) => {
    setNewRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, index) =>
        index === idx ? { ...ingredient, [key]: value } : ingredient
      ),
    }));
  };

  const addNewIngredient = () => {
    setNewRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, defaultIngredientRow()],
    }));
  };

  const removeNewIngredient = (idx) => {
    setNewRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, index) => index !== idx),
    }));
  };

  const newIngredientRows = newRecipeForm.ingredients.length
    ? newRecipeForm.ingredients
    : [defaultIngredientRow()];

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
        setRecipes((prev) => [...prev, data.tort]);
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
    if (!recipe) return;
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
        setRecipes((prev) =>
          prev.map((item) =>
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
        setSelectedTort((current) =>
          current && recipeList.some((item) => String(item._id) === String(current))
            ? current
            : recipeList[0]._id
        );
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

    return [
      {
        label: "Retete active",
        value: recipes.length,
        hint: "Catalogul disponibil pentru productie.",
        tone: "rose",
      },
      {
        label: "Comenzi in board",
        value: board.length,
        hint: `Planificare pentru ${date}.`,
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
        hint: "Ultimele semnale operationale disponibile.",
        tone: "slate",
      },
    ];
  }, [board, date, notifications.length, recipes.length]);

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
          description="Selecteaza reteta, seteaza cantitatea tinta si actualizeaza ingredientele fara sa iesi din acelasi modul."
          className="space-y-6"
        >
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Tort</label>
              <select
                value={selectedTort}
                onChange={(event) => setSelectedTort(event.target.value)}
                className={inputs.default}
              >
                {recipes.map((tort) => (
                  <option key={tort._id} value={tort._id}>
                    {tort.nume}
                  </option>
                ))}
              </select>
              <label className="text-sm font-semibold text-gray-700 block mt-3">
                Kilograme dorite
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={targetKg}
                onChange={(event) => setTargetKg(Number(event.target.value || 0))}
                className={inputs.default}
              />
              <div className="text-sm text-gray-500">
                {recipe
                  ? `Reteta de baza: ${recipe.retetaBaseKg || 1}kg`
                  : "Selecteaza un tort pentru reteta."}
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-2 min-h-[140px]">
              {loadingRecipes ? (
                <div className="text-sm text-gray-500">Se incarca retetele...</div>
              ) : recipe && scaledIngredients.length > 0 ? (
                <div className="space-y-2">
                  {scaledIngredients.map((ingredient) => (
                    <div key={ingredient.ingredient} className="border rounded-lg p-2 bg-white">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{ingredient.ingredient}</span>
                        <span className="text-gray-600">
                          {ingredient.scaled} {ingredient.unit}
                        </span>
                      </div>
                      {ingredient.note && (
                        <div className="text-xs text-gray-500">{ingredient.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Reteta nu contine ingrediente detaliate.
                </div>
              )}
            </div>

            <div className="border border-rose-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-rose-600">Reteta</p>
                  <h3 className="text-xl font-semibold text-gray-900">Editeaza ingredientele</h3>
                  <p className="text-xs text-gray-500">
                    Salvezi pentru a actualiza baza din Mongo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveRecipe}
                  disabled={!recipe || savingRecipe}
                  className={buttons.primary}
                >
                  {savingRecipe ? "Salvez..." : "Salveaza reteta"}
                </button>
              </div>

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
                  <div key={`${ingredient.ingredient}-${idx}`} className="border rounded-lg p-3 bg-rose-50">
                    <div className="grid gap-2 sm:grid-cols-12">
                      <input
                        className={`sm:col-span-5 ${inputs.default}`}
                        type="text"
                        placeholder="Ingrediente"
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
                        className="sm:col-span-12 text-xs text-rose-700 hover:underline mt-1"
                      >
                        Sterge ingredient
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-rose-600 hover:underline"
                >
                  + Adauga ingredient
                </button>
                {recipeNotice && <span className="text-rose-700">{recipeNotice}</span>}
              </div>
            </div>
        </AdminPanel>

        <AdminPanel
          title="Board productie"
          description="Vezi comenzile planificate pentru ziua selectata, impreuna cu statusul, plata si compozitia estimata."
          className="space-y-4"
        >
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
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
              <div className="space-y-3">
                {board.map((order) => {
                  const methodLabel =
                    order.source === "personalizata"
                      ? "Comanda personalizata"
                      : order.method === "livrare"
                      ? "Livrare"
                      : order.method || "Ridicare";
                  const totalValue = Number(order.total || order.totalFinal || 0);

                  return (
                    <div key={order.orderId} className="border rounded-2xl p-4 bg-rose-50">
                      <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600">
                            {order.data} @ {order.time || "ora nedefinita"}
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {order.numeroComanda || order.orderId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{methodLabel}</span>
                          {order.source && (
                            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full border border-rose-200">
                              {order.source}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-3">
                        <div className="w-32 h-24 overflow-hidden rounded-xl bg-white border border-rose-100">
                          {order.image ? (
                            <img
                              src={order.image}
                              alt="Produs"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-xs text-gray-500 py-8">
                              Fara imagine
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2 text-sm text-gray-700">
                          <div>Client: {order.clientId || "necunoscut"}</div>
                          <div>Status: {order.status}</div>
                          <div>Plata: {order.payment}</div>
                          <div>Greutate estimata: {order.weightKg} kg</div>
                          <div>Total: {totalValue.toFixed(2)} MDL</div>
                          {order.notes && <div>Nota: {order.notes}</div>}
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={`${order.orderId}-${item.name}`} className="text-xs">
                                - {item.name} × {item.qty} {item.personalizari?.marime || ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
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
                <div key={`${ingredient.ingredient}-${idx}`} className="border rounded-lg p-3 bg-rose-50">
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
                      className="sm:col-span-12 text-xs text-rose-700 hover:underline mt-1"
                    >
                      Sterge ingredient
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <button
                type="button"
                onClick={addNewIngredient}
                className="text-rose-600 hover:underline"
              >
                + Adauga ingredient
              </button>
              {newRecipeMsg && <span className="text-rose-700">{newRecipeMsg}</span>}
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
                    className="border border-rose-100 rounded-lg p-3 bg-rose-50"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-semibold text-sm">
                          {notification.titlu || "Notificare"}
                        </div>
                        <div className="text-xs text-gray-700">{notification.mesaj}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        {notification.tip || "info"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2">
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
