describe("constructor route", () => {
  it("renders the constructor page locally", () => {
    cy.intercept("GET", "**/api/utilizatori/providers", {
      statusCode: 200,
      body: {
        items: [],
        defaultProviderId: "",
      },
    }).as("providers");

    cy.visit("http://localhost:5173/constructor");
    cy.wait("@providers");

    cy.contains("Cerere personalizata prin constructorul 2D").should("be.visible");
    cy.contains("Decor liber si layer management").should("be.visible");
    cy.contains("Preview realist cu AI").should("be.visible");
  });
});
