const apiUrl = Cypress.env("apiUrl") || "http://127.0.0.1:5000/api";

describe("Auth flow (live backend)", () => {
  const email = `live-admin-${Date.now()}@example.com`;
  const password = "Secret123!";

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.request("POST", `${apiUrl}/auth/seed-test-user`, {
      email,
      password,
      rol: "admin",
    }).its("status").should("eq", 200);
  });

  it("logs in through the real backend and reaches admin calendar", () => {
    cy.visit("/login");

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains("button", "Intra").click();

    cy.location("pathname", { timeout: 10000 }).should("eq", "/admin/calendar");
    cy.contains(/Calendar Admin/i).should("be.visible");
  });
});
