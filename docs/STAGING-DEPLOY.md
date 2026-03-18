# Staging si Deploy

Documentul descrie configurarea minima pentru:

- release automat de imagini Docker in `ghcr.io`
- deploy manual pe un server de staging prin GitHub Actions
- checklist-ul de verificare inainte si dupa deploy

## Workflow-uri

- `.github/workflows/quality.yml`
  Ruleaza quality gates pentru backend, frontend, integration tests si Cypress.
- `.github/workflows/release-images.yml`
  Publica imaginile Docker pentru backend si frontend in GHCR dupa un `Quality` verde pe `main`.
- `.github/workflows/deploy-staging.yml`
  Face deploy manual pe staging din imaginile GHCR deja publicate.

## Ce publica GHCR

Repo-ul publica doua imagini:

- `ghcr.io/<owner>/<repo>-backend:latest`
- `ghcr.io/<owner>/<repo>-frontend:latest`

Fiecare release primeste si tag suplimentar:

- `sha-<commit>`

Recomandare:

- pe staging foloseste `latest` daca vrei cel mai nou build de pe `main`
- pentru rollback foloseste explicit un `sha-<commit>`

## Variabile GitHub

Generator local recomandat:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-staging-config.ps1 `
  -StagingHost staging.example.com `
  -StagingUser deploy `
  -StagingPath /opt/maison-douce `
  -BaseClientUrl https://staging.example.com
```

Scriptul citeste `backend/.env`, `frontend/.env.local` si exemplele din repo, apoi genereaza:

- `deploy/staging/generated/staging.generated.env`
- `deploy/staging/generated/github-vars.generated.env`
- `deploy/staging/generated/github-secrets-guide.md`

Fisierele generate sunt ignorate de Git.

Repository variables recomandate:

- `FRONTEND_PRESTATOR_ID`
- `FRONTEND_STRIPE_PK`
- `FRONTEND_MIN_LEAD_HOURS`

Staging environment variables necesare pentru deploy:

- `STAGING_HOST`
- `STAGING_USER`
- `STAGING_PATH`
- `STAGING_PORT`
- `STAGING_STACK_NAME`

Exemplu:

- `STAGING_HOST=staging.example.com`
- `STAGING_USER=deploy`
- `STAGING_PATH=/opt/maison-douce`
- `STAGING_PORT=22`
- `STAGING_STACK_NAME=maison-douce-staging`

## Secrete GitHub

Staging environment secrets necesare:

- `STAGING_SSH_KEY`
- `STAGING_GHCR_USERNAME`
- `STAGING_GHCR_TOKEN`
- `STAGING_ENV_FILE`

### `STAGING_ENV_FILE`

Secretul trebuie sa contina continutul fisierului de env pentru server.

Poti porni de la:

- `deploy/staging/staging.env.example`
- sau direct din `deploy/staging/generated/staging.generated.env`

Nu include in secret:

- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`

Acestea sunt injectate automat de workflow.

## Cerinte pe server

Serverul de staging trebuie sa aiba:

- Docker Engine instalat
- Docker Compose v2
- acces outbound catre `ghcr.io`
- un reverse proxy daca vrei domeniu si SSL public

Recomandare de baza:

- frontend expus intern pe `127.0.0.1:8080`
- backend expus intern pe `127.0.0.1:5000`
- Mongo expus intern pe `127.0.0.1:27017`

## Deploy manual pe staging

Ordinea corecta este:

1. `Quality` trebuie sa fie verde pe `main`
2. `Release Images` publica imaginile in GHCR
3. Rulezi `Deploy Staging` din GitHub Actions
4. Alegi `image_tag=latest` sau un `sha-<commit>`

Workflow-ul:

1. construieste bundle-ul de deploy
2. copiaza `docker-compose.staging.yml` si env-ul pe server
3. face `docker login` in GHCR
4. ruleaza `docker compose pull`
5. ruleaza `docker compose up -d --remove-orphans`
6. verifica raspunsul frontend pe portul local configurat

Generatorul local afiseaza si avertismente daca folosesti inca placeholder-e precum:

- `JWT_SECRET=change_me_before_staging`
- `BASE_CLIENT_URL=https://staging.example.com`
- chei Stripe lipsa
- configuratie SMTP lipsa

## Checklist inainte de deploy

1. `npm run quality`
2. `npm --prefix backend run test:integration`
3. `npm --prefix frontend run cypress:run:ci`
4. Verifica daca `release-images.yml` a publicat imaginile noi
5. Verifica daca `STAGING_ENV_FILE` este actual si complet
6. Fa backup Mongo daca urmeaza schimbari de schema, seed sau import de date

## Checklist dupa deploy

1. Verifica frontend-ul pe domeniul sau URL-ul de staging
2. Verifica `GET /api/health`
3. Testeaza login client si login admin
4. Testeaza creare comanda
5. Testeaza fluxul de rezervare
6. Testeaza pagina admin recenzii
7. Verifica upload imagine si acces la `/uploads`
8. Verifica logurile backend si containerele Docker

## Rollback

Rollback-ul corect este:

1. identifici ultimul tag bun `sha-<commit>`
2. rulezi `Deploy Staging`
3. setezi `image_tag` la acel `sha-<commit>`
4. verifici din nou checklist-ul post-deploy

## Observatii

- `release-images.yml` nu face deploy automat; publica doar imaginile
- `deploy-staging.yml` este manual in mod intentionat, ca sa nu impinga automat schimbari neverificate pe server
- pentru productie poti replica acelasi model, dar cu environment separat si checklist mai strict
