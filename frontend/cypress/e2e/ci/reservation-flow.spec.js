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

describe("Reservation flow (CI)", () => {
  it("creates a reservation for an authenticated client", () => {
    const reservationDate = futureDate(2);
    const user = {
      _id: "reservation-user-1",
      nume: "Client Rezervare",
      email: "rezervare@example.com",
      rol: "client",
      telefon: "+37363333333",
      adresa: "Strada Rezervare 9",
    };

    cy.intercept("GET", "**/calendar/disponibilitate/default*", {
      statusCode: 200,
      body: {
        slots: [
          {
            date: reservationDate,
            time: "10:30",
            free: 2,
            capacity: 2,
            used: 0,
          },
        ],
      },
    }).as("availability");
    cy.intercept("POST", "**/calendar/reserve", {
      statusCode: 200,
      body: {
        ok: true,
        rezervareId: "rez-e2e-1",
        comandaId: "cmd-rez-e2e-1",
      },
    }).as("reserveSlot");

    cy.visitAsAuthenticatedUser("/calendar", { user });

    cy.contains(/Rezerva un interval/i, { timeout: 10000 }).should("be.visible");
    setDateInput('input[type="date"]', reservationDate);
    cy.wait("@availability", { timeout: 10000 });

    cy.contains("Ora").scrollIntoView();
    cy.contains("button", /10:30/, { timeout: 10000 }).scrollIntoView().click();
    cy.get('input[type="number"]').clear().type("250");
    cy.get("textarea").first().type("Tort aniversar cu decor simplu");
    cy.get("textarea").last().type("Livrare rapida, daca este posibil.");
    cy.contains("button", "Confirma rezervarea").click();

    cy.wait("@reserveSlot").its("request.body").should((body) => {
      expect(body.clientId).to.eq("reservation-user-1");
      expect(body.date).to.eq(reservationDate);
      expect(body.time).to.eq("10:30");
      expect(body.subtotal).to.eq(250);
    });

    cy.contains("Rezervare creata").should("be.visible");
    cy.contains("button", "Continua la plata").should("be.visible");
  });
});
