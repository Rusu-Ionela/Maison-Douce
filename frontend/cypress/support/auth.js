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

function getApiBaseUrl() {
  return Cypress.env("apiUrl") || "http://127.0.0.1:5000/api";
}

function getAppBaseUrl() {
  return Cypress.config("baseUrl") || "http://localhost:5173";
}

function storeLiveSession(win, session) {
  const token = session?.token || "";
  const user = normalizeSessionUser(session?.user || {});

  if (token) {
    win.localStorage.setItem("token", token);
    win.localStorage.setItem("jwt_token", token);
  }

  if (user._id) {
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
  }
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
    .request("POST", `${getApiBaseUrl()}/auth/seed-test-user`, {
      email: "test@example.com",
      password: "testpass123",
      rol: "admin",
    })
    .then((response) => {
      expect(response.status).to.eq(200);
      return response.body; // { ok, user, token }
    });
});

Cypress.Commands.add("seedLiveUser", (options = {}) => {
  const role = options.role || "client";
  const password = options.password || "Secret123!";
  const email =
    options.email ||
    `live-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  return cy
    .request("POST", `${getApiBaseUrl()}/auth/seed-test-user`, {
      email,
      password,
      rol: role,
    })
    .then((response) => {
      expect(response.status).to.eq(200);
      return {
        ...response.body,
        email,
        password,
      };
    });
});

Cypress.Commands.add("visitAsLiveUser", (path = "/", session) => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.visit(path, {
    onBeforeLoad(win) {
      storeLiveSession(win, session);
    },
  });
});

Cypress.Commands.add("assertHealthyAppRoute", (expectedPathPrefix) => {
  cy.location("pathname", { timeout: 10000 }).should((pathname) => {
    if (expectedPathPrefix) {
      expect(pathname.startsWith(expectedPathPrefix)).to.eq(true);
    }
  });
  cy.contains("404 - Pagina nu exista").should("not.exist");
  cy.contains("A aparut o eroare neasteptata.").should("not.exist");
  cy.get("body").should("not.contain", "Ruta nu exista.");
  cy.get("#root").should(($root) => {
    const innerText = ($root[0]?.innerText || "").replace(/\s+/g, " ").trim();
    const childCount = $root.children().length;
    expect(innerText.length > 0 || childCount > 0).to.eq(true);
  });
});

/**
 * Cypress command: cy.loginWithToken(token)
 * Logs in user by storing token in localStorage.
 */
Cypress.Commands.add("loginWithToken", (token, userId) => {
  cy.visit(getAppBaseUrl());
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
    cy.visit(getAppBaseUrl());
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
