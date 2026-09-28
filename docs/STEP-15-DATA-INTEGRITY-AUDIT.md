# STEP 15 — Live Feishu Data Integrity Audit

This is a real read-only audit against Feishu.

## Checks

- Employees contain EmployeeID values.
- EmployeeID is unique.
- AttendanceSummary EmployeeID values reference Employees.
- Payroll EmployeeID values reference Employees.
- Payroll `(EmployeeID, PayrollMonth)` pairs are unique.
- PayrollItems EmployeeID values reference Employees.
- Payslips EmployeeID values reference Employees.
- Record and field counts are reported.
- The resolved field mapping is reported.

## Endpoint

`GET /api/data-integrity-audit`

Authentication is required.

## Commit protection

The real Payroll Commit path must pass:

1. Production Readiness
2. Read-only Go-Live Audit
3. Read-only Data Integrity Audit
4. Locked Payroll Run
5. Payroll write authorization

Only then can the transaction writer create new Payroll records.

## No demo

This step never creates sample records and never modifies Feishu.
