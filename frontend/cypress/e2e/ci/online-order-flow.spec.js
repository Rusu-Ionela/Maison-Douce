describe("guided online order flow", () => {
  it("estimates kg and forwards the client into the constructor", () => {
    cy.intercept("GET", "**/api/utilizatori/providers", {
      statusCode: 200,
      body: {
        items: [],
        defaultProviderId: "",
      },
    }).as("providers");

    cy.visit("http://localhost:5173/comanda-online");

    cy.contains("h1", "Un traseu clar pentru clientii care intra prima data pe site").should(
      "be.visible"
    );
    cy.get('input[placeholder="Ex: 24"]').clear().type("28");
    cy.contains("button", "Nunta").click();
    cy.contains("button", "Portii mai mari").click();

    cy.contains("Pentru 28 persoane").should("be.visible");
    cy.contains("5,3 kg").should("be.visible");
    cy.contains("button", "Continua catre alegerea tipului de comanda").click();

    cy.contains("Alege directia potrivita pentru comanda ta").should("be.visible");
    cy.contains("button", "Deschide constructorul").click();

    cy.wait("@providers");
    cy.url().should("include", "/constructor");
    cy.url().should("include", "flow=guided");
    cy.url().should("include", "persons=28");
    cy.url().should("include", "event=nunta");
    cy.url().should("include", "portion=generous");
    cy.contains("Cerere personalizata prin constructorul 2D").should("be.visible");
  });
});
