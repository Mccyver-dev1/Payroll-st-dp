# Upload — MAC Feishu Payroll V1.2

Repository: `Mccyver-dev1/Payroll-st-dp` / branch `main`

## Replace these existing files
1. `backend/package.json`
2. `backend/src/server.js`
3. `backend/src/payroll-engine.js`
4. `backend/src/payroll.js`
5. `backend/src/payroll-export.js`
6. `backend/src/config.js`
7. `backend/src/payroll-rules.js`
8. `frontend/module.html`

## Add this file
9. `backend/src/attendance-import.js`

## Keep unchanged
- `backend/src/feishu.js`
- `backend/src/feishu-write.js`
- `backend/src/auth.js`
- `backend/src/security.js`
- `backend/src/payroll-transaction.js`
- `backend/src/payroll-control.js`
- `backend/src/payroll-run-persistence.js`
- `frontend/api.js`
- `frontend/config.js`
- `frontend/login.html`
- `frontend/payroll.html`
- `frontend/index.html`

## Render
After GitHub Pages/backend deploy, Attendance XLSX **Preview** works without write permission.
To allow the final `Import to Feishu` action, set:

`ENABLE_ATTENDANCE_IMPORT=true`

Do not enable it until the AttendanceSummary fields have been checked in `08 Settings` / Feishu schema.

## What changed
- Payroll month Attendance/Leave/OT is now calculated from the payroll month.
- KPI/Commission eligibility uses the previous performance month.
- Accounting-provided Tax is treated as an input; no PIT formula is generated.
- STARLIVE export keeps full income/deduction detail.
- IAMDP export is KPI/Commission-focused.
- Attendance XLSX has a real preview/validation/import workflow.
