import { describe, expect, it } from "vitest";
import {
  buildCustomOrderPreviewImages,
  buildCustomOrderSections,
  getCustomOrderStatusMeta,
} from "./customOrderSummary";

describe("customOrderSummary", () => {
  it("groups custom order options into readable sections", () => {
    const sections = buildCustomOrderSections({
      preferinte: "Vreau un tort elegant",
      statusHistory: [{ status: "noua", note: "abia trimisa" }],
      options: {
        tiers: 2,
        heightProfile: "tall",
        estimatedServings: "20-28 portii",
        estimatedWeightKg: "3.1-4.4 kg",
        blat: "ciocolata",
        crema: "pistachio",
        umplutura: "oreo",
        decor: "lambeth",
        topping: "ciocolata",
        aiDecorRequest: "flori albe si accente aurii",
        aiPrompt: "prompt lung",
        inspirationImages: [{ label: "dantela si perle", url: "/uploads/ref.png" }],
      },
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Structura",
      "Interior",
      "Exterior",
      "Cerinta client",
      "AI decor",
      "Imagini inspiratie",
      "Istoric",
    ]);
    expect(sections[0].items[0]).toEqual({ label: "Etaje", value: "2" });
  });

  it("deduplicates preview images", () => {
    const images = buildCustomOrderPreviewImages({
      imagine: "/uploads/design.png",
      options: {
        aiPreviewUrl: "/uploads/design.png",
        inspirationImages: [{ url: "/uploads/design.png" }, { url: "/uploads/ref-2.png" }],
      },
    });

    expect(images).toHaveLength(2);
    expect(images[0].label).toBe("Preview 2D");
  });

  it("returns styled status metadata", () => {
    expect(getCustomOrderStatusMeta("in_discutie").label).toBe("In discutie");
    expect(getCustomOrderStatusMeta("in_discutie").className).toContain("amber");
    expect(getCustomOrderStatusMeta("comanda_generata").label).toBe("Comanda generata");
  });
});
