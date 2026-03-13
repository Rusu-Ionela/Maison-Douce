function futureDate(daysAhead = 4) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9pT9N8sAAAAASUVORK5CYII=";

const apiUrl = Cypress.env("apiUrl") || "http://127.0.0.1:5000/api";
const prestatorId =
  Cypress.env("prestatorId") ||
  `live-prestator-${Date.now().toString(36)}`;

describe("Client runtime routes and flows (live backend)", () => {
  let adminSession = null;
  let clientSession = null;
  let patiserSession = null;
  let comandaId = "";
  let rezervareDate = "";
  let shareLink = "";

  before(() => {
    cy.seedLiveUser({
      role: "admin",
      email: uniqueEmail("client-admin"),
    }).then((session) => {
      adminSession = session;
    });

    cy.seedLiveUser({
      role: "client",
      email: uniqueEmail("runtime-client"),
    }).then((session) => {
      clientSession = session;
    });

    cy.seedLiveUser({
      role: "patiser",
      email: uniqueEmail("runtime-patiser"),
    }).then((session) => {
      patiserSession = session;
    });

    cy.then(() => {
      rezervareDate = futureDate(5);
      return cy.request({
        method: "POST",
        url: `${apiUrl}/calendar/availability/${prestatorId}`,
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
        },
        body: {
          slots: [
            { date: rezervareDate, time: "12:00", capacity: 3 },
            { date: rezervareDate, time: "14:00", capacity: 2 },
          ],
        },
      });
    }).its("status").should("eq", 200);
  });

  it("reserves a slot and confirms fallback payment through the real backend", () => {
    cy.intercept("GET", `${apiUrl}/calendar/disponibilitate/${prestatorId}*`).as(
      "availability"
    );
    cy.intercept("POST", `${apiUrl}/calendar/reserve`).as("reserveSlot");
    cy.visitAsLiveUser("/calendar", clientSession);
    cy.assertHealthyAppRoute("/calendar");
    cy.wait("@availability");

    cy.get('input[type="date"]').clear().type(rezervareDate);
    cy.contains("button", "12:00", { timeout: 10000 }).click();
    cy.contains("label", "Subtotal (MDL)").parent().find("input").clear().type("180");
    cy.contains("label", "Descriere desert / cerinte")
      .parent()
      .find("textarea")
      .type("Tort live pentru validarea completa a fluxului.");
    cy.contains("button", "Confirma rezervarea").click();
    cy.wait("@reserveSlot");

    cy.contains("Rezervare creata", { timeout: 10000 }).should("be.visible");
    cy.contains("button", "Continua la plata").click();

    cy.location("pathname", { timeout: 10000 }).should("eq", "/plata");
    cy.location("search").should("contain", "comandaId=");
    cy.location("search").then((search) => {
      comandaId = new URLSearchParams(search).get("comandaId") || "";
      expect(comandaId).to.not.equal("");
    });

    cy.intercept("POST", `${apiUrl}/stripe/fallback-confirm`).as(
      "orderFallback"
    );
    cy.contains("Confirma plata (fallback)", { timeout: 10000 })
      .should("not.be.disabled")
      .scrollIntoView()
      .click({ force: true });
    cy.wait("@orderFallback");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/plata/succes");
    cy.contains("Plata reusita", { timeout: 10000 }).should("be.visible");
  });

  it("loads client protected routes and creates a public share link", () => {
    cy.visitAsLiveUser("/profil", clientSession);
    cy.assertHealthyAppRoute("/profil");

    [
      "/fidelizare",
      "/albume",
      "/album/creare",
      "/personalizari",
      "/chat",
      "/chat/client",
      "/chat/mesaj",
      "/comanda",
      `/recenzii/comanda/${comandaId}`,
      `/recenzii/prestator/${patiserSession.user._id}`,
      "/abonament",
    ].forEach((routePath) => {
      cy.visitAsLiveUser(routePath, clientSession);
      cy.assertHealthyAppRoute();
    });

    cy.visitAsLiveUser("/partajare", clientSession);
    cy.assertHealthyAppRoute("/partajare");
    cy.intercept("POST", `${apiUrl}/partajare/creare`).as("createShare");
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(ONE_PIXEL_PNG, "base64"),
      fileName: "share.png",
      mimeType: "image/png",
      lastModified: Date.now(),
    });
    cy.contains("button", "Genereaza link").click();
    cy.wait("@createShare")
      .its("response.body.link")
      .then((link) => {
        const rawLink = String(link || "").trim();
        const linkToken = rawLink.split("/partajare/")[1] || "";
        expect(Boolean(linkToken)).to.eq(true);
        shareLink = `${Cypress.config("baseUrl")}/partajare/${linkToken}`;
      });
    cy.contains("Link generat cu succes.", { timeout: 10000 }).should("be.visible");
    cy.then(() => {
      cy.visit(shareLink);
      cy.assertHealthyAppRoute("/partajare/");
      cy.contains("Fisiere partajate").should("be.visible");
    });
  });

  it("creates a subscription checkout and activates it after payment", () => {
    cy.intercept("GET", `${apiUrl}/cutie-lunara/me`).as("subscriptionState");
    cy.intercept("POST", `${apiUrl}/cutie-lunara/checkout`).as(
      "subscriptionCheckout"
    );
    cy.visitAsLiveUser("/abonament", clientSession);
    cy.assertHealthyAppRoute("/abonament");
    cy.wait("@subscriptionState");
    cy.contains("Stare curenta", { timeout: 10000 }).should("be.visible");

    cy.contains("button", "Continua la plata")
      .should("not.be.disabled")
      .scrollIntoView()
      .click({ force: true });
    cy.wait("@subscriptionCheckout");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/plata");
    cy.location("search").then((search) => {
      const subscriptionOrderId =
        new URLSearchParams(search).get("comandaId") || "";
      expect(subscriptionOrderId).to.not.equal("");
    });

    cy.intercept("POST", `${apiUrl}/stripe/fallback-confirm`).as(
      "subscriptionFallback"
    );
    cy.contains("Confirma plata (fallback)", { timeout: 10000 })
      .should("not.be.disabled")
      .scrollIntoView()
      .click({ force: true });
    cy.wait("@subscriptionFallback");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/plata/succes");
    cy.contains("Abonamentul lunar a fost activat.", { timeout: 10000 }).should(
      "be.visible"
    );

    cy.visitAsLiveUser("/abonament", clientSession);
    cy.contains("Rezumatul contului de abonament", { timeout: 10000 }).should(
      "be.visible"
    );
  });
});
