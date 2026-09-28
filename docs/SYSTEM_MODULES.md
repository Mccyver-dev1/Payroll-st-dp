# System Modules

## M01 — Authentication & Access
- Feishu Web App entry
- Optional user identity / Open ID
- Role mapping: Super Admin, HR Admin, Payroll, Viewer
- Backend authorization

## M02 — Feishu Connector
- tenant_access_token
- Bitable table discovery
- record pagination
- field normalization
- API error handling

## M03 — Organization Master
- Companies
- Departments & Positions
- Employee master

## M04 — Attendance
- AttendanceSummary
- WorkDays
- Leave / absence / lateness
- OT Hours

## M05 — Payroll Engine
- Base Salary
- Allowances
- OT
- Commission
- KPI / Bonus
- Deductions
- SSO
- Tax
- Net Pay

## M06 — Payroll Items
Dynamic income/deduction items. Only non-zero/active items should appear on employee payslip.

## M07 — Payslip
- Confidential payslip
- Employee selection
- printable layout
- Feishu Bot notification
- future PDF/file delivery

## M08 — Payroll Workflow
Draft → Calculate → Review → Approve → Lock → Payslip → Report

## M09 — Dashboard
- Headcount
- Gross
- SSO
- Tax
- Net
- Company breakdown

## M10 — Audit
- Sync status
- last sync
- API health
- table mapping
- error log

## M11 — Security
- no App Secret in frontend
- environment variables
- CORS
- Helmet
- role-based backend authorization
- audit log

## M12 — Reporting
Future production scope:
- P.N.D.1
- SSO report
- payroll export
- accounting export
- year-to-date
