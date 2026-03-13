# Maison-Douce

Platforma full-stack pentru comenzi, rezervari, plata si administrare de produse/torturi.

## Stack

- `frontend/`: React + Vite + React Router + TanStack Query
- `backend/`: Express + Mongoose + Stripe + Socket.IO
- `quality`: ESLint, Vitest, Cypress, backend integration tests, GitHub Actions

## Structura

- `frontend/src`: UI, context, pagini, query/server state
- `frontend/cypress`: E2E mockuite si live
- `backend/routes`: API routes
- `backend/test`: util tests + integration tests
- `.github/workflows/quality.yml`: quality gates CI

## Environment

Backend:

1. Copiaza [`backend/.env.example`](backend/.env.example) in `backend/.env`
2. Completeaza minim:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `BASE_CLIENT_URL`
   - `STRIPE_SECRET_KEY` si `STRIPE_WEBHOOK_SECRET` daca folosesti Stripe

Frontend:

1. Copiaza [`frontend/.env.example`](frontend/.env.example) in `frontend/.env.local`
2. Completeaza minim:
   - `VITE_API_URL`
   - `VITE_PRESTATOR_ID`
   - `VITE_STRIPE_PK` daca folosesti Payment Element

## Pornire locala

Backend:

```powershell
cd backend
npm install
npm start
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Default local URLs:

- backend: `http://localhost:5000/api`
- frontend: `http://localhost:5173`
- health: `http://localhost:5000/api/health`

## Scripturi utile

Din root:

```powershell
npm run quality
npm run test:backend:integration
npm run test:frontend:e2e:ci
npm run test:frontend:e2e:live
npm run checklist
```

Din backend:

```powershell
npm test
npm run test:integration
```

Din frontend:

```powershell
npm run standards
npm run lint
npm run test
npm run build
npm run cypress:run:ci
npm run cypress:run:live
```

## Quality Gates

Repo-ul ruleaza acum:

- backend util tests
- backend integration tests
- frontend standards checker
- frontend lint
- frontend unit tests
- frontend build
- Cypress CI suite
- live Cypress suite separata

## Observabilitate

Backend:

- request ID pe fiecare request
- logging structurat in [`backend/utils/log.js`](backend/utils/log.js)
- health endpoint la `/api/health`
- endpoint pentru erori runtime din frontend la `/api/monitoring/client-error`

Frontend:

- `RootErrorBoundary` global
- raportare pentru render errors, `window.error` si `unhandledrejection`
- payload-ul trimite URL, release, user context si metadata minima

## Stripe

Fluxurile de plata folosesc:

- `payment intent`
- `checkout session`
- webhook la `/api/stripe/webhook`

Pentru test local webhook:

```powershell
stripe listen --forward-to localhost:5000/api/stripe/webhook
stripe trigger checkout.session.completed
```

## Deploy Checklist

1. Configureaza `backend/.env` si `frontend/.env.local` cu valorile reale
2. Verifica `BASE_CLIENT_URL` si `VITE_API_URL`
3. Porneste MongoDB si verifica `/api/health`
4. Configureaza Stripe webhook in dashboard spre `/api/stripe/webhook`
5. Ruleaza:

```powershell
npm run quality
npm run test:backend:integration
npm run test:frontend:e2e:ci
```

6. Deploy frontend si backend doar dupa ce quality gates sunt verzi

## Notite

- `seed-test-user` este permis doar in `development/test`
- fluxurile live E2E pornesc backend + frontend reale si necesita Mongo local disponibil
- daca lipsesc `VITE_PRESTATOR_ID` sau `VITE_STRIPE_PK`, UI afiseaza avertismente explicite
