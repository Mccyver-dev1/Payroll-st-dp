# STEP 13 — Read-Only Go-Live Audit

This step performs a real, read-only verification against Feishu before any production payroll write.

## Checks

- Canonical tables exist.
- Required fields exist in each canonical table.
- PayrollRuns exists and has its required fields.
- PayrollAudit exists and has its required fields.
- Payroll table has no duplicate `(EmployeeID, PayrollMonth)` pairs when those fields are available.
- Employees table has no duplicate EmployeeID values when the field is available.
- `ENABLE_PAYROLL_WRITE` is reported but this audit never changes it.

## Endpoint

`GET /api/go-live-audit`

This endpoint only reads Feishu.

It does not:
- create records
- update records
- delete records
- approve payroll
- lock payroll
- commit payroll

## Commit protection

The Commit endpoint runs both:
1. Production Readiness Gate
2. Read-only Go-Live Audit

If either fails, the Commit is rejected before Payroll write.

## Important

This step does not claim Go-Live readiness without live Feishu credentials and the real table IDs configured in the backend environment.
