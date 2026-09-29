# MAC Feishu Payroll — Payroll Engine v1 release

This package contains the production Payroll-only changes prepared for repository `Mccyver-dev1/Payroll-st-dp`.

## Replace/add these files

Replace:
- `backend/package.json`
- `backend/src/config.js`
- `backend/src/payroll.js`
- `backend/src/payroll-engine.js`
- `backend/src/payroll-transaction.js`
- `backend/src/server.js`
- `frontend/index.html` — replace the current dashboard with the packaged version; it adds the `05 Payroll` button.

Add:
- `backend/src/payroll-rules.js`
- `backend/src/payroll-export.js`
- `frontend/payroll.html`
- `docs/PAYROLL_SPEC.md`

## Important

1. Do not upload `.env`, passwords, Feishu App Secret, session secret, or PAYROLL_API_KEY.
2. Render will run `npm install` and install the new `xlsx` dependency.
3. Existing Feishu sync/auth code is not replaced.
4. Payroll write remains fail-closed behind the existing production gates.
5. Tax is preserved as an imported/manual input for now; the engine does not invent Thai PIT values.
6. KPI/Commission amounts are read from verified PayrollItems source rows and are only paid when eligibility rules pass.

## Payroll rules implemented

- PayrollMonth is the payment month.
- PerformanceMonth is the previous month.
- KPI/Commission: employee must have JoinDate day 1 and at least 30 work days in PerformanceMonth.
- STARLIVE = Starlive + Thaiteli.
- IAMDP = Iamdp + Flying Fish.
- Employee Welfare Fund: 0.25% each employee/employer from 2026-10 through 2031-09; 0.50% each from 2031-10, subject to legal coverage/eligibility.
- Fixed XLSX export header is defined in `backend/src/payroll-export.js`.

## Test performed before packaging

- JavaScript syntax check: passed.
- Payroll engine self-test: passed.
- EWFund rate checks: 2026-10 = 0.25%, 2031-10 = 0.50%.
