import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CakeWeightCalculator from "../components/CakeWeightCalculator";
import { ProductsAPI } from "../api/products";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { buttons, cards } from "../lib/tailwindComponents";
import {
  STOREFRONT_FLAVOR_FILTERS,
  STOREFRONT_OCCASIONS,
  STOREFRONT_SORT_OPTIONS,
  getStorefrontCatalogItems,
  normalizeStorefrontText,
} from "../lib/storefrontCatalog";

const badgeToneClasses = {
  rose: "border-rose-100 bg-rose-50 text-pink-700",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

const priceFormatter = new Intl.NumberFormat("ro-MD");

function formatPrice(value = 0) {
  return `${priceFormatter.format(Number(value || 0))} MDL`;
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-sage-deep/40 bg-charcoal text-white shadow-soft"
          : "border-rose-200 bg-white/90 text-[#5e554d] hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function RatingBadge({ item }) {
  const rounded = Math.round(Number(item?.ratingAvg || 0) * 10) / 10;

  if (rounded > 0 || Number(item?.ratingCount || 0) > 0) {
    return (
      <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-pink-700 backdrop-blur">
        {`${rounded || 5}/5 | ${Number(item?.ratingCount || 0)} recenzii`}
      </span>
    );
  }

  const tone = badgeToneClasses[item?.badge?.tone] || badgeToneClasses.rose;
  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone}`}>
      {item?.badge?.label || "Recomandat"}
    </span>
  );
}

function CatalogCard({ item, onAddToCart }) {
  return (
    <article className="group overflow-hidden rounded-[32px] border border-rose-100 bg-[rgba(255,252,247,0.94)] p-3 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-card">
      <ProductCard
        image={item.imagine}
        category={String(item.categoryLabel || "Maison-Douce").toUpperCase()}
        price={formatPrice(item.pret)}
        name={item.nume}
        description={item.descriere}
        aromaticProfile={item.fillingSummary}
        meta={[item.prepLabel, item.servingLabel, item.marime].filter(Boolean)}
        className="h-[31.5rem]"
      />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d775c]">
            {item.collectionNote}
          </div>
          <RatingBadge item={item} />
        </div>

        <div className="flex flex-wrap gap-2">
          {item.displayTags.slice(0, 4).map((tag) => (
            <span
              key={`${item._id}-${tag}`}
              className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-[#786f66]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link to={`/tort/${item._id}`} className={buttons.outline}>
            Vezi detalii
          </Link>
          <Link
            to={`/constructor?from=${item._id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-sage-deep/35 bg-sage/30 px-4 py-2.5 text-sm font-semibold text-[#475145] hover:border-sage-deep/45 hover:bg-sage/45"
          >
            Personalizeaza
          </Link>
          <button type="button" className={buttons.primary} onClick={() => onAddToCart(item)}>
            Adauga in cos
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Catalog() {
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [occasion, setOccasion] = useState("toate");
  const [flavorTag, setFlavorTag] = useState("toate");
  const [sort, setSort] = useState("recommended");

  useEffect(() => {
    document.title = "Catalog torturi | Maison-Douce";
    const desc =
      "Descopera colectia Maison-Douce: torturi artizanale, imagini coerente, preturi in MDL si filtre utile pentru comenzi reale.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    ProductsAPI.list({ activ: true, limit: 120 })
      .then((data) => {
        if (!alive) return;
        setRawItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!alive) return;
        setRawItems([]);
        setError(
          "Catalogul live nu a putut fi incarcat momentan. Afisam colectia Maison-Douce pregatita local, cu imagini si continut premium."
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const catalogItems = useMemo(() => getStorefrontCatalogItems(rawItems), [rawItems]);
  const normalizedQuery = normalizeStorefrontText(deferredQuery);

  const filteredItems = useMemo(() => {
    const next = catalogItems.filter((item) => {
      if (occasion !== "toate" && !item.ocazii.includes(occasion)) return false;
      if (flavorTag !== "toate" && !item.displayTags.includes(flavorTag)) return false;
      if (normalizedQuery && !String(item.searchText || "").includes(normalizedQuery)) return false;
      return true;
    });

    if (sort === "price_asc") {
      return [...next].sort((left, right) => Number(left.pret || 0) - Number(right.pret || 0));
    }
    if (sort === "price_desc") {
      return [...next].sort((left, right) => Number(right.pret || 0) - Number(left.pret || 0));
    }
    if (sort === "newest") {
      return [...next].sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
      );
    }
    if (sort === "rating") {
      return [...next].sort((left, right) => {
        const leftScore = Number(left.ratingAvg || 0) * 10 + Number(left.ratingCount || 0);
        const rightScore = Number(right.ratingAvg || 0) * 10 + Number(right.ratingCount || 0);
        if (rightScore !== leftScore) return rightScore - leftScore;
        return Number(left.featuredRank || 999) - Number(right.featuredRank || 999);
      });
    }

    return [...next].sort((left, right) => {
      if (Number(left.featuredRank || 999) !== Number(right.featuredRank || 999)) {
        return Number(left.featuredRank || 999) - Number(right.featuredRank || 999);
      }
      return Number(right.ratingAvg || 0) - Number(left.ratingAvg || 0);
    });
  }, [catalogItems, flavorTag, normalizedQuery, occasion, sort]);

  const highlightedCount = filteredItems.filter((item) => item.badge?.label === "Popular").length;
  const premiumCount = filteredItems.filter((item) => item.displayTags.includes("premium")).length;
  const activeFilterCount = [query, occasion !== "toate", flavorTag !== "toate", sort !== "recommended"].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setOccasion("toate");
    setFlavorTag("toate");
    setSort("recommended");
  };

  const addToCart = (item) => {
    add({
      id: item._id,
      name: item.nume,
      price: item.pret || 0,
      image: item.imagine,
      qty: 1,
      prepHours: item.timpPreparareOre || 24,
    });
  };

  const sortLabel =
    STOREFRONT_SORT_OPTIONS.find((option) => option.value === sort)?.label || "Recomandate";

  return (
    <div className="min-h-screen pb-16">
      <section className="relative overflow-hidden px-4 pb-6 pt-8 md:px-6 md:pt-12">
        <div className="absolute inset-0 bg-brand-wash" />
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sage/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-editorial gap-5 xl:grid-cols-[1.15fr,0.85fr]">
          <div className={`${cards.elevated} relative overflow-hidden`}>
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sage/25 blur-3xl" />
            <div className="relative space-y-5">
              <div className="eyebrow">Maison-Douce</div>
              <div>
                <div className="font-script text-3xl text-pink-500">Collection maison</div>
                <h1 className="mt-2 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">
                  Catalog de torturi artizanale cu prezentare editoriala si selectie realista in MDL
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#665d54] md:text-lg">
                  Nume curate, umpluturi credibile, imagini atent alese si filtre utile pentru aniversari, nunti, botezuri si evenimente corporate.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Selectie</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{loading ? "..." : filteredItems.length}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">torturi prezentate</div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Popularitate</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{loading ? "..." : highlightedCount}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">optiuni marcate Popular</div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Premium</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{loading ? "..." : premiumCount}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">piese pentru evenimente</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[30px] border border-charcoal/10 bg-charcoal p-6 text-white shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">Atelier Maison-Douce</div>
              <div className="mt-3 font-serif text-3xl">Preturi clare in MDL</div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                De la torturi clasice pentru aniversari pana la piese etajate pentru nunta, cu diferentiere clara de pret si complexitate.
              </p>
            </div>
            <div className="rounded-[30px] border border-rose-100 bg-white/90 p-6 shadow-soft">
              <div className="text-xs uppercase tracking-[0.24em] text-pink-600">Servicii incluse</div>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[#625a52]">
                <div>Fotografie coerenta pe carduri, fara placeholdere goale.</div>
                <div>Filtre utile pentru ocazii, arome si selectii premium.</div>
                <div>Actiuni rapide pentru detalii, cos si personalizare.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-editorial px-4 md:px-6">
        <div className="rounded-[32px] border border-rose-100 bg-[rgba(255,251,245,0.92)] p-5 shadow-card backdrop-blur md:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.35fr,0.85fr,0.7fr]">
            <label className="block">
              <span className="text-sm font-semibold text-[#4f463e]">Cauta dupa nume sau gust</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: Red Velvet, fistic, nunta eleganta"
                className="mt-2 w-full rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#4f463e]">Sortare</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="mt-2 w-full rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
              >
                {STOREFRONT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
              <div className="text-sm font-semibold text-[#4f463e]">Rezumat filtrare</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{filteredItems.length}</div>
              <div className="mt-1 text-sm text-[#7b736a]">
                {activeFilterCount > 0 ? `${activeFilterCount} filtre active` : "fara filtre active"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr,1fr,auto]">
            <div>
              <div className="text-sm font-semibold text-[#4f463e]">Ocazie</div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {STOREFRONT_OCCASIONS.map((option) => (
                  <FilterChip
                    key={option}
                    label={option === "toate" ? "Toate" : option}
                    active={occasion === option}
                    onClick={() => setOccasion(option)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-[#4f463e]">Selectii utile</div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {STOREFRONT_FLAVOR_FILTERS.map((option) => (
                  <FilterChip
                    key={option}
                    label={option === "toate" ? "Toate" : option}
                    active={flavorTag === option}
                    onClick={() => setFlavorTag(option)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button type="button" className={buttons.outline} onClick={resetFilters}>
                Reseteaza filtrele
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <CakeWeightCalculator />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
              Selectie actuala
            </div>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Torturi pentru aniversari, nunti si evenimente premium
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#665d54]">
              Cardurile folosesc denumiri curate, umpluturi credibile si imagini locale sau mockuri elegante atunci cand datele brute nu sunt pregatite pentru publicare.
            </p>
          </div>
          <div className="rounded-full border border-rose-100 bg-white px-4 py-2 text-sm text-[#665d54] shadow-soft">
            {`Sortare: ${sortLabel}`}
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[460px] animate-pulse rounded-[30px] border border-rose-100 bg-white/80 shadow-soft"
              />
            ))}
          </div>
        ) : null}

        {!loading && filteredItems.length === 0 ? (
          <div className="mt-8 rounded-[30px] border border-rose-100 bg-white p-8 text-center shadow-soft">
            <div className="font-serif text-3xl text-ink">Nicio combinatie nu se potriveste acum</div>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#665d54]">
              Incearca o cautare mai scurta sau revino la filtrele implicite pentru a vedea intreaga colectie Maison-Douce.
            </p>
            <button type="button" className={`${buttons.primary} mt-5`} onClick={resetFilters}>
              Vezi intreaga selectie
            </button>
          </div>
        ) : null}

        {!loading && filteredItems.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <CatalogCard key={item._id} item={item} onAddToCart={addToCart} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
