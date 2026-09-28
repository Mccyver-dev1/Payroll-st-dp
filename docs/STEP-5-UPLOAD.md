# STEP 5 Upload

Upload:

- `backend/src/payroll-engine.js` — NEW
- `backend/src/server.js` — REPLACE
- `frontend/payroll-preview.html` — NEW
- `docs/STEP-5-CALCULATION-ENGINE.md` — NEW
- `docs/STEP-5-UPLOAD.md` — NEW

Suggested commit:

`STEP 5: Add payroll calculation preview engine`

Do not delete unrelated files.

After deployment:
- `GET /api/payroll-self-test`
- `GET /api/payroll-preview?month=2026-09`

The preview endpoint is read-only and does not write to Feishu.
