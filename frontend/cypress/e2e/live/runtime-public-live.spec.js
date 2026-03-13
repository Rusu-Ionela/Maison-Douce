function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const apiUrl = Cypress.env("apiUrl") || "http://127.0.0.1:5000/api";

describe("Public runtime routes (live backend)", () => {
  let tortId = "";
  let adminSession = null;

  const publicRoutes = [
    "/",
    "/catalog",
    "/cart",
    "/personalizeaza",
    "/constructor",
    "/desen-tort",
    "/designer-ai",
    "/tort-designer",
    "/patiser-drawing",
    "/retete",
    "/contact",
    "/despre",
    "/faq",
    "/termeni",
    "/confidentialitate",
    "/harta-site",
    "/abonament",
    "/comanda",
    "/login",
    "/register",
    "/reset-parola",
    "/resetare-parola",
  ];

  before(() => {
    cy.seedLiveUser({
      role: "admin",
      email: uniqueEmail("public-admin"),
    }).then((session) => {
      adminSession = session;

      return cy
        .request({
          method: "POST",
          url: `${apiUrl}/torturi`,
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          body: {
            nume: "Tort public live",
            descriere: "Tort pentru smoke test public.",
            pret: 170,
            imagine: "https://example.com/tort-live.jpg",
            ingrediente: ["vanilie", "fructe"],
            categorie: "torturi",
            portii: 8,
            timpPreparareOre: 24,
            activ: true,
          },
        })
        .then((response) => {
          expect(response.status).to.eq(201);
          tortId = response.body?._id || "";
          expect(tortId).to.not.equal("");
        });
    });
  });

  it("loads all public routes without 404 or boundary failures", () => {
    publicRoutes.forEach((routePath) => {
      cy.visit(routePath);
      cy.assertHealthyAppRoute();
    });

    cy.visit(`/tort/${tortId}`);
    cy.assertHealthyAppRoute("/tort/");
    cy.contains("Tort public live", { timeout: 10000 }).should("be.visible");
  });
});
