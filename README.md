# MAC Feishu Payroll — V1.2 Release Bundle

This bundle completes the current Payroll-first workflow without adding future HR modules.

## Replace/Add
- Replace `backend/package.json`
- Replace `backend/src/server.js`
- Replace `backend/src/payroll-engine.js`
- Replace `backend/src/payroll.js`
- Replace `backend/src/payroll-export.js`
- Add `backend/src/attendance-import.js`
- Replace `frontend/module.html`
- Keep the existing `frontend/payroll.html`, `frontend/index.html`, `frontend/employee.html`, `frontend/api.js`, `frontend/config.js`, and authentication files.

## New production behavior
- Attendance/OT use the payroll month.
- KPI/Commission eligibility uses the previous performance month.
- Accounting-provided Tax is consumed as an input; no PIT calculation is invented.
- STARLIVE export = full payroll income/deduction detail.
- IAMDP export = KPI/Commission detail.
- Attendance XLSX preview validates EmployeeID and canonical fields before any Feishu write.
- Attendance write requires `ENABLE_ATTENDANCE_IMPORT=true`.
- Existing Payroll write gate remains unchanged.

## Render environment
Set `ENABLE_ATTENDANCE_IMPORT=true` only when the AttendanceSummary schema has the required writable fields and you are ready to import real reports.
