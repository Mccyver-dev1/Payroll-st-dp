# STEP 16 — Production Frontend/Backend Wiring

## Problem found

The repository documents `frontend/config.js`, but the file was absent. `frontend/api.js` therefore silently used a relative `/api` URL.

GitHub Pages cannot execute the Node/Express backend. The production frontend must call a separately deployed backend API.

## Fix

- Add `frontend/config.js`.
- Load it before any module that imports `api.js`.
- `api.js` now fails clearly when `API_BASE_URL` is empty.
- No Feishu secrets are placed in frontend code.
- Login, dashboard, and Payroll Run Control all use the same configured backend origin.

## Required deployment configuration

Edit only:

`frontend/config.js`

Set:

`API_BASE_URL: 'https://YOUR-DEPLOYED-PAYROLL-BACKEND'`

Do not put:
- FEISHU_APP_SECRET
- tenant_access_token
- database passwords
- private API keys

in `frontend/config.js`.

## Backend environment

Configure secrets only in the backend hosting provider:

- FEISHU_APP_ID
- FEISHU_APP_SECRET
- FEISHU_APP_TOKEN
- FEISHU_TABLE_COMPANIES
- FEISHU_TABLE_DEPARTMENTS
- FEISHU_TABLE_POSITIONS
- FEISHU_TABLE_EMPLOYEES
- FEISHU_TABLE_ATTENDANCE_SUMMARY
- FEISHU_TABLE_PAYROLL
- FEISHU_TABLE_PAYROLL_ITEMS
- FEISHU_TABLE_PAYSLIPS
- FEISHU_TABLE_PAYROLL_RUNS
- FEISHU_TABLE_PAYROLL_AUDIT
- FRONTEND_ORIGIN
- SESSION_SECRET / authentication secrets required by the existing auth module
- ENABLE_PAYROLL_WRITE=false during verification

## Acceptance

Before production write is enabled:

1. Frontend can reach backend `/api/health`.
2. Login reaches backend `/api/auth/login`.
3. Session reaches `/api/auth/status`.
4. `/api/go-live-audit` reads Feishu successfully.
5. `/api/data-integrity-audit` reads Feishu successfully.
6. `/api/production-readiness` is reviewed.
7. Only after all checks pass should write authorization be configured.

No demo or mock backend is acceptable.
