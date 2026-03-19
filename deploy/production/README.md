# Production deploy

Required GitHub environment: `production`

Repository or environment vars:

- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_PATH`
- `PRODUCTION_PORT` (optional, default `22`)
- `PRODUCTION_STACK_NAME` (optional, default `maison-douce-prod`)

Environment secrets:

- `PRODUCTION_SSH_KEY`
- `PRODUCTION_GHCR_USERNAME`
- `PRODUCTION_GHCR_TOKEN`
- `PRODUCTION_ENV_FILE`

The content of `PRODUCTION_ENV_FILE` should be based on [production.env.example](./production.env.example).

Production launch notes:

- `BASE_CLIENT_URL` must be the final public `https://` URL of the frontend.
- `JWT_SECRET` and `PATISER_INVITE_CODE` must be strong non-placeholder values.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are required for public launch.
- SMTP must be configured (`SMTP_HOST` or `SMTP_SERVICE`, plus `SMTP_USER` and `SMTP_PASS`) so password reset works for real users.
- `VITE_PRESTATOR_ID` must be set to the real public pastry provider id used by reservation and checkout flows.

Frontend runtime config:

- `VITE_API_URL`, `VITE_PRESTATOR_ID`, `VITE_STRIPE_PK` and `VITE_MIN_LEAD_HOURS` are injected at container startup into `/runtime-config.js`.
- The frontend image can now be promoted between staging and production without rebuilding it for those values.
- `VITE_APP_VERSION` remains a build-time value and is still set in [release-images.yml](../../.github/workflows/release-images.yml).
