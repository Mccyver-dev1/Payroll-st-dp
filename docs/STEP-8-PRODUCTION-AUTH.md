# STEP 8 — Production Authentication & Secret Hardening

STEP 8 removes the browser-side Payroll API key pattern.

## Authentication

The backend now provides:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/status`

The authenticated session is an HTTP-only signed cookie.

## Protected API

Feishu reads and Payroll transaction endpoints require an authenticated session.

The browser no longer sends `PAYROLL_API_KEY` directly.

## Required secrets

Configure these only on the backend:

- `PAYROLL_ADMIN_USERNAME`
- `PAYROLL_ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `FEISHU_APP_SECRET`
- `PAYROLL_API_KEY`

Never commit them to GitHub.

## Password hash

Generate a password hash with the project's Node runtime and the exported `hashPassword` function. Do not store the plain password in the repository.

## Production requirements

- Use HTTPS.
- Set `NODE_ENV=production`.
- Set `FRONTEND_ORIGIN` to the real frontend origin; do not use `*`.
- Keep `ENABLE_PAYROLL_WRITE=false` until the real Payroll schema has passed audit.
- Enable writes only on the secured backend.

No demo credentials are included.
