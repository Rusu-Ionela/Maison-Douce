import { describe, expect, it } from "vitest";
import { buildCheckoutNotes } from "./checkoutNotes";

describe("buildCheckoutNotes", () => {
  it("joins the checkout note sections in a stable order", () => {
    expect(
      buildCheckoutNotes({
        cakeMessage: "La multi ani, Mara!",
        dietaryNotes: "Fara alune",
        orderNotes: "Ambalaj pentru transport lung",
      })
    ).toBe(
      [
        "Mesaj pe tort: La multi ani, Mara!",
        "Alergii sau restrictii: Fara alune",
        "Observatii comanda: Ambalaj pentru transport lung",
      ].join("\n")
    );
  });

  it("omits empty sections", () => {
    expect(buildCheckoutNotes({ orderNotes: "Sunati la sosire" })).toBe(
      "Observatii comanda: Sunati la sosire"
    );
  });

  it("returns an empty string when no notes are provided", () => {
    expect(buildCheckoutNotes()).toBe("");
  });
});
