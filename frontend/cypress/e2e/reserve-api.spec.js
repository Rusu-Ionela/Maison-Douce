// Cypress API test: create reservation via API and verify admin listing
describe('API reservation flow', () => {
    it('creates a reservation and checks admin list', () => {
        const date = new Date();
        date.setDate(date.getDate() + 8);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const prestatorId = 'default';
        const time = '11:00';

        const payload = {
            clientId: '000000000000000000000000', // dummy id - will be replaced
            prestatorId,
            date: dateStr,
            time,
            metoda: 'ridicare',
            subtotal: 100
        };

        cy.loginAsTestUser().then((body) => {
            const token = body.token;
            const userId = body.user?._id;

            const authHeaders = { Authorization: `Bearer ${token}` };
            const payloadAuth = { ...payload, clientId: userId };

            cy.request({
                method: 'POST',
                url: `http://localhost:5000/api/calendar/availability/${prestatorId}`,
                headers: authHeaders,
                body: { slots: [{ date: dateStr, time, capacity: 5 }] },
            }).then((slotRes) => {
                expect([200, 201]).to.include(slotRes.status);

                cy.request({
                    method: 'POST',
                    url: 'http://localhost:5000/api/calendar/reserve',
                    headers: authHeaders,
                    body: payloadAuth,
                    failOnStatusCode: false,
                }).then((resp) => {
                    expect([200, 201]).to.include(resp.status);
                    const rezervareId = resp.body.rezervareId;
                    expect(rezervareId).to.exist;

                    cy.wait(500);

                    cy.request({
                        method: 'GET',
                        url: `http://localhost:5000/api/calendar/admin/${dateStr}`,
                        headers: authHeaders,
                    }).then((listResp) => {
                        expect(listResp.status).to.equal(200);
                        const list = listResp.body?.rezervari || [];
                        expect(Array.isArray(list)).to.be.true;
                        const found = list.some(
                            (c) => String(c._id) === String(rezervareId)
                        );
                        expect(found).to.be.true;
                    });
                });
            });
        });
    });
});
