# Demo Credentials

Ruleaza mai intai:

```powershell
cd backend
npm run seed:demo-users
```

Scriptul este idempotent si actualizeaza aceste conturi demo:

- Admin
  - email: `admin.demo@maison-douce.local`
  - parola: `AdminMaison2026!`
  - login: `http://localhost:5173/admin/login`

- Patiser
  - email: `patiser.demo@maison-douce.local`
  - parola: `PatiserMaison2026!`
  - login: `http://localhost:5173/admin/login`

- Client
  - email: `client.demo@maison-douce.local`
  - parola: `ClientMaison2026!`
  - login: `http://localhost:5173/login`

Definire tehnica:

- script principal: `backend/scripts/seedDemoUsers.js`
- script compatibil doar pentru patiser: `backend/scripts/seedPatiser.js`
- model folosit: `backend/models/Utilizator.js`

Observatii:

- scriptul foloseste `MONGODB_URI` sau `MONGO_URI`; daca lipsesc, cade explicit
- contul de patiser primeste automat `providerProfile` public si poate functiona ca atelier demo
