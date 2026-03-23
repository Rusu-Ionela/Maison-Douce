describe("Report login smoke", () => {
  it("renders the login form", () => {
    cy.viewport(1440, 900);
    cy.visit("/login");

    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.contains("button", "Intra").should("be.visible");

    cy.screenshot("report-login-smoke");
  });
});
