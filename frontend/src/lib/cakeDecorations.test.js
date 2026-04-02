import { describe, expect, it } from "vitest";
import {
  countDecorationsByCategory,
  createDecorationElement,
  duplicateDecorationElement,
  estimateDecorationWorkload,
  normalizeDecorationElements,
  searchDecorationLibrary,
  summarizeDecorationElements,
} from "./cakeDecorations";

describe("cakeDecorations", () => {
  it("filters the decoration library by query and category", () => {
    const results = searchDecorationLibrary({
      query: "ursuleti",
      category: "figurine",
    });

    expect(results.some((item) => item.id === "teddy-bear")).toBe(true);
  });

  it("creates and duplicates decoration elements with bounded positions", () => {
    const element = createDecorationElement("sugar-rose", {
      tierCount: 3,
      preferredTierIndex: 2,
      preferredZone: "front",
      order: 4,
    });
    const copy = duplicateDecorationElement(element, 5);

    expect(element.tierIndex).toBe(2);
    expect(element.zone).toBe("front");
    expect(copy.id).not.toBe(element.id);
    expect(copy.zIndex).toBe(5);
    expect(copy.x).toBeGreaterThan(element.x);
  });

  it("normalizes persisted elements and preserves ordering", () => {
    const elements = normalizeDecorationElements(
      [
        {
          id: "b",
          definitionId: "gold-topper",
          tierIndex: 8,
          zone: "front",
          x: 9,
          y: -2,
          scale: 9,
          zIndex: 7,
        },
        {
          id: "a",
          definitionId: "berry-cluster",
          tierIndex: 0,
          zone: "top",
          zIndex: 2,
        },
      ],
      2
    );

    expect(elements).toHaveLength(2);
    expect(elements[0].id).toBe("a");
    expect(elements[1].tierIndex).toBe(1);
    expect(elements[1].zone).toBe("top");
    expect(elements[1].scale).toBeLessThanOrEqual(2.4);
  });

  it("summarizes decoration mix and estimates workload", () => {
    const elements = normalizeDecorationElements([
      createDecorationElement("sugar-rose"),
      createDecorationElement("sugar-rose"),
      createDecorationElement("gold-topper"),
    ]);

    const summary = summarizeDecorationElements(elements);
    const workload = estimateDecorationWorkload(elements);
    const counts = countDecorationsByCategory(elements);

    expect(summary).toContain("2x Trandafiri din zahar");
    expect(summary).toContain("Topper acrilic");
    expect(workload.price).toBeGreaterThan(0);
    expect(workload.prepHours).toBeGreaterThan(0);
    expect(counts.topper).toBe(1);
  });
});
