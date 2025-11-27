describe('Personalizare flow (smoke)', () => {
    it('loads constructor page and can open export/save buttons', () => {
        cy.visit('/constructor');
        cy.contains('Personalizeaz').should('exist');
        cy.get('button').contains('Export imagine').should('exist');
    });
});
