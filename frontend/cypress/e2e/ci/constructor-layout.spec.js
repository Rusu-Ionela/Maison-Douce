function stubProviders() {
  cy.intercept("GET", "**/api/utilizatori/providers", {
    statusCode: 200,
    body: {
      items: [],
      defaultProviderId: "",
    },
  }).as("providers");
}

function openConstructor() {
  stubProviders();
  cy.visit("http://localhost:5173/constructor");
  cy.wait("@providers");
}

describe("constructor layout", () => {
  it("uses natural page scroll on laptop viewports", () => {
    cy.viewport(1366, 900);
    openConstructor();

    cy.get('[data-testid="constructor-preview-panel"]').should(($panel) => {
      const style = getComputedStyle($panel[0]);
      expect(style.position).to.equal("sticky");
      expect(style.overflowY).to.equal("visible");
    });

    cy.contains("Decor liber si layer management").scrollIntoView().should("be.visible");
    cy.contains("Preview realist cu AI").scrollIntoView().should("be.visible");
    cy.contains("Tort fixat").should("not.exist");
  });

  it("keeps the preview sticky on very wide desktop screens while the right column scrolls", () => {
    cy.viewport(1600, 1000);
    openConstructor();

    cy.get('[data-testid="constructor-preview-panel"]').should(($panel) => {
      const style = getComputedStyle($panel[0]);
      expect(style.position).to.equal("sticky");
      expect(style.overflowY).to.equal("visible");
    });

    cy.contains("Preview realist cu AI").scrollIntoView();
    cy.contains("Tort fixat").should("not.exist");
  });

  it("shows the compact floating preview on mobile after the main preview leaves the viewport", () => {
    cy.viewport(390, 844);
    openConstructor();

    cy.contains("Preview premium 2D").scrollIntoView();
    cy.contains("Preview realist cu AI").scrollIntoView();
    cy.contains("Preview live").should("be.visible");
    cy.contains("button", "Vezi mare").should("be.visible");
  });
});
