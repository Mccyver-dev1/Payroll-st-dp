# STEP 5 — Payroll Calculation Engine

## What changed

The previous calculation path used `Map(employeeId, row)`, which could silently overwrite multiple AttendanceSummary or PayrollItems rows for the same employee.

STEP 5 fixes that by aggregating all matching rows.

### Attendance
For the selected `YYYY-MM`:
- WorkDays are summed
- OT_Hours are summed
- LateMinutes are summed
- AbsentDays are summed

### PayrollItems
For each employee:
- Allowances are summed
- Bonus is summed
- Commission is summed
- KPI is summed
- Deductions are summed

## Calculation

OT:
`OT_Hours × (Salary / OT_DIVISOR) × OT_MULTIPLIER`

Gross:
`BaseSalary + OTPay + Allowances + Bonus + Commission + KPI`

Social Security:
uses the configurable STEP 4 rule.

Net:
`Gross - SocialSecurity - Deductions - Tax`

Tax remains `0 / NOT_CONFIGURED` until the approved tax policy and required tax inputs are implemented.

## Safety

STEP 5 is Preview-only. It reads Feishu data and does not create, update, or delete Feishu records.
