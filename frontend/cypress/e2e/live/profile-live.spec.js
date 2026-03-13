describe("Profile flow (live backend)", () => {
  const email = `live-client-${Date.now()}@example.com`;
  const password = "Secret123!";

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.request("POST", "http://127.0.0.1:5000/api/auth/seed-test-user", {
      email,
      password,
      rol: "client",
    }).its("status").should("eq", 200);
  });

  it("logs in, updates the profile and keeps the saved data after reload", () => {
    cy.visit("/login");

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains("button", "Intra").click();

    cy.location("pathname", { timeout: 10000 }).should("eq", "/calendar");

    cy.visit("/profil");
    cy.contains(/Profil client/i).should("be.visible");

    cy.contains("label", "Telefon")
      .find("input")
      .clear()
      .type("+37369999999");
    cy.contains("label", "Adresa principala")
      .find("input")
      .clear()
      .type("Strada Profil 99");
    cy.contains("label", "Note")
      .find("textarea")
      .clear()
      .type("Prefer cheesecake si fructe.");
    cy.contains("button", "Salveaza profilul").click();

    cy.contains("Profil actualizat cu succes.", { timeout: 10000 }).should(
      "be.visible"
    );

    cy.reload();
    cy.visit("/profil");

    cy.contains("label", "Telefon")
      .find("input")
      .should("have.value", "+37369999999");
    cy.contains("label", "Adresa principala")
      .find("input")
      .should("have.value", "Strada Profil 99");
    cy.contains("label", "Note")
      .find("textarea")
      .should("have.value", "Prefer cheesecake si fructe.");
  });
});
