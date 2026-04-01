import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import CakeWeightCalculator from "../components/CakeWeightCalculator";
import CatalogFillingCard from "../components/CatalogFillingCard";
import { ProductsAPI } from "../api/products";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { CATALOG_FILLINGS } from "../data/catalogFillings";
import { buttons, cards } from "../lib/tailwindComponents";
import {
  STOREFRONT_ALLERGEN_AVOIDANCE,
  STOREFRONT_PORTION_BANDS,
  STOREFRONT_PRICE_BANDS,
  isFastReadyCatalogItem,
  isPopularCatalogItem,
  isPremiumCatalogItem,
  matchesCatalogAllergenAvoidance,
  matchesCatalogPortionBand,
  matchesCatalogPriceBand,
} from "../lib/catalogFilters";
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

function formatCatalogPrice(item) {
  if (item?.pricingMode === "preview") return "Cerere de oferta";
  if (item?.pricingMode === "quote") return "Pret la confirmare";
  return formatPrice(item?.pret);
}

function formatLeadTimeLabel(item) {
  const hours = Number(item?.timpPreparareOre || 0);
  if (!Number.isFinite(hours) || hours <= 0) return "24-48h";
  return `${hours}h`;
}

function getCatalogCommerceMeta(item) {
  if (item?.requiresManualQuote === true || item?.checkoutReady !== true) {
    return {
      label: "Oferta manuala",
      className: badgeToneClasses.amber,
      detail: "Pret si executie confirmate de atelier",
    };
  }

  return {
    label: "Checkout direct",
    className: badgeToneClasses.emerald,
    detail: "Produs standard cu pret fix public",
  };
}

function matchesSelectedFillingCake(item, filling) {
  if (!item || !filling) return true;

  const slugMatch =
    Array.isArray(filling.recommendedCatalogSlugs) &&
    filling.recommendedCatalogSlugs.includes(String(item.slug || "").trim());
  if (slugMatch) return true;

  const haystack = normalizeStorefrontText(
    [
      item.slug,
      item.nume,
      item.descriere,
      item.fillingSummary,
      item.shortFlavor,
      ...(Array.isArray(item.displayTags) ? item.displayTags : []),
      ...(Array.isArray(item.arome) ? item.arome : []),
      ...(Array.isArray(item.ingrediente) ? item.ingrediente : []),
    ].join(" ")
  );

  const keywords = [
    filling.name,
    filling.pairing,
    ...(Array.isArray(filling.catalogKeywords) ? filling.catalogKeywords : []),
  ]
    .map((value) => normalizeStorefrontText(value))
    .filter(Boolean);

  return keywords.some((keyword) => haystack.includes(keyword));
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
  const quoteOnly = item?.requiresManualQuote === true;
  const commerceMeta = getCatalogCommerceMeta(item);

  return (
    <article className="group overflow-hidden rounded-[32px] border border-rose-100 bg-[rgba(255,252,247,0.94)] p-3 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-card">
      <ProductCard
        image={item.imagine}
        category={String(item.categoryLabel || "Maison-Douce").toUpperCase()}
        price={formatCatalogPrice(item)}
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

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[18px] border border-rose-100 bg-white/90 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-500">
              Flux
            </div>
            <div className="mt-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${commerceMeta.className}`}>
                {commerceMeta.label}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-[#786f66]">{commerceMeta.detail}</div>
          </div>
          <div className="rounded-[18px] border border-rose-100 bg-white/90 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-500">
              Predare
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {quoteOnly ? "La confirmare" : "Livrare 100 MDL"}
            </div>
            <div className="mt-2 text-xs leading-5 text-[#786f66]">
              {quoteOnly ? "Ridicare sau livrare stabilite dupa analiza." : "Pickup sau livrare din checkout."}
            </div>
          </div>
          <div className="rounded-[18px] border border-rose-100 bg-white/90 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-500">
              Timp minim
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {formatLeadTimeLabel(item)}
            </div>
            <div className="mt-2 text-xs leading-5 text-[#786f66]">
              {quoteOnly ? "Se reconfirma pentru oferta finala." : "Valabil pentru varianta standard afisata."}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/catalog?selectedTort=${encodeURIComponent(item.slug || item._id)}#umpluturile-mele`}
            className="inline-flex items-center justify-center rounded-full border border-[#d8c3a7]/60 bg-[#fbf3e8] px-4 py-2.5 text-sm font-semibold text-[#7a6045] transition hover:-translate-y-0.5 hover:border-[#c5ab8b] hover:bg-[#f8eee1]"
          >
            Vezi umpluturi compatibile
          </Link>
          <Link to={`/tort/${item._id}`} className={buttons.outline}>
            Vezi detalii
          </Link>
          <Link
            to={`/constructor?from=${item._id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-sage-deep/35 bg-sage/30 px-4 py-2.5 text-sm font-semibold text-[#475145] hover:border-sage-deep/45 hover:bg-sage/45"
          >
            Personalizeaza
          </Link>
          {quoteOnly ? (
            <Link to="/calendar" className={buttons.primary}>
              Cere oferta
            </Link>
          ) : (
            <button type="button" className={buttons.primary} onClick={() => onAddToCart(item)}>
              Adauga in cos
            </button>
          )}
        </div>
        {quoteOnly ? (
          <p className="text-sm leading-6 text-[#786f66]">
            Acest model este afisat ca inspiratie sau necesita confirmare manuala. Nu intra direct
            in checkout.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function Catalog() {
  const location = useLocation();
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [occasion, setOccasion] = useState("toate");
  const [flavorTag, setFlavorTag] = useState("toate");
  const [priceBand, setPriceBand] = useState("toate");
  const [portionBand, setPortionBand] = useState("toate");
  const [avoidAllergen, setAvoidAllergen] = useState("niciunul");
  const [onlyPremium, setOnlyPremium] = useState(false);
  const [onlyPopular, setOnlyPopular] = useState(false);
  const [onlyFastReady, setOnlyFastReady] = useState(false);
  const [onlyDirectCheckout, setOnlyDirectCheckout] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [highlightedFillingId, setHighlightedFillingId] = useState("");

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
    if (location.hash !== "#umpluturile-mele") return;

    const scrollToFillings = () => {
      const element = document.getElementById("umpluturile-mele");
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const timer = window.setTimeout(scrollToFillings, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const selectedFillingQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("selectedUmplutura") || "";
  }, [location.search]);
  const selectedCakeQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("selectedTort") || "";
  }, [location.search]);

  const selectedFilling = useMemo(() => {
    const normalized = normalizeStorefrontText(selectedFillingQuery);
    if (!normalized) return null;

    return (
      CATALOG_FILLINGS.find((item) => {
        const name = normalizeStorefrontText(item.name);
        return name === normalized || name.includes(normalized) || normalized.includes(name);
      }) || null
    );
  }, [selectedFillingQuery]);
  const catalogItems = useMemo(() => getStorefrontCatalogItems(rawItems), [rawItems]);
  const usesFallbackCatalog = useMemo(
    () => catalogItems.length > 0 && catalogItems.every((item) => item.sourceType === "local-fallback"),
    [catalogItems]
  );
  const selectedCake = useMemo(() => {
    const normalized = normalizeStorefrontText(selectedCakeQuery);
    if (!normalized) return null;

    return (
      catalogItems.find((item) => {
        const slug = normalizeStorefrontText(item.slug);
        const id = normalizeStorefrontText(item._id);
        const name = normalizeStorefrontText(item.nume);
        return (
          slug === normalized ||
          id === normalized ||
          name === normalized ||
          slug.includes(normalized) ||
          name.includes(normalized)
        );
      }) || null
    );
  }, [catalogItems, selectedCakeQuery]);

  const activeSelectedFillingId = selectedFilling?.id || "";
  const compatibleFillingIds = useMemo(() => {
    if (!selectedCake) return [];

    return CATALOG_FILLINGS.filter((filling) => matchesSelectedFillingCake(selectedCake, filling)).map(
      (filling) => filling.id
    );
  }, [selectedCake]);

  useEffect(() => {
    if (!selectedFilling) {
      setHighlightedFillingId("");
      return undefined;
    }

    setHighlightedFillingId(selectedFilling.id);

    const revealTimer = window.setTimeout(() => {
      const element = document.getElementById(`filling-card-${selectedFilling.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 220);

    const clearTimer = window.setTimeout(() => {
      setHighlightedFillingId("");
    }, 4200);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(clearTimer);
    };
  }, [selectedFilling]);

  const sortedFillings = useMemo(() => {
    if (selectedFilling) {
      return [
        selectedFilling,
        ...CATALOG_FILLINGS.filter((item) => item.id !== selectedFilling.id),
      ];
    }

    if (!selectedCake || compatibleFillingIds.length === 0) return CATALOG_FILLINGS;

    const compatibleSet = new Set(compatibleFillingIds);
    return [
      ...CATALOG_FILLINGS.filter((item) => compatibleSet.has(item.id)),
      ...CATALOG_FILLINGS.filter((item) => !compatibleSet.has(item.id)),
    ];
  }, [compatibleFillingIds, selectedCake, selectedFilling]);

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

  const normalizedQuery = normalizeStorefrontText(deferredQuery);
  const compatibleItems = useMemo(() => {
    if (!selectedFilling) return catalogItems;
    return catalogItems.filter((item) => matchesSelectedFillingCake(item, selectedFilling));
  }, [catalogItems, selectedFilling]);

  const filteredItems = useMemo(() => {
    const next = catalogItems.filter((item) => {
      if (selectedFilling && !matchesSelectedFillingCake(item, selectedFilling)) return false;
      if (occasion !== "toate" && !item.ocazii.includes(occasion)) return false;
      if (flavorTag !== "toate" && !item.displayTags.includes(flavorTag)) return false;
      if (!matchesCatalogPriceBand(item, priceBand)) return false;
      if (!matchesCatalogPortionBand(item, portionBand)) return false;
      if (!matchesCatalogAllergenAvoidance(item, avoidAllergen)) return false;
      if (onlyPremium && !isPremiumCatalogItem(item)) return false;
      if (onlyPopular && !isPopularCatalogItem(item)) return false;
      if (onlyFastReady && !isFastReadyCatalogItem(item)) return false;
      if (onlyDirectCheckout && item.checkoutReady !== true) return false;
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
  }, [
    avoidAllergen,
    catalogItems,
    flavorTag,
    normalizedQuery,
    occasion,
    onlyDirectCheckout,
    onlyFastReady,
    onlyPopular,
    onlyPremium,
    portionBand,
    priceBand,
    selectedFilling,
    sort,
  ]);

  const highlightedCount = filteredItems.filter((item) => isPopularCatalogItem(item)).length;
  const premiumCount = filteredItems.filter((item) => isPremiumCatalogItem(item)).length;
  const activeFilterCount = [
    query,
    occasion !== "toate",
    flavorTag !== "toate",
    priceBand !== "toate",
    portionBand !== "toate",
    avoidAllergen !== "niciunul",
    onlyPremium,
    onlyPopular,
    onlyFastReady,
    onlyDirectCheckout,
    sort !== "recommended",
    Boolean(selectedFilling),
  ].filter(Boolean).length;
  const directCheckoutCount = filteredItems.filter((item) => item.checkoutReady === true).length;
  const fastReadyCount = filteredItems.filter((item) => isFastReadyCatalogItem(item)).length;
  const fillingCategories = useMemo(
    () => Array.from(new Set(CATALOG_FILLINGS.map((item) => item.category))).slice(0, 5),
    []
  );
  const premiumFillings = useMemo(
    () => CATALOG_FILLINGS.filter((item) => Number(item.priceExtra || 0) >= 90).length,
    []
  );
  const fillingPriceRange = useMemo(() => {
    const prices = CATALOG_FILLINGS.map((item) => Number(item.priceExtra || 0)).filter(
      (value) => Number.isFinite(value) && value > 0
    );
    if (!prices.length) return "atelier Maison-Douce";
    return `${Math.min(...prices)}-${Math.max(...prices)} MDL / kg`;
  }, []);

  const resetFilters = () => {
    setQuery("");
    setOccasion("toate");
    setFlavorTag("toate");
    setPriceBand("toate");
    setPortionBand("toate");
    setAvoidAllergen("niciunul");
    setOnlyPremium(false);
    setOnlyPopular(false);
    setOnlyFastReady(false);
    setOnlyDirectCheckout(false);
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
      sourceType: item.sourceType,
      requiresQuote: item.requiresManualQuote === true,
    });
  };

  const sortLabel =
    STOREFRONT_SORT_OPTIONS.find((option) => option.value === sort)?.label || "Recomandate";

  return (
    <div className="min-h-screen pb-16">
      <section
        id="umpluturile-mele"
        className="relative overflow-hidden scroll-mt-28 px-4 pb-8 pt-8 md:px-6 md:pt-12"
      >
        <div className="absolute inset-0 bg-brand-wash" />
        <div className="absolute -right-16 top-4 h-72 w-72 rounded-full bg-white/65 blur-3xl" />
        <div className="absolute left-0 top-32 h-72 w-72 rounded-full bg-rose-100/70 blur-3xl" />

        <div className="relative mx-auto max-w-editorial space-y-8">
          <div className={`${cards.tinted} relative overflow-hidden`}>
            <div className="absolute -right-8 top-0 h-48 w-48 rounded-full bg-white/60 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-rose-100/70 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <div className="eyebrow">Maison-Douce Atelier</div>
                <div>
                  <div className="font-script text-3xl text-pink-500">Arome fine pentru fiecare compozitie</div>
                  <h1 className="mt-2 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">
                    Umpluturile mele de torturi
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#665d54] md:text-lg">
                    O selectie feminina, eleganta si premium de creme Maison-Douce, gandita pentru
                    torturi artizanale cu personalitate: de la vanilie fina si mascarpone cu fructe,
                    pana la fistic, caramel sarat si accente inspirate de Snickers sau Raffaello.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {fillingCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-semibold text-[#6d6056]"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                {selectedFilling ? (
                  <div className="rounded-[24px] border border-sage-deep/15 bg-white/85 p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
                          Selectia ta curenta
                        </div>
                        <div className="font-serif text-2xl font-semibold text-ink">
                          {selectedFilling.name}
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-[#665d54]">
                          Pastrez aceasta umplutura evidentiata ca sa compari mai usor restul
                          optiunilor fara sa pierzi alegerea de pornire.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-sage-deep/15 bg-sage/25 px-3 py-1.5 text-xs font-semibold text-sage-deep">
                            {selectedFilling.category}
                          </span>
                          <span className="rounded-full border border-sage-deep/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#6d6056]">
                            +{Number(selectedFilling.priceExtra || 0)} MDL / kg
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/constructor?umplutura=${encodeURIComponent(selectedFilling.name)}`}
                          className={buttons.primary}
                        >
                          Revino in constructor
                        </Link>
                        <Link
                          to="/catalog#umpluturile-mele"
                          className={buttons.outline}
                        >
                          Arata toate
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}

                {!selectedFilling && selectedCake ? (
                  <div className="rounded-[24px] border border-[#d8c3a7]/30 bg-[#fff8ef] p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6848]">
                          Umpluturi recomandate pentru
                        </div>
                        <div className="font-serif text-2xl font-semibold text-ink">
                          {selectedCake.nume}
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-[#665d54]">
                          Am adus primele in lista cremele si umpluturile care se potrivesc cel mai
                          bine cu acest tort, pe baza profilului aromatic si a compozitiei lui.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#d8c3a7]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#8a6848]">
                            {compatibleFillingIds.length} umpluturi recomandate
                          </span>
                          <span className="rounded-full border border-[#d8c3a7]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#6d6056]">
                            {selectedCake.shortFlavor}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/tort/${selectedCake._id}`} className={buttons.primary}>
                          Vezi detalii tort
                        </Link>
                        <Link to="/catalog#umpluturile-mele" className={buttons.outline}>
                          Arata toate umpluturile
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Selectie</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{CATALOG_FILLINGS.length}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">umpluturi semnatura</div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Premium</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{premiumFillings}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">optiuni cu profil intens</div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Extra recomandat</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{fillingPriceRange}</div>
                  <div className="mt-1 text-sm text-[#7b736a]">orientativ pentru selectie</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedFillings.map((filling) => (
              <CatalogFillingCard
                key={filling.id}
                filling={filling}
                selected={activeSelectedFillingId === filling.id}
                recommended={
                  !selectedFilling &&
                  compatibleFillingIds.includes(filling.id)
                }
                flash={highlightedFillingId === filling.id}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="catalog-torturi"
        className="relative overflow-hidden px-4 pb-6 pt-2 md:px-6 md:pt-4"
      >
        <div className="absolute inset-0 bg-brand-wash" />
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sage/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-editorial gap-5 xl:grid-cols-[1.15fr,0.85fr]">
          <div className={`${cards.elevated} relative overflow-hidden`}>
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sage/25 blur-3xl" />
            <div className="relative space-y-5">
              <div className="eyebrow">Colectia de torturi Maison-Douce</div>
              <div>
                <div className="font-script text-3xl text-pink-500">Torturile casei</div>
                <h2 className="mt-2 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">
                  Catalog de torturi artizanale cu prezentare editoriala si selectie realista in MDL
                </h2>
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
                <div>Filtre comerciale pentru pret, portii, checkout direct si disponibilitate rapida.</div>
                <div>Actiuni rapide pentru detalii, cos si personalizare.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-editorial px-4 md:px-6">
        <div className="rounded-[32px] border border-rose-100 bg-[rgba(255,251,245,0.92)] p-5 shadow-card backdrop-blur md:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.75fr,0.75fr,0.75fr,0.8fr]">
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

            <label className="block">
              <span className="text-sm font-semibold text-[#4f463e]">Buget</span>
              <select
                value={priceBand}
                onChange={(event) => setPriceBand(event.target.value)}
                className="mt-2 w-full rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
              >
                {STOREFRONT_PRICE_BANDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#4f463e]">Portii</span>
              <select
                value={portionBand}
                onChange={(event) => setPortionBand(event.target.value)}
                className="mt-2 w-full rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
              >
                {STOREFRONT_PORTION_BANDS.map((option) => (
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
              <div className="mt-3 space-y-1 text-xs uppercase tracking-[0.12em] text-[#8a8178]">
                <div>{directCheckoutCount} intra direct in checkout</div>
                <div>{fastReadyCount} sunt disponibile mai rapid</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr,1fr,1fr,0.95fr]">
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

            <div>
              <div className="text-sm font-semibold text-[#4f463e]">Filtre comerciale</div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <FilterChip
                  label="Doar checkout direct"
                  active={onlyDirectCheckout}
                  onClick={() => setOnlyDirectCheckout((current) => !current)}
                />
                <FilterChip
                  label="Disponibil mai rapid"
                  active={onlyFastReady}
                  onClick={() => setOnlyFastReady((current) => !current)}
                />
                <FilterChip
                  label="Bestseller"
                  active={onlyPopular}
                  onClick={() => setOnlyPopular((current) => !current)}
                />
                <FilterChip
                  label="Premium"
                  active={onlyPremium}
                  onClick={() => setOnlyPremium((current) => !current)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[#4f463e]">Evita alergeni</span>
                <select
                  value={avoidAllergen}
                  onChange={(event) => setAvoidAllergen(event.target.value)}
                  className="mt-2 w-full rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
                >
                  {STOREFRONT_ALLERGEN_AVOIDANCE.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs leading-6 text-[#7b736a]">
                Filtrul foloseste etichetele de alergeni din catalog si este orientativ. Pentru
                comenzi sensibile, confirma manual ingredientele inainte de plasare.
              </div>
              <button type="button" className={buttons.outline} onClick={resetFilters}>
                Reseteaza filtrele
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error} Aceste carduri raman disponibile doar pentru inspiratie si cerere de oferta
            pana revine catalogul live.
          </div>
        ) : null}

        {!error && !loading && usesFallbackCatalog ? (
          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Catalogul publicat nu are inca produse live. Afisam colectia Maison-Douce de inspiratie,
            iar aceste torturi pot fi folosite pentru comparatie, personalizare si cerere de oferta.
          </div>
        ) : null}

        <CakeWeightCalculator />

        {selectedFilling ? (
          <div className="mt-8 rounded-[30px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(233,240,228,0.82))] p-5 shadow-soft md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-deep">
                  Filtrare dupa umplutura
                </div>
                <h2 className="font-serif text-3xl text-ink">
                  Torturi potrivite pentru {selectedFilling.name}
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[#665d54]">
                  Afisez mai jos doar torturile care se potrivesc natural cu aceasta compozitie,
                  pe baza aromelor, profilului si recomandarilor Maison-Douce.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-sage-deep/15 bg-white/90 px-3 py-1.5 text-xs font-semibold text-sage-deep">
                    {compatibleItems.length} propuneri compatibile
                  </span>
                  <span className="rounded-full border border-sage-deep/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#6d6056]">
                    {selectedFilling.textureLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/constructor?umplutura=${encodeURIComponent(selectedFilling.name)}`}
                  className={buttons.primary}
                >
                  Revino in constructor
                </Link>
                <Link to="/catalog#catalog-torturi" className={buttons.outline}>
                  Vezi tot catalogul
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
              Selectie actuala
            </div>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Torturi pentru aniversari, nunti si evenimente premium
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#665d54]">
              Cardurile cu produs live intra direct in cos. Modelele de inspiratie sau cele fara
              pret valid raman pe flux de cerere de oferta si personalizare.
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
              {selectedFilling
                ? "Filtrele active sunt prea restrictive pentru umplutura selectata. Revino la filtrele implicite sau afiseaza intregul catalog Maison-Douce."
                : "Incearca o cautare mai scurta sau revino la filtrele implicite pentru a vedea intreaga colectie Maison-Douce."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" className={buttons.primary} onClick={resetFilters}>
                Vezi intreaga selectie
              </button>
              {selectedFilling ? (
                <Link to="/catalog#catalog-torturi" className={buttons.outline}>
                  Scoate filtrul de umplutura
                </Link>
              ) : null}
            </div>
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
