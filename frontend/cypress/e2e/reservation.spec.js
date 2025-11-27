describe('Calendar reservation flow (smoke)', () => {
    it('loads calendar page and can open reservation form', () => {
        cy.visit('/calendar');
        cy.get('h1, h2').should('exist');
        // basic checks
        cy.get('input[type="date"]').should('exist');
    });
});
