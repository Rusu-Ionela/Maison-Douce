# Maison-Douce (Tort-app)

Scurt ghid de setup, testare și deploy pentru proiectul "Maison-Douce" (frontend + backend).

## 1. Cerințe locale
- Node.js >= 18
- npm
- MongoDB local (sau MongoDB Atlas URI)
- (opțional) Stripe CLI pentru test webhook

## 2. Structură proiect
- `/backend` - API Node.js + Express + Mongoose
- `/frontend` - React (Vite)

## 3. Config env

Creează un `.env` în `backend` pe baza fișierului `.env.example` și completează:
- `PORT` - port backend (ex. 5000)
- `MONGODB_URI` - conexiune MongoDB
- `STRIPE_SECRET_KEY` - Stripe secret (test) — NU comita în repo
- `BASE_CLIENT_URL` - URL frontend local (ex. http://localhost:5173)

Frontend: creează `frontend/.env.local` cu:
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_PRESTATOR_ID=default`
- `VITE_STRIPE_PUBLISHABLE=` (opțional pentru integrare)

## 4. Pornire local

Backend (PowerShell):

```powershell
cd backend
npm install
node index.js
# sau cu nodemon
npx nodemon index.js
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## 5. Test Stripe webhook local (pași‑pași)
1. Instalează Stripe CLI: https://stripe.com/docs/stripe-cli
2. Autentificare: `stripe login`
3. În terminal: `stripe listen --forward-to localhost:5000/api/stripe/webhook`
4. Declanșare test event: `stripe trigger checkout.session.completed`
5. Verifică logs-uri în backend console (cautează `[stripe webhook]`)
6. **Important:** Webhook-ul acum are logging complet și error handling

---

## 6. Recente implementări (A-E)

### A) ✅ Fix CANCEL pentru CalendarSlotEntry
**Problemă:** Funcția de anulare a comenzii descrementa doar legacy `CalendarPrestator.slots`, nu și `CalendarSlotEntry`.

**Soluție:** 
- Actualizat `PATCH /api/comenzi/:id/cancel` în `backend/routes/comenzi.js`
- Acum încearcă să decrementez `CalendarSlotEntry.used` în prioritate
- Fallback la legacy dacă slot-ul nu există
- Rollback logic preserved pentru consistency

**Fișiere modificate:**
- `backend/routes/comenzi.js` — cancel handler refactored

---

### B) ✅ Stripe Webhook Hardening + Test Guide
**Îmbunătățiri:**
1. **Better logging:** Messages cu `[stripe webhook]` tag pentru debugging
2. **Config validation:** Verifică dacă au STRIPE_SECRET_KEY și STRIPE_WEBHOOK_SECRET
3. **Error responses:** Return 500 cu stack trace pentru development
4. **Payment Intent logging:** Support for multiple event types
5. **Debug route:** `GET /api/stripe/webhook-test` shows config status

**Fișiere modificate:**
- `backend/routes/stripeWebhook.js` — Enhanced with comprehensive logging
- `backend/routes/stripe.js` — Added `/webhook-test` debug endpoint

**Test local:**
```powershell
# Terminal 1 — Backend
cd backend
npm start

# Terminal 2 — Stripe CLI
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Terminal 3 — Trigger test
stripe trigger checkout.session.completed
```

---

### C) ✅ Cypress E2E + Seed User for Auth
**Adaugări:**
1. **Seed endpoint:** `POST /api/auth/seed-test-user` — creează/obține test user și token
2. **Cypress helpers:** Commands pentru `cy.loginAsTestUser()`, `cy.seedTestUser()`, `cy.loginWithToken()`
3. **E2E tests:** 
   - `booking-flow.spec.js` — full booking flow test
   - `constructor-save-edit.spec.js` — 2D constructor save/edit test
   - Updated `support/auth.js` — login helpers

**Fișiere noi:**
- `frontend/cypress/support/auth.js` — Cypress auth commands
- `frontend/cypress/support/e2e.js` — Cypress config
- `frontend/cypress/e2e/booking-flow.spec.js` — Booking E2E test
- `frontend/cypress/e2e/constructor-save-edit.spec.js` — Constructor E2E test

**Rulare:**
```powershell
cd frontend
npm run cypress:open
# sau pentru headless:
npm run cypress:run
```

---

### D) ✅ Full Migration CalendarSlotEntry
**Obiectiv:** Elimina dependența de legacy `CalendarPrestator.slots` și folosiți `CalendarSlotEntry` exclusiv.

**Implementări:**
1. **Migration script:** `backend/scripts/migrate-calendars.js`
   - Citeste `CalendarPrestator.slots` și creează `CalendarSlotEntry` docs
   - Rulează cu: `node backend/scripts/migrate-calendars.js`
   
2. **Refactored routes:**
   - `GET /api/calendar/availability` — Query exclusiv `CalendarSlotEntry`
   - `POST /api/calendar/availability` — Upsert doar `CalendarSlotEntry` docs (no legacy sync)
   - `POST /api/calendar/reserve` — Increment atomic pe `CalendarSlotEntry` only
   - Rollback logic uses only `CalendarSlotEntry`

3. **Updated controllers:**
   - `backend/controllers/rezervariController.js` — booking/unbooking uses `CalendarSlotEntry`
   - `backend/routes/comenzi.js` — create-with-slot uses `CalendarSlotEntry` in transaction

**Fișiere noi:**
- `backend/scripts/migrate-calendars.js` — Migration script

**Fișiere modificate:**
- `backend/routes/calendar.js` — Refactored to use CalendarSlotEntry exclusively
- `backend/controllers/rezervariController.js` — Uses CalendarSlotEntry
- `backend/routes/comenzi.js` — Uses CalendarSlotEntry

**Rulare migrație:**
```powershell
cd backend
node scripts/migrate-calendars.js
```

---

### E) ✅ UI Polish Site-Wide (Tailwind)
**Creări:**
1. **Component library:** `frontend/src/lib/tailwindComponents.js`
   - Reusable Tailwind classes: `buttons`, `cards`, `inputs`, `containers`, `typography`, `grids`, `badges`
   - Consistency across app

2. **Pages styled:**
   - `CalendarClient.jsx` — Full redesign: gradient background, improved form layout, better typography, responsive
   - `AdminCalendar.jsx` — 2-column layout with card design, color-coded slots, styled reservations list

**Stil aplicat:**
- Gradient backgrounds (pink-to-purple theme)
- Improved form inputs și labels
- Better button styling with icons
- Responsive grid layouts
- Status badges (success/warning/error/info)
- Better typography hierarchy
- Hover states și transitions
- Mobile-first design

**Fișiere noi:**
- `frontend/src/lib/tailwindComponents.js` — Tailwind component library

**Fișiere modificate:**
- `frontend/src/pages/CalendarClient.jsx` — Full Tailwind redesign
- `frontend/src/pages/AdminCalendar.jsx` — Full Tailwind redesign

---

## 7. Urmatoarele steps (Opțional)
1. **Extend Cypress tests:** Add authenticated booking flow test cu UI interaction
2. **More UI polish:** Apply `tailwindComponents` la mai multe pagini (cart, checkout, profile)
3. **Unit tests:** Backend controller tests cu Jest
4. **Performance:** Add image optimization, code splitting
5. **Deployment:** Setup Vercel (frontend) + Render/Heroku (backend) + MongoDB Atlas

---

## 8. Troubleshooting

### Stripe webhook not working
- ✓ Check `backend/.env` has `STRIPE_SECRET_KEY` și `STRIPE_WEBHOOK_SECRET`
- ✓ Run `GET /api/stripe/webhook-test` to verify config
- ✓ Ensure `stripe listen` is running and forwards correctly
- ✓ Check backend logs for `[stripe webhook]` messages

### CalendarSlotEntry not found errors
- Run migration script: `node backend/scripts/migrate-calendars.js`
- Verify CalendarSlotEntry model is imported in routes
- Check index on `{prestatorId, date, time}`

### Cypress tests failing
- Ensure backend is running on `http://localhost:5000`
- Check `POST /api/auth/seed-test-user` endpoint exists
- Verify MongoDB is connected
- Run `npm run cypress:open` for debugging

---

**Version:** 1.4.0 (Nov 20, 2025)
**Last updated:** Post-migration CalendarSlotEntry + UI polish + Stripe hardening

3. În `backend/.env` setează `STRIPE_SECRET_KEY` = cheia ta de test (în contul Stripe test)
4. Pornește backend-ul local
5. Deschide terminal PowerShell și rulează:

```powershell
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

6. Creează o sesiune de checkout în aplicație (sau folosește `stripe trigger`):

```powershell
# exemplu: trigger a checkout.session.completed event
stripe trigger checkout.session.completed
```

7. Verifică în logurile backend primirea evenimentului și actualizarea `Comanda`/`Rezervare`.

Notă: nu partaja cheile private. Dacă webhook nu actualizează `Comanda`, verifică `stripeWebhook.js` pentru loguri și mapping ID->comanda.

## 6. Ce am implementat deja
- autentificare minimală (routes/auth)
- chat realtime cu `socket.io` și persistare (`MesajChat`)
- construcție 2D (react-konva) + salvare imagini în `uploads/personalizari`
- rute calendar/admin + rezervare (vedeți /backend/routes/calendar.js)
- endpoints personalizare (POST/GET/PUT)

## 7. Pași următori recomandați
- Verificare E2E (Cypress) pentru rezervare și personalizare
- UI polish (Tailwind) pentru pagini principale
- Rotație chei Stripe și push la mediu de producție
- Deploy: Frontend pe Vercel/Netlify, Backend pe Render/Heroku, MongoDB Atlas

## 8. Testare E2E (Cypress)
În `frontend`:

```powershell
npm install --save-dev cypress
npx cypress open
# sau rulat headless
npm run cypress:run
```

Am adăugat câteva teste smoke în `frontend/cypress/e2e/`.

## 9. Deploy checklist (sumar)
- Asigură variabile de mediu pe servicii de hosting
- Configurează CORS (backend/index.js) cu URL-urile front-end
- Rulează `npm run build` pentru frontend și publică build
- Configurează certificat HTTPS și domeniu
- Rotește cheile Stripe și test webhook în staging
- Configurează backup MongoDB și indexe importante

---
Dacă vrei, încep imediat cu: 1) rularea testelor E2E, 2) polish UI pe paginile cheie, 3) implementare tranzacție completă Mongo (dacă folosești Atlas replica set).
