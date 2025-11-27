// Cypress API test: create reservation via API and verify admin listing
describe('API reservation flow', () => {
    it('creates a reservation and checks admin list', () => {
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const payload = {
            clientId: '000000000000000000000000', // dummy id - ensure backend accepts or use a test user id
            prestatorId: 'default',
            date: dateStr,
            time: '10:00',
            metoda: 'ridicare',
            subtotal: 100
        };

        // create reservation
        cy.request({ method: 'POST', url: '/api/calendar/reserve', body: payload, failOnStatusCode: false }).then((resp) => {
            expect([200, 201]).to.include(resp.status);
            if (resp.status === 200 || resp.status === 201) {
                const rezervareId = resp.body.rezervareId || resp.body.rezervareId;
                // allow some time for DB
                cy.wait(500);
                // check admin list
                cy.request({ method: 'GET', url: `/api/calendar/admin/${dateStr}` }).then((listResp) => {
                    expect(listResp.status).to.equal(200);
                    // the list should be an array
                    expect(Array.isArray(listResp.body)).to.be.true;
                });
            }
        });
    });
});
