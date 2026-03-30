import { describe, expect, it } from "vitest";
import {
  buildCakeAiPrompt,
  buildCakePreviewModel,
  findCakeOption,
  getCakeDesignSummary,
} from "./cakePreview2D";

function buildSelectedOptions() {
  return {
    blat: findCakeOption("blat", "ciocolata"),
    crema: findCakeOption("crema", "pistachio"),
    umplutura: findCakeOption("umplutura", "oreo"),
    decor: findCakeOption("decor", "lambeth"),
    topping: findCakeOption("topping", "ciocolata"),
    culoare: findCakeOption("culori", "#e8e2f2"),
    font: findCakeOption("font", "Times New Roman"),
  };
}

describe("cakePreview2D", () => {
  it("builds a multi-tier preview model", () => {
    const model = buildCakePreviewModel({
      stageWidth: 640,
      stageHeight: 460,
      selectedOptions: buildSelectedOptions(),
      message: "La multi ani",
      structureOptions: {
        tiers: 2,
        heightProfile: "tall",
      },
    });

    expect(model.tiers).toHaveLength(2);
    expect(model.structure.tierCount).toBe(2);
    expect(model.structure.heightLabel).toBe("Inalt");
    expect(model.primaryTier.layers.length).toBeGreaterThan(0);
  });

  it("includes structure and free-form request in the AI prompt", () => {
    const prompt = buildCakeAiPrompt({
      selectedOptions: buildSelectedOptions(),
      structureOptions: {
        tiers: 3,
        heightProfile: "balanced",
      },
      message: "Elena",
      customRequest: "trandafiri albi si accente aurii",
    });

    expect(prompt).toContain("3 etaje");
    expect(prompt).toContain("trandafiri albi si accente aurii");
    expect(prompt).toContain("Mesaj pe tort");
  });

  it("mentions the chosen structure in the summary", () => {
    const summary = getCakeDesignSummary(buildSelectedOptions(), {
      tiers: 2,
      heightProfile: "balanced",
    });

    expect(summary).toContain("2 etaje");
    expect(summary).toContain("profil echilibrat");
  });
});
