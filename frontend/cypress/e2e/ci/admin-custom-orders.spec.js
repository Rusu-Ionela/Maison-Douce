describe("Admin custom orders (CI)", () => {
  it("renders the internal custom order review workspace", () => {
    cy.intercept("GET", "**/utilizatori/providers", {
      statusCode: 200,
      body: {
        items: [
          {
            id: "default",
            displayName: "Atelier principal",
            acceptsOrders: true,
            isPublic: true,
            isDefault: true,
          },
        ],
        defaultProviderId: "default",
      },
    }).as("providers");
    cy.intercept("GET", "**/calendar/availability/default*", {
      statusCode: 200,
      body: { slots: [] },
    }).as("calendarAvailability");
    cy.intercept("GET", "**/calendar/admin/*", {
      statusCode: 200,
      body: { rezervari: [] },
    }).as("calendarAdmin");
    cy.intercept("GET", "**/calendar/day-capacity/default*", {
      statusCode: 200,
      body: { items: [] },
    }).as("dayCapacity");
    cy.intercept("GET", "**/comenzi-personalizate", {
      statusCode: 200,
      body: [
        {
          _id: "custom-order-1",
          clientId: "client-1",
          prestatorId: "admin-1",
          numeClient: "Client Demo",
          preferinte: "Tort elegant cu flori albe si accente aurii",
          imagine: "/uploads/personalizari/demo-preview.png",
          designId: "design-1",
          options: {
            orderFlow: {
              persons: 28,
              eventType: "nunta",
              estimatedKgLabel: "5.3 kg",
              orderType: "idea",
            },
            aiPreviewUrl: "/uploads/personalizari/demo-ai.png",
            estimatedServings: 28,
            estimatedWeightKg: "5.3 kg",
          },
          pretEstimat: 780,
          timpPreparareOre: 48,
          status: "in_discutie",
          data: "2026-04-03T10:00:00.000Z",
          createdAt: "2026-04-03T10:00:00.000Z",
          updatedAt: "2026-04-03T10:00:00.000Z",
        },
      ],
    }).as("customOrders");

    cy.visitAsAuthenticatedUser("/admin/calendar", {
      user: {
        _id: "admin-1",
        nume: "Admin Demo",
        email: "admin@example.com",
        rol: "admin",
      },
    });

    cy.wait("@providers");
    cy.wait("@calendarAvailability");
    cy.wait("@calendarAdmin");
    cy.wait("@dayCapacity");
    cy.window().then((win) => {
      win.history.pushState({}, "", "/admin/comenzi-personalizate");
      win.dispatchEvent(new win.PopStateEvent("popstate"));
    });
    cy.wait("@customOrders");
    cy.location("pathname").should("eq", "/admin/comenzi-personalizate");
    cy.contains("Comenzi personalizate").should("be.visible");
    cy.contains("Client Demo").should("be.visible");
    cy.contains("Cu preview AI").should("be.visible");
    cy.contains(/^1$/).should("exist");
    cy.contains("Propune ajustari").should("be.visible");
    cy.contains("Genereaza comanda").should("be.visible");
  });
});
