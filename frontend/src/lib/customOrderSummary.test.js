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
      options: {
        tiers: 2,
        heightProfile: "tall",
        blat: "ciocolata",
        crema: "pistachio",
        umplutura: "oreo",
        decor: "lambeth",
        topping: "ciocolata",
        aiDecorRequest: "flori albe si accente aurii",
        aiPrompt: "prompt lung",
      },
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Structura",
      "Interior",
      "Exterior",
      "Cerinta client",
      "AI decor",
    ]);
    expect(sections[0].items[0]).toEqual({ label: "Etaje", value: "2" });
  });

  it("deduplicates preview images", () => {
    const images = buildCustomOrderPreviewImages({
      imagine: "/uploads/design.png",
      options: {
        aiPreviewUrl: "/uploads/design.png",
      },
    });

    expect(images).toHaveLength(1);
    expect(images[0].label).toBe("Preview 2D");
  });

  it("returns styled status metadata", () => {
    expect(getCustomOrderStatusMeta("in_discutie").label).toBe("In discutie");
    expect(getCustomOrderStatusMeta("in_discutie").className).toContain("amber");
  });
});
