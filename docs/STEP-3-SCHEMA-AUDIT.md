# STEP 3 — Feishu Schema Audit

## Purpose
Read-only inspection of the Feishu Base schema without using Feishu AI.

Checks:
- 8 canonical tables
- field names and field types
- primary fields
- Link / Duplex Link
- Lookup
- Formula
- payroll-critical fields
- missing fields
- type mismatches

## Endpoint

`GET /api/schema-audit`

The endpoint loads the current Base through the backend and returns a JSON report.

## Payroll fields checked

### Employees
EmployeeID, CompanyID, DepartmentID, PositionID, Salary

### AttendanceSummary
EmployeeID, PayrollMonth, WorkDays, OT_Hours, LateMinutes, AbsentDays

### Payroll
EmployeeID, PayrollMonth, BaseSalary, OTPay, Deduction, SocialSecurity, Tax, NetSalary

### PayrollItems
PayrollID, EmployeeID, ItemType, Amount

### Payslips
PayslipID, PayrollID, EmployeeID, NetSalary

## Important

The audit only identifies structural readiness. It does not decide the user's final payroll policy, tax policy, or social-security policy, and it does not modify Feishu records.

A field reported as missing should be reviewed against the actual Base naming before creating or renaming fields.
