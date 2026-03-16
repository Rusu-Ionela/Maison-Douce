function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function futureDate(daysAhead = 6) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

const apiUrl = Cypress.env("apiUrl") || "http://127.0.0.1:5000/api";
const appBaseUrl = Cypress.config("baseUrl") || "http://127.0.0.1:5173";

describe("Admin and staff runtime routes (live backend)", () => {
  let adminSession = null;
  let clientSession = null;
  let tortId = "";
  let produsId = "";

  const adminRoutes = [
    "/admin",
    "/admin/produse",
    "/admin/torturi",
    "/admin/comenzi",
    "/admin/comenzi-personalizate",
    "/admin/calendar",
    "/admin/rapoarte",
    "/admin/raport-rezervari",
    "/admin/stats",
    "/admin/notificari",
    "/admin/contact",
    "/admin/notificari-foto",
    "/admin/fidelizare",
    "/admin/cupoane",
    "/admin/recenzii",
    "/admin/audit",
    "/admin/monitoring",
    "/admin/abonamente",
    "/admin/production",
    "/admin/albume",
    "/admin/adauga-produs",
    "/admin/add-tort",
    "/admin/catalog",
    "/admin/contabilitate",
    "/admin/umpluturi",
    "/prestator/calendar",
    "/chat/history",
    "/chat/utilizatori",
  ];

  before(() => {
    cy.seedLiveUser({
      role: "admin",
      email: uniqueEmail("runtime-admin"),
    }).then((session) => {
      adminSession = session;
    });

    cy.seedLiveUser({
      role: "client",
      email: uniqueEmail("runtime-client-admin"),
    }).then((session) => {
      clientSession = session;
    });

    cy.then(() => {
      return cy
        .request({
          method: "POST",
          url: `${apiUrl}/torturi`,
          headers: {
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: {
            nume: "Tort admin smoke",
            descriere: "Tort pentru dashboard si edit live.",
            pret: 210,
            imagine: "https://example.com/admin-tort.jpg",
            ingrediente: ["ciocolata", "fructe"],
            categorie: "torturi",
            portii: 12,
            timpPreparareOre: 24,
            activ: true,
          },
        })
        .then((response) => {
          expect(response.status).to.eq(201);
          tortId = response.body?._id || "";
        });
    });

    cy.then(() => {
      return cy
        .request({
          method: "POST",
          url: `${apiUrl}/produse-studio`,
          headers: {
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: {
            nume: "Ingrediente live",
            descriere: "Produs studio pentru edit live.",
            pret: 25,
            cantitate: 10,
            unitate: "buc",
            dataExpirare: futureDate(14),
          },
        })
        .then((response) => {
          expect(response.status).to.eq(201);
          produsId = response.body?._id || "";
        });
    });

    cy.then(() => {
      return cy.request({
        method: "POST",
        url: `${apiUrl}/comenzi`,
        headers: {
          Authorization: `Bearer ${clientSession.token}`,
        },
        body: {
          items: [
            {
              productId: tortId,
              name: "Tort admin smoke",
              qty: 1,
              price: 210,
            },
          ],
          metodaLivrare: "ridicare",
          prestatorId: "default",
          dataLivrare: futureDate(8),
          oraLivrare: "13:00",
        },
      });
    }).its("status").should("eq", 201);

    cy.then(() => {
      return cy.request({
        method: "POST",
        url: `${apiUrl}/monitoring/client-error`,
        body: {
          kind: "manual_report",
          message: "Smoke admin monitoring event",
          url: `${appBaseUrl}/admin/monitoring`,
          userEmail: clientSession.user.email,
          userId: clientSession.user._id,
          userRole: "client",
          release: "live-smoke",
          metadata: { source: "cypress-live" },
        },
      });
    }).its("status").should("eq", 202);
  });

  it("loads admin and staff routes without runtime failures", () => {
    adminRoutes.forEach((routePath) => {
      cy.visitAsLiveUser(routePath, adminSession);
      cy.assertHealthyAppRoute();
    });

    cy.visitAsLiveUser(`/admin/edit-produs/${produsId}`, adminSession);
    cy.assertHealthyAppRoute("/admin/edit-produs/");
    cy.contains(/Editeaza Produs/i).should("be.visible");

    cy.visitAsLiveUser(`/admin/edit-tort/${tortId}`, adminSession);
    cy.assertHealthyAppRoute("/admin/edit-tort/");
    cy.contains(/Editare Tort/i).should("be.visible");
  });
});
