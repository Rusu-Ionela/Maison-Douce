// frontend/cypress/support/auth.js
/**
 * Cypress command: cy.seedTestUser()
 * Seeds a test user and returns the token.
 */
Cypress.Commands.add('seedTestUser', () => {
    return cy.request('POST', 'http://localhost:5000/api/auth/seed-test-user', {
        email: 'test@example.com',
        password: 'testpass123',
    }).then((response) => {
        expect(response.status).to.eq(200);
        // Return full body so tests can access user and token
        return response.body;
    });
});

/**
 * Cypress command: cy.loginWithToken(token)
 * Logs in user by storing token in localStorage.
 */
Cypress.Commands.add('loginWithToken', (token) => {
    cy.visit('http://localhost:5173');
    cy.window().then((win) => {
        win.localStorage.setItem('jwt_token', token);
        // user id can be set by caller if available
    });
});

/**
 * Cypress command: cy.loginAsTestUser()
 * Combined: seeds user, stores token, and navigates.
 */
Cypress.Commands.add('loginAsTestUser', () => {
    return cy.seedTestUser().then((body) => {
        const token = body?.token;
        const user = body?.user;
        cy.visit('http://localhost:5173');
        cy.window().then((win) => {
            if (token) win.localStorage.setItem('jwt_token', token);
            if (user && user._id) win.localStorage.setItem('user_id', user._id);
        });
        return body;
    });
});

export { };
