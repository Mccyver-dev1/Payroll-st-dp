# STEP 9 — Real Frontend ↔ Production Backend Integration

STEP 9 fixes the cross-origin production path between GitHub Pages and the secured backend.

## Why this is required

The project architecture is:

GitHub Pages → HTTPS Backend → Feishu

A browser request from GitHub Pages to a separate backend requires:
- explicit API base URL
- `credentials: include`
- CORS with the exact frontend origin
- a cross-site session cookie (`SameSite=None; Secure`)

## Frontend

Set `frontend/config.js`:

`API_BASE_URL: "https://YOUR-DEPLOYED-BACKEND"`

No Feishu secret belongs in this file.

## Backend

Set:

`FRONTEND_ORIGIN=https://YOUR-USERNAME.github.io`

Set:

`SESSION_COOKIE_SAMESITE=None`

Use HTTPS in production.

## Payroll

`production-payroll.html` no longer asks the user to enter `PAYROLL_API_KEY`.

The browser authenticates once and sends the HTTP-only session cookie automatically.

## Real-data rule

The frontend reads only from the backend APIs. No sample employee, sample salary, or mock payroll data is included.

## Write control

Keep:

`ENABLE_PAYROLL_WRITE=false`

until the real Feishu Payroll schema has passed the final write validation. Then enable it only on the backend environment.

## No secrets

Never commit:
- `.env`
- `FEISHU_APP_SECRET`
- `PAYROLL_API_KEY`
- `SESSION_SECRET`
- password hashes are configuration secrets and should remain outside source control when operational policy requires it.
