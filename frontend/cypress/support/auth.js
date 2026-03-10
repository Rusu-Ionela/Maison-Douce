// frontend/cypress/support/auth.js
/**
 * Cypress command: cy.visitAsAuthenticatedUser(path, options)
 * Boots the app with a mocked authenticated session and localStorage state.
 */
const defaultUser = {
  _id: "user-e2e-1",
  nume: "Client E2E",
  email: "client@example.com",
  rol: "client",
  telefon: "+37360000000",
  adresa: "Strada Test 1, Chisinau",
  adreseSalvate: [
    { label: "Acasa", address: "Strada Test 1, Chisinau", isDefault: true },
  ],
};

function normalizeSessionUser(user = {}) {
  const merged = { ...defaultUser, ...user };
  if (!merged.id) merged.id = merged._id;
  if (!merged._id) merged._id = merged.id;
  return merged;
}

Cypress.Commands.add("visitAsAuthenticatedUser", (path = "/", options = {}) => {
  const user = normalizeSessionUser(options.user);
  const token = options.token || "e2e-token";
  const cartItems = Array.isArray(options.cartItems) ? options.cartItems : null;
  const extraStorage = options.localStorage || {};

  cy.intercept("GET", "**/utilizatori/me", {
    statusCode: 200,
    body: user,
  }).as("authMe");

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", token);
      win.localStorage.setItem("jwt_token", token);
      win.localStorage.setItem(
        "md_user",
        JSON.stringify({
          id: user._id,
          nume: user.nume,
          email: user.email,
          rol: user.rol,
        })
      );
      win.localStorage.setItem("user_id", user._id);
      win.localStorage.setItem("userId", user._id);

      if (cartItems) {
        win.localStorage.setItem("cart-items", JSON.stringify(cartItems));
      }

      Object.entries(extraStorage).forEach(([key, value]) => {
        win.localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value)
        );
      });

      if (typeof options.onBeforeLoad === "function") {
        options.onBeforeLoad(win);
      }
    },
  });

  cy.wait("@authMe");
});

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
