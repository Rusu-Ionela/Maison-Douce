import { describe, expect, it } from "vitest";
import {
  buildCakeAiVariantPrompts,
  buildCakeInspirationSummary,
  buildCakeAiPrompt,
  buildCakePreviewModel,
  estimateCakeOrderMetrics,
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
      inspirationItems: [{ label: "dantela fina si flori naturale" }],
    });

    expect(prompt).toContain("3 etaje");
    expect(prompt).toContain("trandafiri albi si accente aurii");
    expect(prompt).toContain("Mesaj pe tort");
    expect(prompt).toContain("Imagini de inspiratie");
  });

  it("mentions the chosen structure in the summary", () => {
    const summary = getCakeDesignSummary(buildSelectedOptions(), {
      tiers: 2,
      heightProfile: "balanced",
    });

    expect(summary).toContain("2 etaje");
    expect(summary).toContain("profil echilibrat");
    expect(summary).toContain("portii");
  });

  it("estimates servings and weight for the selected structure", () => {
    const metrics = estimateCakeOrderMetrics({
      tiers: 3,
      heightProfile: "tall",
    });

    expect(metrics.minServings).toBeGreaterThanOrEqual(32);
    expect(metrics.maxWeightKg).toBeGreaterThan(metrics.minWeightKg);
    expect(metrics.servingsLabel).toContain("portii");
  });

  it("builds three AI variant prompts from the same configuration", () => {
    const prompts = buildCakeAiVariantPrompts({
      selectedOptions: buildSelectedOptions(),
      structureOptions: {
        tiers: 2,
        heightProfile: "balanced",
      },
      customRequest: "flori albe elegante",
    });

    expect(prompts).toHaveLength(3);
    expect(prompts[1]).toContain("Varianta 2");
  });

  it("summarizes inspiration references for the AI prompt", () => {
    const summary = buildCakeInspirationSummary([
      { label: "forma inalta" },
      { label: "perle si accente aurii" },
    ]);

    expect(summary).toContain("Referinta 1");
    expect(summary).toContain("aurii");
  });
});
