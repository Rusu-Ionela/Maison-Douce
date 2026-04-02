import { describe, expect, it } from "vitest";
import {
  buildOrderFlowHref,
  calculateOrderFlowEstimate,
  getCatalogPortionBandForPersons,
  normalizeOrderFlowContext,
  readOrderFlowContextFromSearch,
} from "./orderFlow";

describe("orderFlow", () => {
  it("calculates an estimated kg value from persons and portion style", () => {
    const result = calculateOrderFlowEstimate({ persons: 24, portionStyle: "generous" });

    expect(result.persons).toBe(24);
    expect(result.estimatedKg).toBe(4.6);
    expect(result.tierSuggestion).toBe("2 etaje");
  });

  it("normalizes the shared flow context", () => {
    const context = normalizeOrderFlowContext({
      persons: "18",
      eventType: "botez",
      portionStyle: "normal",
      orderType: "catalog",
    });

    expect(context.hasContext).toBe(true);
    expect(context.eventLabel).toBe("Botez");
    expect(context.orderTypeLabel).toBe("Tort existent");
  });

  it("serializes and reads the guided flow from the URL", () => {
    const href = buildOrderFlowHref("/catalog", {
      persons: 30,
      eventType: "nunta",
      portionStyle: "normal",
      orderType: "catalog",
    });
    const parsed = readOrderFlowContextFromSearch(href.split("?")[1]);

    expect(parsed?.persons).toBe(30);
    expect(parsed?.eventType).toBe("nunta");
    expect(parsed?.orderType).toBe("catalog");
  });

  it("maps persons to the matching catalog portion band", () => {
    expect(getCatalogPortionBandForPersons(10)).toBe("max_12");
    expect(getCatalogPortionBandForPersons(15)).toBe("13_18");
    expect(getCatalogPortionBandForPersons(26)).toBe("peste_18");
  });
});
