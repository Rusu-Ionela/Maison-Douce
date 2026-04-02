import { describe, expect, it } from "vitest";
import {
  buildCustomOrderHighlights,
  buildCustomOrderPreviewImages,
  buildCustomOrderSections,
  getCustomOrderDecorationSummary,
  getCustomOrderFlowSummary,
  getCustomOrderOptionLabel,
  getCustomOrderStatusMeta,
} from "./customOrderSummary";

describe("customOrderSummary", () => {
  it("groups custom order options into readable sections", () => {
    const sections = buildCustomOrderSections({
      preferinte: "Vreau un tort elegant",
      statusHistory: [{ status: "noua", note: "abia trimisa" }],
      options: {
        orderFlow: {
          orderType: "idea",
          orderTypeLabel: "Genereaza",
          persons: 28,
          eventLabel: "Nunta",
          estimatedKgLabel: "4.2 kg",
          portionStyleLabel: "Portii normale",
        },
        shape: "heart",
        size: "grand",
        tiers: 2,
        heightProfile: "tall",
        estimatedServings: "20-28 portii",
        estimatedWeightKg: "3.1-4.4 kg",
        blat: "ciocolata",
        crema: "pistachio",
        umplutura: "oreo",
        decor: "lambeth",
        topping: "ciocolata",
        culoare: "#e8e2f2",
        font: "Times New Roman",
        decorationSummary: "2x Trandafiri din zahar, 1x Topper acrilic",
        aiDecorRequest: "flori albe si accente aurii",
        aiPrompt: "prompt lung",
        inspirationImages: [{ label: "dantela si perle", url: "/uploads/ref.png" }],
      },
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Brief client",
      "Structura",
      "Interior",
      "Exterior",
      "Cerinta client",
      "AI decor",
      "Imagini inspiratie",
      "Istoric",
    ]);
    expect(sections[0].items[0]).toEqual({ label: "Tip comanda", value: "Tort generat" });
    expect(sections[1].items[0]).toEqual({ label: "Forma", value: "Inima" });
    expect(sections[1].items[1]).toEqual({ label: "Dimensiune", value: "Mare" });
    expect(sections[3].items.at(-1)).toEqual({
      label: "Decor liber",
      value: "2x Trandafiri din zahar, 1x Topper acrilic",
    });
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

  it("formats highlights and decoration summary for advanced builders", () => {
    const options = {
      orderFlow: {
        orderType: "catalog",
        persons: 14,
        eventLabel: "Aniversare",
        estimatedKgLabel: "2.1 kg",
      },
      shape: "square",
      size: "petite",
      tiers: 2,
      heightProfile: "balanced",
      blat: "ciocolata",
      crema: "pistachio",
      umplutura: "oreo",
      decorations: [{ id: "1" }, { id: "2" }],
    };

    expect(getCustomOrderOptionLabel("shape", options.shape)).toBe("Patrat");
    expect(getCustomOrderDecorationSummary(options)).toBe("2 elemente decorative");
    expect(getCustomOrderFlowSummary(options)).toBe("Tort existent | 14 persoane | 2.1 kg | Aniversare");
    expect(buildCustomOrderHighlights(options)).toContain("forma Patrat");
    expect(buildCustomOrderHighlights(options)).toContain("2 decoruri libere");
  });
});
