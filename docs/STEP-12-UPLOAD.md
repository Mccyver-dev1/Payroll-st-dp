# STEP 12 Upload

Upload:

- `backend/src/production-readiness.js` — NEW
- `backend/src/server.js` — REPLACE
- `frontend/payroll-run.html` — REPLACE
- `docs/STEP-12-PRODUCTION-READINESS-GATE.md` — NEW
- `docs/STEP-12-UPLOAD.md` — NEW

Suggested commit:

`STEP 12: Add production readiness gate before payroll commit`

Keep `ENABLE_PAYROLL_WRITE=false` until the real Feishu tables and schema are verified.
