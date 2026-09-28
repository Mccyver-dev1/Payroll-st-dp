# STEP 9 Upload

Upload:

- `frontend/config.js` — REPLACE
- `frontend/api.js` — NEW
- `frontend/login.html` — REPLACE
- `frontend/index.html` — REPLACE
- `frontend/production-payroll.html` — REPLACE
- `backend/src/auth.js` — REPLACE
- `backend/.env.example` — REPLACE
- `docs/STEP-9-REAL-FRONTEND-INTEGRATION.md` — NEW
- `docs/STEP-9-UPLOAD.md` — NEW

Suggested commit:

`STEP 9: Connect production frontend to authenticated backend`

Do not upload real secrets.

After upload, the backend still remains fail-closed until `ENABLE_PAYROLL_WRITE=true` is explicitly configured server-side.
