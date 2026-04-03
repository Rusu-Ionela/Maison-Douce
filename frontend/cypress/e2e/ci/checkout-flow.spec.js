function futureDate(daysAhead = 2) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function setDateInput(selector, value) {
  cy.window().then((win) => {
    cy.get(selector).then(($input) => {
      const input = $input[0];
      const valueSetter = Object.getOwnPropertyDescriptor(
        win.HTMLInputElement.prototype,
        "value"
      ).set;
      valueSetter.call(input, value);
      input.dispatchEvent(new win.Event("input", { bubbles: true }));
      input.dispatchEvent(new win.Event("change", { bubbles: true }));
    });
  });
}

describe("Checkout flow (CI)", () => {
  it("creates an order from cart and confirms fallback payment", () => {
    const deliveryDate = futureDate(2);
    const user = {
      _id: "checkout-user-1",
      nume: "Client Checkout",
      email: "checkout@example.com",
      rol: "client",
      telefon: "+37362222222",
      adresa: "Strada Checkout 5",
      adreseSalvate: [
        { label: "Acasa", address: "Strada Checkout 5", isDefault: true },
      ],
    };
    const cartItems = [
      {
        id: "cake-1",
        name: "Tort Velvet",
        price: 150,
        image: "/images/placeholder.png",
        qty: 1,
        options: { marime: "mediu" },
        variantKey: "cake-1-m",
        prepHours: 24,
      },
    ];
    const orderResponse = {
      _id: "cmd-e2e-1",
      numeroComanda: "MD-1001",
      items: [
        {
          productId: "cake-1",
          name: "Tort Velvet",
          qty: 1,
          price: 150,
        },
      ],
      total: 150,
      totalFinal: 150,
      metodaLivrare: "ridicare",
      dataLivrare: deliveryDate,
      oraLivrare: "12:00",
      paymentStatus: "pending",
      status: "plasata",
    };

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
    cy.intercept("GET", "**/calendar/disponibilitate/default*", {
      statusCode: 200,
      body: {
        slots: [
          {
            date: deliveryDate,
            time: "12:00",
            free: 3,
            capacity: 3,
            used: 0,
          },
        ],
      },
    }).as("slotAvailability");
    cy.intercept("GET", "**/torturi*", {
      statusCode: 200,
      body: { items: [] },
    }).as("upsells");
    cy.intercept("POST", "**/comenzi/creeaza-cu-slot", {
      statusCode: 200,
      body: { _id: "cmd-e2e-1" },
    }).as("createOrder");
    cy.intercept("GET", "**/stripe/status", {
      statusCode: 200,
      body: {
        enabled: false,
        fallbackAvailable: true,
        mode: "fallback",
      },
    }).as("stripeStatus");
    cy.intercept("GET", "**/comenzi/cmd-e2e-1", {
      statusCode: 200,
      body: orderResponse,
    }).as("getOrder");
    cy.intercept("GET", "**/fidelizare/client/*", {
      statusCode: 200,
      body: {
        puncteCurent: 120,
        reduceriDisponibile: [],
      },
    }).as("wallet");
    cy.intercept("POST", "**/stripe/fallback-confirm", {
      statusCode: 200,
      body: { ok: true },
    }).as("fallbackConfirm");

    cy.visitAsAuthenticatedUser("/cart", { user, cartItems });

    cy.wait("@providers");
    cy.wait("@upsells");
    cy.contains("Checkout standard").should("be.visible");
    setDateInput('input[type="date"]', deliveryDate);
    cy.wait("@slotAvailability", { timeout: 10000 });
    cy.contains("button", /12:00/).click();
    cy.contains("button", "Creeaza comanda si mergi la plata").click();

    cy.wait("@createOrder").its("request.body").should((body) => {
      expect(body.clientId).to.eq("checkout-user-1");
      expect(body.items).to.have.length(1);
      expect(body.dataLivrare).to.eq(deliveryDate);
      expect(body.oraLivrare).to.eq("12:00");
    });
    cy.wait("@stripeStatus");
    cy.wait("@getOrder");
    cy.wait("@wallet");

    cy.location("pathname").should("eq", "/plata");
    cy.location("search").should("contain", "comandaId=cmd-e2e-1");
    cy.contains("Rezumat comanda").should("be.visible");
    cy.contains("MD-1001").should("be.visible");

    cy.contains("button", "Confirma plata (fallback)").click();
    cy.wait("@fallbackConfirm");
    cy.wait("@getOrder");

    cy.location("pathname").should("eq", "/plata/succes");
    cy.contains("Plata reusita").should("be.visible");
    cy.contains("MD-1001").should("be.visible");
  });
});
