import { buttons, inputs } from "../../lib/tailwindComponents";
import { getDecorationCategories } from "../../lib/cakeDecorations";

function LibraryPreview({ item }) {
  const backgrounds = {
    topper: "linear-gradient(135deg, rgba(241,228,191,0.95), rgba(215,185,120,0.68))",
    lumanari: "linear-gradient(135deg, rgba(253,227,190,0.96), rgba(244,185,109,0.72))",
    figurine: "linear-gradient(135deg, rgba(225,214,205,0.96), rgba(187,150,120,0.72))",
    decoratiuni: "linear-gradient(135deg, rgba(249,232,240,0.96), rgba(223,205,237,0.78))",
  };

  return (
    <div
      className="h-14 w-14 rounded-[18px] border border-white/80 shadow-soft"
      style={{ background: backgrounds[item.category] || backgrounds.decoratiuni }}
    />
  );
}

export default function CakeDecorationLibrary({
  query,
  category,
  items,
  recommendedItems = [],
  activeStyleLabel = "",
  onQueryChange,
  onCategoryChange,
  onAdd,
}) {
  const categories = getDecorationCategories();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-800">Cauta decoratiuni</div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7262]">
            {items.length} rezultate
          </div>
        </div>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: flori, ursuleti, lumanari, macarons"
          className={inputs.default}
        />
        <div className="text-xs leading-5 text-[#6d625a]">
          Poti combina orice elemente liber. Stilul selectat ramane doar o recomandare
          vizuala, nu o limita pentru decor.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onCategoryChange(item.id)}
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
              category === item.id
                ? "border-charcoal bg-charcoal text-white"
                : "border-rose-200 bg-white text-[#6d625a] hover:border-sage-deep/35"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {recommendedItems.length ? (
        <div className="rounded-[24px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(247,244,236,0.96),rgba(233,240,228,0.82))] p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-deep">
                Recomandari rapide
              </div>
              <div className="mt-1 text-sm text-[#5f564d]">
                {activeStyleLabel
                  ? `Se potrivesc bine cu stilul ${activeStyleLabel}.`
                  : "Cateva elemente care se aseaza natural pe compozitia curenta."}
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6856]">
              Adaugare rapida
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recommendedItems.map((item) => (
              <button
                key={`recommended-${item.id}`}
                type="button"
                className={buttons.outline}
                onClick={() => onAdd(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-[24px] border border-rose-100 bg-white/90 p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <LibraryPreview item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{item.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-pink-600">
                        {item.category}
                      </div>
                    </div>
                    <button type="button" className={buttons.small} onClick={() => onAdd(item.id)}>
                      Adauga
                    </button>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[#655c53]">
                    {item.keywords.slice(0, 4).join(" • ")}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-rose-200 bg-[rgba(255,249,242,0.78)] px-4 py-5 text-sm text-[#6d625a]">
          Nu exista decoratiuni pentru cautarea curenta.
        </div>
      )}
    </div>
  );
}
