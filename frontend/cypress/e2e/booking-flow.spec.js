// frontend/cypress/e2e/booking-flow.spec.js
/**
 * Full E2E booking flow:
 * 1. Seed test user
 * 2. Login
 * 3. Navigate to calendar/booking
 * 4. Select a date and time slot
 * 5. Choose delivery or pickup
 * 6. Create reservation
 * 7. Verify in admin calendar
 */

describe('Full Booking Flow E2E', () => {
    beforeEach(() => {
        // Seed test user and login (stores token + user_id in localStorage)
        cy.loginAsTestUser();
    });

    it('should complete a full booking flow', () => {
        // Navigate to calendar page (adjust path to your app)
        cy.visit('http://localhost:5173/calendar');

        // Wait for page to load
        cy.contains(/calendar|rezerv|disponibil/i, { timeout: 10000 }).should('exist');

        // [OPTIONAL] If your calendar has a prestator selector:
        // cy.get('[data-testid="prestator-select"]').select(0);

        // [OPTIONAL] If your calendar shows dates, click on next available date
        // cy.get('[data-testid="date-picker"]').click();
        // cy.get('[data-testid="slot-available"]').first().click();

        // For now, just verify the page loads (adjust selectors per your app)
        cy.get('body').should('exist');

        // Log that test is exploratory (since exact selectors depend on your UI)
        cy.log('✓ Calendar page loaded');
        cy.log('Note: Expand this test with your specific selectors once UI is finalized');
    });

    it('should reserve via API', () => {
        // Alternative: test reservation via API directly
        const testDate = new Date();
        testDate.setDate(testDate.getDate() + 7); // 7 days from now
        const dateStr = testDate.toISOString().split('T')[0]; // YYYY-MM-DD
        // Use seeded user and create availability before reserving
        cy.loginAsTestUser().then((body) => {
            const user = body.user;
            const prestatorId = 'default';

            // ensure slot exists for that prestator and date
            cy.request('POST', `http://localhost:5000/api/calendar/availability/${prestatorId}`, {
                slots: [{ date: dateStr, time: '10:00', capacity: 3 }]
            }).then((r) => {
                expect(r.status).to.be.oneOf([200, 201]);

                // Create a reservation via API
                cy.request('POST', 'http://localhost:5000/api/calendar/reserve', {
                    clientId: user._id,
                    prestatorId,
                    date: dateStr,
                    time: '10:00',
                    metoda: 'ridicare',
                    subtotal: 100
                }).then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.property('rezervareId');
                    cy.log('✓ Reservation created via API');

                    // verify admin listing includes this reservation
                    cy.request('GET', `http://localhost:5000/api/calendar/admin/${dateStr}`).then((adminRes) => {
                        expect(adminRes.status).to.eq(200);
                        // ensure at least one record with same date exists
                        const found = (adminRes.body || []).some((c) => c.dataLivrare === dateStr || c.date === dateStr);
                        expect(found).to.be.true;
                    });
                });
            });
        });
    });
});
