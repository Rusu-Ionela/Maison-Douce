import { describe, expect, it } from "vitest";
import {
  isFastReadyCatalogItem,
  isPopularCatalogItem,
  isPremiumCatalogItem,
  matchesCatalogAllergenAvoidance,
  matchesCatalogPortionBand,
  matchesCatalogPriceBand,
} from "./catalogFilters";

describe("catalogFilters", () => {
  const fixedItem = {
    pret: 920,
    checkoutReady: true,
    timpPreparareOre: 26,
    portii: 16,
    displayTags: ["premium", "fructe"],
    badge: { label: "Popular" },
    ratingCount: 7,
    alergeniFolositi: ["gluten", "ouă", "lactoză"],
    ocazii: ["nuntă"],
  };

  it("detects premium, popular and fast-ready catalog items", () => {
    expect(isPremiumCatalogItem(fixedItem)).toBe(true);
    expect(isPopularCatalogItem(fixedItem)).toBe(true);
    expect(isFastReadyCatalogItem(fixedItem)).toBe(true);
  });

  it("matches price and portion bands for fixed-price cakes", () => {
    expect(matchesCatalogPriceBand(fixedItem, "700_900")).toBe(false);
    expect(matchesCatalogPriceBand(fixedItem, "peste_900")).toBe(true);
    expect(matchesCatalogPortionBand(fixedItem, "13_18")).toBe(true);
    expect(matchesCatalogPortionBand(fixedItem, "max_12")).toBe(false);
  });

  it("filters allergen avoidance and quote-only items correctly", () => {
    expect(matchesCatalogAllergenAvoidance(fixedItem, "lactoza")).toBe(false);
    expect(matchesCatalogAllergenAvoidance(fixedItem, "nuci")).toBe(true);

    const quoteItem = {
      pret: 0,
      checkoutReady: false,
      alergeniFolositi: ["migdale"],
    };

    expect(matchesCatalogPriceBand(quoteItem, "cerere_oferta")).toBe(true);
    expect(matchesCatalogAllergenAvoidance(quoteItem, "nuci")).toBe(false);
  });
});
