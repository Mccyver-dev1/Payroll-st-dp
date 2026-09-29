# MAC Feishu Payroll — Payroll Engine v1.1 release

## Replace
- `backend/package.json`
- `backend/src/config.js`
- `backend/src/payroll.js`
- `backend/src/payroll-engine.js`
- `backend/src/payroll-transaction.js`
- `backend/src/server.js`
- `frontend/index.html`
- `frontend/payroll.html`

## Add
- `backend/src/payroll-rules.js`
- `backend/src/payroll-export.js`
- `frontend/module.html`
- `docs/PAYROLL_SPEC.md`

## Menu fix
`frontend/payroll.html` now makes all 02–08 sidebar menu items clickable. They open `frontend/module.html` with the appropriate module and read live Feishu data through `/api/sync`; no mock rows are generated.

## Tax
Tax is an accounting-supplied input. The payroll engine preserves the Tax amount from the verified source row/employee record and does not invent or calculate Thai PIT.

## Important
Do not upload `.env`, passwords, Feishu App Secret, session secret, or PAYROLL_API_KEY.
