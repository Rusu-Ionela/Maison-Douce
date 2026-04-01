import { describe, expect, it } from "vitest";
import {
  getStorefrontCake,
  getStorefrontCatalogItems,
  getStorefrontFallbackCakeById,
} from "./storefrontCatalog";

describe("storefrontCatalog", () => {
  it("marks curated fallback items as quote-only inspiration", () => {
    const items = getStorefrontCatalogItems([]);

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toEqual(
      expect.objectContaining({
        sourceType: "local-fallback",
        pricingMode: "preview",
        checkoutReady: false,
        requiresManualQuote: true,
      })
    );
  });

  it("keeps live backend products checkout-ready when price is valid", () => {
    const cake = getStorefrontCake({
      _id: "product-1",
      nume: "Tort Fistic si Zmeura",
      pret: 980,
      descriere: "Tort premium cu crema fina si zmeura proaspata pentru evenimente speciale.",
      ingrediente: ["fistic", "zmeura", "mascarpone"],
      arome: ["Fistic si zmeura"],
    });

    expect(cake).toEqual(
      expect.objectContaining({
        sourceType: "backend-mapped",
        pricingMode: "fixed",
        checkoutReady: true,
        requiresManualQuote: false,
        pret: 980,
      })
    );
  });

  it("returns fallback details as preview-only when opened directly", () => {
    const cake = getStorefrontFallbackCakeById("curated-red-velvet");

    expect(cake).toEqual(
      expect.objectContaining({
        sourceType: "local-fallback",
        pricingMode: "preview",
        checkoutReady: false,
      })
    );
  });
});
