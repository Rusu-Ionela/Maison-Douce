import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import { PATISER_RECIPE_CATEGORIES, PATISER_RECIPES, PATISER_RECIPE_STYLES } from "../data/patiserRecipes";
import {
  buildLibraryProductionRecipe,
  scaleProductionRows,
} from "../lib/patiserRecipeScaling";
import { buildRecipePrintDocument } from "../lib/patiserRecipePrint";
import { buttons, inputs } from "../lib/tailwindComponents";

function formatMinutes(value) {
  if (!Number.isFinite(value) || value <= 0) return "fara coacere";
  return `${value} min`;
}

function formatScaledQuantity(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function recipeSearchText(recipe) {
  return [
    recipe.name,
    recipe.source,
    recipe.category,
    recipe.style,
    recipe.summary,
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.highlights) ? recipe.highlights : []),
  ]
    .join(" ")
    .toLowerCase();
}

function toneForDifficulty(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("avansat")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (raw.includes("usor") || raw.includes("ușor")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-rose-200 bg-rose-50 text-pink-700";
}

export default function PatiserRecipes() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("toate");
  const [style, setStyle] = useState("toate");
  const [selectedSlug, setSelectedSlug] = useState(PATISER_RECIPES[0]?.slug || "");
  const [targetKg, setTargetKg] = useState(Number(PATISER_RECIPES[0]?.yieldKg || 1));
  const [printError, setPrintError] = useState("");

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return PATISER_RECIPES.filter((recipe) => {
      if (category !== "toate" && recipe.category !== category) return false;
      if (style !== "toate" && recipe.style !== style) return false;
      if (!query) return true;
      return recipeSearchText(recipe).includes(query);
    });
  }, [category, search, style]);

  useEffect(() => {
    if (!filteredRecipes.length) {
      setSelectedSlug("");
      return;
    }

    const currentExists = filteredRecipes.some((recipe) => recipe.slug === selectedSlug);
    if (!currentExists) {
      setSelectedSlug(filteredRecipes[0].slug);
    }
  }, [filteredRecipes, selectedSlug]);

  const selectedRecipe = useMemo(
    () => filteredRecipes.find((recipe) => recipe.slug === selectedSlug) || null,
    [filteredRecipes, selectedSlug]
  );

  useEffect(() => {
    if (!selectedRecipe) return;
    setTargetKg(Number(selectedRecipe.yieldKg || 1) || 1);
  }, [selectedRecipe]);

  const productionRecipe = useMemo(
    () => (selectedRecipe ? buildLibraryProductionRecipe(selectedRecipe) : null),
    [selectedRecipe]
  );

  const scaledRows = useMemo(
    () =>
      scaleProductionRows(
        productionRecipe?.reteta || [],
        productionRecipe?.retetaBaseKg || 1,
        targetKg
      ),
    [productionRecipe, targetKg]
  );

  const handlePrintRecipe = () => {
    if (!selectedRecipe) return;

    setPrintError("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");

    if (!printWindow) {
      setPrintError(
        "Browserul a blocat fereastra de print. Permite popup-urile pentru aceasta pagina si incearca din nou."
      );
      return;
    }

    const documentMarkup = buildRecipePrintDocument(selectedRecipe, scaledRows, targetKg);
    printWindow.document.open();
    printWindow.document.write(documentMarkup);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 260);
  };

  const metrics = useMemo(() => {
    const totalYield = PATISER_RECIPES.reduce(
      (sum, recipe) => sum + Number(recipe.yieldKg || 0),
      0
    );
    const noBakeCount = PATISER_RECIPES.filter(
      (recipe) => Number(recipe.bakeMinutes || 0) === 0 || recipe.style === "fără coacere"
    ).length;
    const advancedCount = PATISER_RECIPES.filter((recipe) =>
      String(recipe.difficulty || "").toLowerCase().includes("avansat")
    ).length;

    return [
      {
        label: "Retete in biblioteca",
        value: PATISER_RECIPES.length,
        hint: "Set complet pentru laboratorul Maison-Douce",
        tone: "rose",
      },
      {
        label: "Randament mediu",
        value: `${(totalYield / PATISER_RECIPES.length).toFixed(1)} kg`,
        hint: "Util pentru planificarea productiei",
        tone: "gold",
      },
      {
        label: "Fara coacere",
        value: noBakeCount,
        hint: "Cheesecake-uri si torturi cu gelatina",
        tone: "sage",
      },
      {
        label: "Mediu-avansat sau avansat",
        value: advancedCount,
        hint: "Retete care cer organizare in doua etape",
        tone: "slate",
      },
    ];
  }, []);

  return (
    <AdminShell
      eyebrow="Biblioteca laborator"
      title="Retete complete pentru patiser"
      description="Biblioteca interna pentru laborator contine 20 de retete de torturi in limba romana, cu ingrediente, randament, procente, pasi si note utile pentru productie."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrintRecipe}
            disabled={!selectedRecipe}
            className={buttons.secondary}
          >
            Printeaza / Salveaza PDF
          </button>
          <Link
            to={`/admin/production?libraryRecipe=${selectedRecipe?.slug || ""}&targetKg=${targetKg}`}
            className={buttons.outline}
          >
            Deschide in productie
          </Link>
        </div>
      }
    >
      <StatusBanner type="error" className="mb-1" message={printError} />

      <StatusBanner
        type="info"
        className="mb-1"
        title="Sursa bibliotecii"
        message="Retetele sunt mapate din raportul intern de cercetare si sunt afisate in zona de staff, nu in catalogul public."
      />

      <AdminMetricGrid items={metrics} />

      <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
        <AdminPanel
          title="Filtre si selectie"
          description="Cauta rapid dupa nume, sursa, stil sau ingrediente principale."
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-[#4f463e]">
              Cautare
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex: medovik, cheesecake, caramel"
                className={`mt-2 ${inputs.default}`}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm font-semibold text-[#4f463e]">
                Categorie
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={`mt-2 ${inputs.default}`}
                >
                  {PATISER_RECIPE_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-[#4f463e]">
                Stil tehnologic
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  className={`mt-2 ${inputs.default}`}
                >
                  {PATISER_RECIPE_STYLES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
              {filteredRecipes.length} retete afisate. Foloseste pagina ca biblioteca de lucru
              pentru randament, comparatie si planificarea loturilor.
            </div>

            <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {filteredRecipes.map((recipe) => {
                const isActive = recipe.slug === selectedSlug;
                return (
                  <button
                    key={recipe.slug}
                    type="button"
                    onClick={() => setSelectedSlug(recipe.slug)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-rose-200 bg-rose-50/90 shadow-soft"
                        : "border-rose-100 bg-white/90 hover:border-rose-200 hover:bg-[rgba(255,249,242,0.88)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-serif text-xl font-semibold text-ink">
                          {recipe.name}
                        </div>
                        <div className="mt-1 text-sm text-[#655c53]">{recipe.source}</div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneForDifficulty(
                          recipe.difficulty
                        )}`}
                      >
                        {recipe.difficulty}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-rose-100 bg-white/80 px-3 py-1 text-xs font-semibold text-[#8d775c]">
                        {recipe.yieldLabel}
                      </span>
                      <span className="inline-flex rounded-full border border-rose-100 bg-white/80 px-3 py-1 text-xs font-semibold text-[#8d775c]">
                        prep {recipe.prepMinutes} min
                      </span>
                      <span className="inline-flex rounded-full border border-rose-100 bg-white/80 px-3 py-1 text-xs font-semibold text-[#8d775c]">
                        coacere {formatMinutes(recipe.bakeMinutes)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-[#655c53]">{recipe.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </AdminPanel>

        <div className="space-y-6">
          {selectedRecipe ? (
            <>
              <AdminPanel
                title={selectedRecipe.name}
                description={selectedRecipe.summary}
                action={
                  <span className="inline-flex rounded-full border border-[rgba(184,155,103,0.28)] bg-[rgba(184,155,103,0.12)] px-3 py-1 text-sm font-semibold text-[#7a5b2f]">
                    {selectedRecipe.source}
                  </span>
                }
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Randament
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {selectedRecipe.yieldLabel}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Portii
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {selectedRecipe.servings}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Stil
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {selectedRecipe.style}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Energie
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {selectedRecipe.energyPer100g}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(selectedRecipe.highlights || []).map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex rounded-full border border-rose-100 bg-white/80 px-3 py-1 text-xs font-semibold text-[#8d775c]"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </AdminPanel>

              <div className="grid gap-6 xl:grid-cols-2">
                <AdminPanel
                  title="Scalare pentru productie"
                  description="Poti calcula automat gramajele pentru cantitatea dorita si apoi deschide aceeasi reteta in modulul de productie."
                >
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-[#4f463e]">
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

                    <div className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
                      Baza de calcul pentru aceasta reteta este {selectedRecipe.yieldLabel}. Scalarea
                      foloseste randamentul retetei ca lot de referinta.
                    </div>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {scaledRows.map((row, index) => (
                        <div
                          key={`${selectedRecipe.slug}-scaled-${row.ingredient}-${index}`}
                          className="rounded-[20px] border border-rose-100 bg-white/85 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-ink">{row.ingredient}</div>
                              {row.group ? (
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                                  {row.group}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-ink">
                                {row.scalable && row.unit
                                  ? `${formatScaledQuantity(row.scaledQty)} ${row.unit}`
                                  : "dupa gust / nescalabil"}
                              </div>
                              <div className="text-xs text-[#8a8178]">
                                baza: {row.qty > 0 ? `${row.qty} ${row.unit}` : "fara cantitate fixa"}
                              </div>
                            </div>
                          </div>
                          {row.note ? (
                            <div className="mt-2 text-xs leading-6 text-[#8a8178]">{row.note}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </AdminPanel>

                <AdminPanel
                  title="Ingrediente exacte"
                  description="Cantitatile sunt pastrate in unitatile raportului intern."
                >
                  <ul className="space-y-3 text-sm leading-7 text-[#4f463e]">
                    {(selectedRecipe.ingredients || []).map((item) => (
                      <li
                        key={item}
                        className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </AdminPanel>

                <AdminPanel
                  title="Procente si parametri"
                  description="Procentele sunt utile pentru scalare si comparatie rapida."
                >
                  <div className="space-y-3">
                    <div className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm text-[#4f463e]">
                      <span className="font-semibold text-ink">Maturare:</span>{" "}
                      {selectedRecipe.maturation}
                    </div>
                    <div className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm text-[#4f463e]">
                      <span className="font-semibold text-ink">Pastrare:</span>{" "}
                      {selectedRecipe.storage}
                    </div>
                    <ul className="space-y-3 text-sm leading-7 text-[#4f463e]">
                      {(selectedRecipe.bakerPercent || []).map((item) => (
                        <li
                          key={item}
                          className="rounded-[20px] border border-rose-100 bg-white/85 px-4 py-3"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AdminPanel>
              </div>

              <AdminPanel
                title="Pasi de lucru"
                description="Ordinea este gandita pentru productie si montaj."
              >
                <ol className="space-y-3">
                  {(selectedRecipe.steps || []).map((step, index) => (
                    <li
                      key={`${selectedRecipe.slug}-step-${index}`}
                      className="flex gap-3 rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-sm leading-7 text-[#4f463e]">{step}</span>
                    </li>
                  ))}
                </ol>
              </AdminPanel>

              <div className="grid gap-6 xl:grid-cols-2">
                <AdminPanel title="Variatii uzuale">
                  <ul className="space-y-3 text-sm leading-7 text-[#4f463e]">
                    {(selectedRecipe.variations || []).map((item) => (
                      <li
                        key={item}
                        className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </AdminPanel>

                <AdminPanel title="Depanare">
                  <ul className="space-y-3 text-sm leading-7 text-[#4f463e]">
                    {(selectedRecipe.troubleshooting || []).map((item) => (
                      <li
                        key={item}
                        className="rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </AdminPanel>
              </div>
            </>
          ) : (
            <AdminPanel title="Nu exista rezultate">
              <p className="text-sm leading-7 text-[#655c53]">
                Nicio reteta nu corespunde filtrelor curente. Incearca alt termen de
                cautare sau revino la toate categoriile.
              </p>
            </AdminPanel>
          )}
        </div>
      </div>

      <AdminPanel
        title="Comparatie rapida"
        description="Tabel util pentru randament, timp si complexitate."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#4f463e]">
            <thead>
              <tr className="border-b border-rose-100 text-xs uppercase tracking-[0.2em] text-[#8d775c]">
                <th className="px-3 py-3">Reteta</th>
                <th className="px-3 py-3">Randament</th>
                <th className="px-3 py-3">Prep</th>
                <th className="px-3 py-3">Coacere</th>
                <th className="px-3 py-3">Dificultate</th>
                <th className="px-3 py-3">Stil</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipes.map((recipe) => (
                <tr
                  key={`${recipe.slug}-row`}
                  className="border-b border-rose-50 hover:bg-[rgba(255,249,242,0.6)]"
                >
                  <td className="px-3 py-3 font-semibold text-ink">{recipe.name}</td>
                  <td className="px-3 py-3">{recipe.yieldLabel}</td>
                  <td className="px-3 py-3">{recipe.prepMinutes} min</td>
                  <td className="px-3 py-3">{formatMinutes(recipe.bakeMinutes)}</td>
                  <td className="px-3 py-3">{recipe.difficulty}</td>
                  <td className="px-3 py-3">{recipe.style}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
