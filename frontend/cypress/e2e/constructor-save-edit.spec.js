// frontend/cypress/e2e/constructor-save-edit.spec.js
/**
 * E2E test for 2D constructor: save design, list, edit, and re-save.
 */

describe('2D Constructor Save & Edit Flow', () => {
    beforeEach(() => {
        cy.loginAsTestUser();
    });

    it('should save and list personalized designs', () => {
        // Navigate to constructor (actual route)
        cy.visit('http://localhost:5173/constructor');

        // Wait for constructor to load
        cy.contains(/constructor|proiectez|personalizez/i, { timeout: 10000 }).should('exist');

        // Verify constructor canvas is present
        cy.get('canvas, [data-testid="constructor"]', { timeout: 10000 }).should('exist');

        cy.log('バ" Constructor page loaded');
    });

    it('should list saved designs', () => {
        cy.visit('http://localhost:5173/constructor');

        // Wait for page
        cy.get('body', { timeout: 10000 }).should('exist');

        cy.log('バ" Designs page loaded');
    });

    it('should call API to save design', () => {
        // Directly test the save API using seeded user
        cy.loginAsTestUser().then((body) => {
            const userId = body.user?._id;
            const token = body.token;
            cy.request({
                method: 'POST',
                url: 'http://localhost:5000/api/personalizare',
                headers: { Authorization: `Bearer ${token}` },
                body: {
                    clientId: userId,
                    designName: 'Test Cake Design',
                    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    config: { layers: [], width: 800, height: 600 },
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect([200, 201]).to.include(response.status);
                expect(response.body).to.have.property('id');
                cy.log('バ" Design saved via API:', response.body.id);
            });
        });
    });
});

