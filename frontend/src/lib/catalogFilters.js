import { normalizeStorefrontText } from "./storefrontCatalog";

export const STOREFRONT_PRICE_BANDS = [
  { value: "toate", label: "Toate preturile" },
  { value: "sub_700", label: "Sub 700 MDL" },
  { value: "700_900", label: "700-900 MDL" },
  { value: "peste_900", label: "Peste 900 MDL" },
  { value: "cerere_oferta", label: "Cerere de oferta" },
];

export const STOREFRONT_PORTION_BANDS = [
  { value: "toate", label: "Toate marimile" },
  { value: "max_12", label: "Pana la 12 portii" },
  { value: "13_18", label: "13-18 portii" },
  { value: "peste_18", label: "Peste 18 portii" },
];

export const STOREFRONT_ALLERGEN_AVOIDANCE = [
  { value: "niciunul", label: "Fara restrictie" },
  { value: "gluten", label: "Evita gluten" },
  { value: "lactoza", label: "Evita lactoza" },
  { value: "nuci", label: "Evita nuci si seminte oleaginoase" },
];

function getAllergenValues(item) {
  return (Array.isArray(item?.alergeniFolositi) ? item.alergeniFolositi : [])
    .map((value) => normalizeStorefrontText(value))
    .filter(Boolean);
}

export function isPremiumCatalogItem(item) {
  const tags = Array.isArray(item?.displayTags) ? item.displayTags : [];
  const occasions = Array.isArray(item?.ocazii) ? item.ocazii : [];
  return (
    tags.includes("premium") ||
    Number(item?.pret || 0) >= 900 ||
    occasions.includes("nuntă")
  );
}

export function isPopularCatalogItem(item) {
  return (
    String(item?.badge?.label || "").trim().toLowerCase() === "popular" ||
    Number(item?.ratingCount || 0) >= 5 ||
    Number(item?.featuredRank || 999) <= 3
  );
}

export function isFastReadyCatalogItem(item) {
  return item?.checkoutReady === true && Number(item?.timpPreparareOre || 999) <= 28;
}

export function matchesCatalogPriceBand(item, priceBand) {
  if (!priceBand || priceBand === "toate") return true;
  if (priceBand === "cerere_oferta") return item?.checkoutReady !== true;

  const price = Number(item?.pret || 0);
  if (!Number.isFinite(price) || item?.checkoutReady !== true) return false;

  if (priceBand === "sub_700") return price < 700;
  if (priceBand === "700_900") return price >= 700 && price <= 900;
  if (priceBand === "peste_900") return price > 900;
  return true;
}

export function matchesCatalogPortionBand(item, portionBand) {
  if (!portionBand || portionBand === "toate") return true;

  const portions = Number(item?.portii || 0);
  if (!Number.isFinite(portions) || portions <= 0) return false;

  if (portionBand === "max_12") return portions <= 12;
  if (portionBand === "13_18") return portions >= 13 && portions <= 18;
  if (portionBand === "peste_18") return portions > 18;
  return true;
}

export function matchesCatalogAllergenAvoidance(item, avoidance) {
  if (!avoidance || avoidance === "niciunul") return true;

  const allergens = getAllergenValues(item);
  if (!allergens.length) return true;

  if (avoidance === "gluten") {
    return !allergens.some((value) => value.includes("gluten"));
  }
  if (avoidance === "lactoza") {
    return !allergens.some((value) => value.includes("lact"));
  }
  if (avoidance === "nuci") {
    return !allergens.some((value) =>
      ["nuci", "alune", "migdal", "fistic", "caju", "arahide"].some((token) =>
        value.includes(token)
      )
    );
  }

  return true;
}
