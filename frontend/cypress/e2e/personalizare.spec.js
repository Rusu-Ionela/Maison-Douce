describe('Personalizare flow (smoke)', () => {
    it('loads constructor page and can open export/save buttons', () => {
        cy.visit('/constructor');
        cy.contains(/Personalizeaz/i, { timeout: 10000 }).should('exist');
        cy.get('button').contains(/Export imagine/i, { timeout: 10000 }).should('exist');
    });
});
