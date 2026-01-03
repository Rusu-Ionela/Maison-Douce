describe("AI Recommendations UI", () => {
  beforeEach(() => {
    cy.intercept("POST", "**/recommendations/ai", {
      ok: true,
      recomandate: [
        {
          _id: "demo-tort-1",
          nume: "Tort demo AI",
          pret: 120,
          descriere: "Recomandare hibrid popularitate + gusturi.",
          reasons: ["Popular (5 vânzări)", "Categorie preferată: torturi"],
        },
      ],
    }).as("aiRecs");
  });

  it("afiseaza recomandarile AI pe homepage", () => {
    cy.visit("/");
    cy.wait("@aiRecs");

    cy.contains(/Recomandate pentru tine/i).should("be.visible");
    cy.get('[data-cy="rec-card"]').should("have.length.at.least", 1);
    cy.contains("Tort demo AI").should("exist");
  });
});

