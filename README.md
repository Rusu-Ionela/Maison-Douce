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
- `.github/workflows/release-images.yml`: release Docker images in GHCR
- `.github/workflows/deploy-staging.yml`: deploy manual pe staging
- `docs/STAGING-DEPLOY.md`: ghid complet de staging, deploy si rollback

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
npm run docker:up
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

Workflow-urile de pipeline:

- `Quality`: validare continua pentru backend, frontend si E2E
- `Release Images`: publica imaginile Docker dupa un `Quality` verde pe `main`
- `Deploy Staging`: deploy manual pe serverul de staging din imaginile GHCR

## Observabilitate

Backend:

- request ID pe fiecare request
- logging structurat in [`backend/utils/log.js`](backend/utils/log.js)
- health endpoint la `/api/health`
- endpoint pentru erori runtime din frontend la `/api/monitoring/client-error`
- audit trail admin-only la `/api/audit`

Frontend:

- `RootErrorBoundary` global
- raportare pentru render errors, `window.error` si `unhandledrejection`
- payload-ul trimite URL, release, user context si metadata minima

## Docker

Stack-ul poate rula complet din [docker-compose.yml](docker-compose.yml):

```powershell
docker compose --env-file backend/.env up --build
```

Servicii expuse:

- frontend: `http://localhost:8080`
- backend: `http://localhost:5000/api`
- mongo: `mongodb://localhost:27017`

Detalii:

- [frontend/Dockerfile](frontend/Dockerfile) construieste bundle-ul Vite si il serveste prin Nginx
- [frontend/nginx.conf](frontend/nginx.conf) face proxy pentru `/api`, `/uploads` si `/socket.io`
- [backend/Dockerfile](backend/Dockerfile) porneste API-ul Express cu healthcheck

Scripturi root:

```powershell
npm run docker:up
npm run docker:down
npm run docker:logs
```

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

## Deploy si staging

Checklist-ul scurt:

1. Ruleaza `npm run quality`
2. Ruleaza `npm run test:backend:integration`
3. Ruleaza `npm run test:frontend:e2e:ci`
4. Verifica workflow-ul `Release Images`
5. Ruleaza manual `Deploy Staging` cu tag-ul dorit
6. Verifica `/api/health`, login, comenzi, rezervari si admin
7. Fa rollback la un `sha-<commit>` daca smoke-test-ul pica

Ghidul complet este in:

- [docs/STAGING-DEPLOY.md](docs/STAGING-DEPLOY.md)
- [deploy/staging/staging.env.example](deploy/staging/staging.env.example)
- [deploy/staging/docker-compose.staging.yml](deploy/staging/docker-compose.staging.yml)

## Backup si restore Mongo

Backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-mongo.ps1 -MongoUri "mongodb://127.0.0.1:27017/torturi"
```

Restore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-mongo.ps1 -InputDir ".\backups\mongo-20260313-120000" -MongoUri "mongodb://127.0.0.1:27017/torturi"
```

Ambele scripturi cer MongoDB Database Tools (`mongodump`, `mongorestore`) in `PATH`.

## Notite

- `seed-test-user` este permis doar in `development/test`
- fluxurile live E2E pornesc backend + frontend reale si necesita Mongo local disponibil
- daca lipsesc `VITE_PRESTATOR_ID` sau `VITE_STRIPE_PK`, UI afiseaza avertismente explicite
