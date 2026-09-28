# STEP 11 Upload

Upload:

- `backend/src/payroll-run-persistence.js` — NEW
- `backend/src/payroll-control.js` — REPLACE
- `backend/src/server.js` — REPLACE
- `backend/.env.example` — REPLACE
- `frontend/payroll-run.html` — REPLACE
- `docs/STEP-11-PERSISTENT-RUN-AUDIT.md` — NEW
- `docs/STEP-11-FEISHU-TABLE-SETUP.md` — NEW
- `docs/STEP-11-UPLOAD.md` — NEW

Suggested commit:

`STEP 11: Persist payroll runs and audit trail in Feishu`

No demo records are included.

Keep `ENABLE_PAYROLL_WRITE=false` until the real Feishu tables exist and the production-readiness endpoint passes.
