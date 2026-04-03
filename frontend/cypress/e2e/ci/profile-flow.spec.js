describe("Profile flow (CI)", () => {
  it("loads profile data and saves updates", () => {
    const user = {
      _id: "profile-user-1",
      nume: "Client Profil",
      prenume: "Test",
      email: "profil@example.com",
      rol: "client",
      telefon: "+37365555555",
      adresa: "Strada Profil 7",
      adreseSalvate: [
        { label: "Acasa", address: "Strada Profil 7", isDefault: true },
      ],
      preferinte: {
        alergii: ["nuci"],
        evit: [],
        note: "Fara zahar in exces",
      },
      setariNotificari: {
        email: true,
        inApp: true,
        push: false,
      },
    };

    cy.intercept("GET", "**/comenzi/client/profile-user-1", {
      statusCode: 200,
      body: [
        {
          _id: "order-profile-1",
          status: "plasata",
          dataLivrare: "2026-03-20",
          oraLivrare: "11:00",
          total: 210,
          items: [{ name: "Tort Profil", qty: 1 }],
        },
      ],
    }).as("orders");
    cy.intercept("GET", "**/notificari/me", {
      statusCode: 200,
      body: [
        {
          _id: "notif-1",
          titlu: "Comanda actualizata",
          mesaj: "Tortul tau este in productie.",
          data: "2026-03-10T10:00:00.000Z",
        },
      ],
    }).as("notifications");
    cy.intercept("GET", "**/notificari-foto/profile-user-1", {
      statusCode: 200,
      body: [],
    }).as("photoNotifications");
    cy.intercept("GET", "**/comenzi-personalizate", {
      statusCode: 200,
      body: [],
    }).as("customOrders");
    cy.intercept("GET", "**/utilizatori/providers", {
      statusCode: 200,
      body: {
        items: [],
        defaultProviderId: "",
      },
    }).as("providers");
    cy.intercept("PUT", "**/utilizatori/me", (request) => {
      request.reply({
        statusCode: 200,
        body: {
          user: {
            ...user,
            ...request.body,
          },
        },
      });
    }).as("saveProfile");

    cy.visitAsAuthenticatedUser("/profil", { user });

    cy.wait("@orders");
    cy.wait("@notifications");
    cy.wait("@photoNotifications");
    cy.wait("@customOrders");
    cy.wait("@providers");

    cy.contains("Profil client").should("be.visible");
    cy.contains("Istoric comenzi").should("be.visible");
    cy.contains("Comanda #").should("be.visible");

    cy.contains("label", "Telefon").find("input").clear().type("+37369999999");
    cy.contains("button", "Salveaza profilul").click();

    cy.wait("@saveProfile").its("request.body").should((body) => {
      expect(body.telefon).to.eq("+37369999999");
    });

    cy.contains("Profil actualizat cu succes.").should("be.visible");
  });
});
