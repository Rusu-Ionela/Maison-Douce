import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";

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
  const defaultNewRecipe = () => ({
    nume: "",
    descriere: "",
    pret: "",
    imagine: "",
    retetaBaseKg: 1,
    ocazii: "",
    ingredients: [{ ingredient: "", qty: 0, unit: "g", note: "" }],
  });
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
    } catch (e) {
      console.error("Nu pot incarca notificarile.", e);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoadingRecipes(true);
      try {
        const { data } = await api.get("/admin/production/recipes");
        setRecipes(Array.isArray(data) ? data : []);
        if (!selectedTort && data?.length) {
          setSelectedTort(data[0]._id);
        }
      } catch (e) {
        setMsg("Nu am putut incarca retetele.");
      } finally {
        setLoadingRecipes(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchBoard = async () => {
      setLoadingBoard(true);
      try {
        const { data } = await api.get("/admin/production/board", { params: { date } });
        setBoard(data.board || []);
      } catch (e) {
        setMsg("Nu am putut incarca boardul de productie.");
      } finally {
        setLoadingBoard(false);
      }
    };
    fetchBoard();
  }, [date]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const recipe = useMemo(
    () =>
      recipes.find((r) => String(r._id) === String(selectedTort)) || null,
    [recipes, selectedTort]
  );

  useEffect(() => {
    if (!recipe) {
      setEditIngredients([{ ingredient: "", qty: 0, unit: "g", note: "" }]);
      setBaseKgInput(1);
      return;
    }
    setRecipeNotice("");
    setBaseKgInput(recipe.retetaBaseKg || 1);
    setEditIngredients(
      Array.isArray(recipe.reteta) && recipe.reteta.length
        ? recipe.reteta.map((ing) => ({ ...ing }))
        : [{ ingredient: "", qty: 0, unit: "g", note: "" }]
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

  const ingredientRows = editIngredients.length
    ? editIngredients
    : [{ ingredient: "", qty: 0, unit: "g", note: "" }];

  const updateIngredient = (idx, key, value) => {
    setEditIngredients((prev) =>
      prev.map((ing, index) => (index === idx ? { ...ing, [key]: value } : ing))
    );
  };

  const addIngredient = () => {
    setEditIngredients((prev) => [...prev, { ingredient: "", qty: 0, unit: "g", note: "" }]);
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
      ingredients: prev.ingredients.map((ing, index) =>
        index === idx ? { ...ing, [key]: value } : ing
      ),
    }));
  };

  const addNewIngredient = () => {
    setNewRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient: "", qty: 0, unit: "g", note: "" }],
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
    : [{ ingredient: "", qty: 0, unit: "g", note: "" }];

  const createRecipe = async () => {
    if (!newRecipeForm.nume.trim()) {
      setNewRecipeMsg("Completeaza numele tortului.");
      return;
    }
    if (!newRecipeForm.ingredients.some((ing) => ing.ingredient?.trim())) {
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
        reteta: newIngredientRows.map((ing) => ({
          ingredient: String(ing.ingredient || "").trim(),
          qty: Number(ing.qty || 0),
          unit: String(ing.unit || "g").trim(),
          note: String(ing.note || "").trim(),
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
    } catch (e) {
      setNewRecipeMsg(e?.response?.data?.message || "Nu am putut crea reteta.");
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
        reteta: ingredientRows.map((ing) => ({
          ingredient: String(ing.ingredient || "").trim(),
          qty: Number(ing.qty || 0),
          unit: String(ing.unit || "g").trim(),
          note: String(ing.note || ""),
        })),
      };
      const { data } = await api.put(`/admin/production/recipes/${recipe._id}`, payload);
      if (Array.isArray(data?.tort?.reteta)) {
        setRecipes((prev) =>
          prev.map((item) =>
            String(item._id) === String(data.tort._id) ? { ...item, ...data.tort } : item
          )
        );
        setRecipeNotice("Rețeta a fost salvată.");
      } else {
        setRecipeNotice("Rețeta nu a fost actualizată.");
      }
    } catch (e) {
      setRecipeNotice(e?.response?.data?.message || "Nu am putut salva rețeta.");
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Calculator productie</h1>
          <p className="text-gray-600">
            Selecteaza un tort și ajustează câte kilograme trebuie să produci; ingredientele se scalează automat.
          </p>
        </header>

        {msg && <div className="text-sm text-rose-700">{msg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-rose-100 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Tort</label>
              <select
                value={selectedTort}
                onChange={(e) => setSelectedTort(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                {recipes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.nume}
                  </option>
                ))}
              </select>
              <label className="text-sm font-semibold text-gray-700 block mt-3">Kilograme dorite</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={targetKg}
                onChange={(e) => setTargetKg(Number(e.target.value || 0))}
                className="w-full border rounded-lg p-2"
              />
              <div className="text-sm text-gray-500">
                {recipe ? `Reteta de baza: ${recipe.retetaBaseKg || 1}kg` : "Selecteaza un tort pentru reteta."}
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-2 min-h-[140px]">
              {loadingRecipes ? (
                <div className="text-sm text-gray-500">Se incarca retetele...</div>
              ) : recipe && scaledIngredients.length > 0 ? (
                <div className="space-y-2">
                  {scaledIngredients.map((ing) => (
                    <div key={ing.ingredient} className="border rounded-lg p-2 bg-white">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{ing.ingredient}</span>
                        <span className="text-gray-600">
                          {ing.scaled} {ing.unit}
                        </span>
                      </div>
                      {ing.note && <div className="text-xs text-gray-500">{ing.note}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Reteta nu contine ingrediente detaliate.</div>
              )}
            </div>

            <div className="border border-rose-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-rose-600">Reteta</p>
                  <h3 className="text-xl font-semibold text-gray-900">Editeaza ingredientele</h3>
                  <p className="text-xs text-gray-500">Salvezi pentru a actualiza baza din Mongo.</p>
                </div>
                <button
                  onClick={saveRecipe}
                  disabled={!recipe || savingRecipe}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-rose-700"
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
                    onChange={(e) => setBaseKgInput(Number(e.target.value || 0))}
                    className="mt-1 w-full border rounded-lg p-2"
                  />
                </label>
                <div className="text-sm text-gray-500">
                  {recipe ? `Setat pentru ${recipe.nume}` : "Selecteaza un tort pentru date."}
                </div>
              </div>

              <div className="space-y-3">
                {ingredientRows.map((ing, idx) => (
                  <div key={`${ing.ingredient}-${idx}`} className="border rounded-lg p-3 bg-rose-50">
                    <div className="grid gap-2 sm:grid-cols-12">
                      <input
                        className="sm:col-span-5 border rounded-lg p-2"
                        type="text"
                        placeholder="Ingrediente"
                        value={ing.ingredient}
                        onChange={(e) => updateIngredient(idx, "ingredient", e.target.value)}
                      />
                      <input
                        className="sm:col-span-2 border rounded-lg p-2"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Cantitate"
                        value={ing.qty}
                        onChange={(e) => updateIngredient(idx, "qty", Number(e.target.value || 0))}
                      />
                      <input
                        className="sm:col-span-2 border rounded-lg p-2"
                        type="text"
                        placeholder="Unitate"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                      />
                      <input
                        className="sm:col-span-3 border rounded-lg p-2"
                        type="text"
                        placeholder="Note"
                        value={ing.note}
                        onChange={(e) => updateIngredient(idx, "note", e.target.value)}
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
                <button type="button" onClick={addIngredient} className="text-rose-600 hover:underline">
                  + Adauga ingredient
                </button>
                {recipeNotice && <span className="text-rose-700">{recipeNotice}</span>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-rose-100 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Program productie</h2>
                <p className="text-sm text-gray-500">Selecteaza ziua pentru lista comenzilor.</p>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded-lg p-2"
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
                            <img src={order.image} alt="Produs" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center text-xs text-gray-500 py-8">Fara imagine</div>
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
                                - {item.name} � {item.qty} {item.personalizari?.marime || ""}
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-rose-100 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Reteta noua</p>
                <h2 className="text-xl font-semibold text-gray-900">Adauga o reteta / batch nou</h2>
                <p className="text-xs text-gray-500">Se salveaza direct in catalogul torturilor active.</p>
              </div>
              <button
                onClick={createRecipe}
                disabled={newRecipeSaving}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-rose-700"
              >
                {newRecipeSaving ? "Salvez..." : "Salveaza reteta"}
              </button>
            </div>
            <div className="grid gap-3">
              <input
                type="text"
                placeholder="Numele tortului"
                value={newRecipeForm.nume}
                onChange={(e) => updateNewRecipeField("nume", e.target.value)}
                className="border rounded-lg p-2"
              />
              <textarea
                placeholder="Descriere scurta"
                value={newRecipeForm.descriere}
                onChange={(e) => updateNewRecipeField("descriere", e.target.value)}
                className="border rounded-lg p-2 h-24"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="Pret (MDL)"
                  value={newRecipeForm.pret}
                  onChange={(e) => updateNewRecipeField("pret", e.target.value)}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="URL imagine (optional)"
                  value={newRecipeForm.imagine}
                  onChange={(e) => updateNewRecipeField("imagine", e.target.value)}
                  className="border rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Kg baza"
                  value={newRecipeForm.retetaBaseKg}
                  onChange={(e) => updateNewRecipeField("retetaBaseKg", Number(e.target.value || 0))}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="Ocazii (separate prin virgula)"
                  value={newRecipeForm.ocazii}
                  onChange={(e) => updateNewRecipeField("ocazii", e.target.value)}
                  className="border rounded-lg p-2"
                />
              </div>
            </div>
            <div className="space-y-3">
              {newIngredientRows.map((ing, idx) => (
                <div key={`${ing.ingredient}-${idx}`} className="border rounded-lg p-3 bg-rose-50">
                  <div className="grid gap-2 sm:grid-cols-12">
                    <input
                      className="sm:col-span-5 border rounded-lg p-2"
                      type="text"
                      placeholder="Ingredienta"
                      value={ing.ingredient}
                      onChange={(e) => updateNewIngredient(idx, "ingredient", e.target.value)}
                    />
                    <input
                      className="sm:col-span-2 border rounded-lg p-2"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Cantitate"
                      value={ing.qty}
                      onChange={(e) => updateNewIngredient(idx, "qty", Number(e.target.value || 0))}
                    />
                    <input
                      className="sm:col-span-2 border rounded-lg p-2"
                      type="text"
                      placeholder="Unitate"
                      value={ing.unit}
                      onChange={(e) => updateNewIngredient(idx, "unit", e.target.value)}
                    />
                    <input
                      className="sm:col-span-3 border rounded-lg p-2"
                      type="text"
                      placeholder="Note"
                      value={ing.note}
                      onChange={(e) => updateNewIngredient(idx, "note", e.target.value)}
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
              <button type="button" onClick={addNewIngredient} className="text-rose-600 hover:underline">
                + Adauga ingredient
              </button>
              {newRecipeMsg && <span className="text-rose-700">{newRecipeMsg}</span>}
            </div>
          </div>

          <div className="bg-white border border-rose-100 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Notificari</p>
                <h2 className="text-xl font-semibold text-gray-900">Ultimele notificari</h2>
              </div>
              <button
                onClick={fetchNotifications}
                className="text-rose-600 text-sm font-semibold hover:underline"
              >
                Reincarca
              </button>
            </div>
            {loadingNotifications ? (
              <div className="text-sm text-gray-500">Se incarca notificari...</div>
            ) : notifications.length === 0 ? (
              <div className="text-sm text-gray-500">Nu exista notificari.</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif._id} className="border border-rose-100 rounded-lg p-3 bg-rose-50">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-semibold text-sm">{notif.titlu || "Notificare"}</div>
                        <div className="text-xs text-gray-700">{notif.mesaj}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        {notif.tip || "info"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2">
                      {new Date(notif.data).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
