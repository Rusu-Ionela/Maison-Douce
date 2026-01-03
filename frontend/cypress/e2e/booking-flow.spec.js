// frontend/cypress/e2e/booking-flow.spec.js
/**
 * Flow API: seed user -> upsert slot -> reserve -> verify admin list.
 * UI test is left minimal; extend with selectors specific la UI.
 */

describe("Full Booking Flow E2E", () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it("should complete reservation via API and appear in admin list", () => {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const dateStr = testDate.toISOString().split("T")[0];
    const prestatorId = "default";

    cy.loginAsTestUser().then((body) => {
      const user = body.user;
      const token = body.token;
      const authHeaders = { Authorization: `Bearer ${token}` };

      // ensure slot exists
      cy.request({
        method: "POST",
        url: `http://localhost:5000/api/calendar/availability/${prestatorId}`,
        headers: authHeaders,
        body: { slots: [{ date: dateStr, time: "10:00", capacity: 3 }] },
      }).then((r) => {
        expect(r.status).to.be.oneOf([200, 201]);

        // create reservation
        cy.request({
          method: "POST",
          url: "http://localhost:5000/api/calendar/reserve",
          headers: authHeaders,
          body: {
            clientId: user._id,
            prestatorId,
            date: dateStr,
            time: "10:00",
            metoda: "ridicare",
            subtotal: 100,
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property("rezervareId");
          const rezervareId = response.body.rezervareId;


          // verify admin list
          cy.request({
            method: "GET",
            url: `http://localhost:5000/api/calendar/admin/${dateStr}`,
            headers: authHeaders,
          }).then((adminRes) => {
            expect(adminRes.status).to.eq(200);
            const list = adminRes.body?.rezervari || [];
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

  it("should load calendar UI page", () => {
    cy.visit("http://localhost:5173/calendar");
    cy.contains(/calendar|rezerv/i, { timeout: 10000 }).should("exist");
  });
});
