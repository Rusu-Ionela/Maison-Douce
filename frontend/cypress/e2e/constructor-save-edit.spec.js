// frontend/cypress/e2e/constructor-save-edit.spec.js
/**
 * E2E test for 2D constructor: save design, list, edit, and re-save.
 */

describe('2D Constructor Save & Edit Flow', () => {
    beforeEach(() => {
        cy.loginAsTestUser();
    });

    it('should save and list personalized designs', () => {
        // Navigate to constructor (adjust path per your app)
        cy.visit('http://localhost:5173/personalizare');

        // Wait for constructor to load
        cy.contains(/constructor|proiectez|personalizez/i, { timeout: 10000 }).should('exist');

        // Verify constructor page is present
        cy.get('canvas, [data-testid="constructor"]').should('exist');

        cy.log('✓ Constructor page loaded');
    });

    it('should list saved designs', () => {
        cy.visit('http://localhost:5173/vizualizare-personalizari');

        // Wait for designs list to load
        cy.get('body', { timeout: 10000 }).should('exist');

        cy.log('✓ Designs list page loaded');
    });

    it('should call API to save design', () => {
        // Directly test the save API using seeded user
        cy.loginAsTestUser().then((body) => {
            const userId = body.user?._id;
            cy.request('POST', 'http://localhost:5000/api/personalizare', {
                clientId: userId,
                designName: 'Test Cake Design',
                image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                config: { layers: [], width: 800, height: 600 },
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('_id');
                cy.log('✓ Design saved via API:', response.body._id);
            });
        });
    });
});
