function futureDate(daysAhead = 2) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

describe("Auth flows (CI)", () => {
  const availableDate = futureDate(2);
  const calendarResponse = {
    slots: [
      {
        date: availableDate,
        time: "12:00",
        free: 3,
        capacity: 3,
        used: 0,
      },
    ],
  };

  it("logs in a client user and redirects to the calendar flow", () => {
    cy.intercept("POST", "**/utilizatori/login", {
      statusCode: 200,
      body: {
        token: "login-token",
        user: {
          _id: "user-login-1",
          nume: "Admin Login",
          email: "login@example.com",
          rol: "admin",
          adresa: "Strada Login 1",
        },
      },
    }).as("loginRequest");
    cy.intercept("GET", "**/calendar/availability/default*", {
      statusCode: 200,
      body: calendarResponse,
    }).as("calendarAvailability");
    cy.intercept("GET", "**/calendar/admin/*", {
      statusCode: 200,
      body: { rezervari: [] },
    }).as("calendarAdmin");
    cy.intercept("GET", "**/calendar/day-capacity/default*", {
      statusCode: 200,
      body: { items: [] },
    }).as("dayCapacity");

    cy.visit("/login");

    cy.get('input[type="email"]').type("login@example.com");
    cy.get('input[type="password"]').type("secret123");
    cy.contains("button", "Intra").click();

    cy.wait("@loginRequest");
    cy.wait("@calendarAvailability");
    cy.wait("@calendarAdmin");
    cy.wait("@dayCapacity");
    cy.location("pathname").should("eq", "/admin/calendar");
    cy.contains(/Calendar Admin/i).should("be.visible");
    cy.contains("Logout").should("exist");
  });

  it("registers a new client user and lands on the calendar page", () => {
    cy.intercept("POST", "**/utilizatori/register", {
      statusCode: 200,
      body: {
        token: "register-token",
        user: {
          _id: "user-register-1",
          nume: "Client Nou",
          email: "nou@example.com",
          rol: "client",
          telefon: "+37361111111",
          adresa: "Strada Noua 12",
        },
      },
    }).as("registerRequest");
    cy.intercept("GET", "**/calendar/disponibilitate/default*", {
      statusCode: 200,
      body: calendarResponse,
    }).as("calendarAvailability");

    cy.visit("/register");

    cy.get('input[placeholder="Nume"]').type("Client Nou");
    cy.get('input[placeholder="Email"]').type("nou@example.com");
    cy.get('input[placeholder="Telefon"]').type("+37361111111");
    cy.get('input[placeholder="Adresa"]').type("Strada Noua 12");
    cy.get('input[placeholder="Parola"]').type("secret123");
    cy.get('input[placeholder="Confirma parola"]').type("secret123");
    cy.contains("button", /Inregistreaza-te/i).click();

    cy.wait("@registerRequest");
    cy.wait("@calendarAvailability");
    cy.location("pathname").should("eq", "/calendar");
    cy.contains(/Rezerva un interval/i).should("be.visible");
    cy.contains("Logout").should("exist");
  });
});
