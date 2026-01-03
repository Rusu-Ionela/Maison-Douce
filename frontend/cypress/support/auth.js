// frontend/cypress/support/auth.js
/**
 * Cypress command: cy.seedTestUser()
 * Seeds a test user and returns the token.
 */
Cypress.Commands.add("seedTestUser", () => {
  return cy
    .request("POST", "http://localhost:5000/api/auth/seed-test-user", {
      email: "test@example.com",
      password: "testpass123",
      rol: "admin",
    })
    .then((response) => {
      expect(response.status).to.eq(200);
      return response.body; // { ok, user, token }
    });
});

/**
 * Cypress command: cy.loginWithToken(token)
 * Logs in user by storing token in localStorage.
 */
Cypress.Commands.add("loginWithToken", (token, userId) => {
  cy.visit("http://localhost:5173");
  cy.window().then((win) => {
    win.localStorage.setItem("token", token); // folosit de AuthContext
    win.localStorage.setItem("jwt_token", token); // compat
    if (userId) {
      win.localStorage.setItem("user_id", userId);
      win.localStorage.setItem("userId", userId);
    }
  });
});

/**
 * Cypress command: cy.loginAsTestUser()
 * Combined: seeds user, stores token, and navigates.
 */
Cypress.Commands.add("loginAsTestUser", () => {
  return cy.seedTestUser().then((body) => {
    const token = body?.token;
    const user = body?.user;
    cy.visit("http://localhost:5173");
    return cy.window().then((win) => {
      if (token) {
        win.localStorage.setItem("token", token);
        win.localStorage.setItem("jwt_token", token);
      }
      if (user?._id) {
        win.localStorage.setItem("user_id", user._id);
        win.localStorage.setItem("userId", user._id);
      }
      return body;
    });
  });
});

export { };
