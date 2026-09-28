# STEP 10 — Payroll Run Control

Production workflow:

`DRAFT → VALIDATED → APPROVED → LOCKED → COMMITTED`

## Rules

- Prepare reads real Feishu Employees, AttendanceSummary and PayrollItems.
- Existing EmployeeID + PayrollMonth records are not duplicated.
- APPROVED is required before LOCK.
- LOCKED is required before Payroll commit.
- A LOCKED/COMMITTED run cannot be prepared again.
- Every state transition creates an audit event.
- `ENABLE_PAYROLL_WRITE` remains false until the production environment is deliberately enabled.

## Important production limitation

The Run Control state is currently held in backend memory unless `FEISHU_TABLE_PAYROLL_RUNS` is configured.

For multi-instance production, configure a real persistent Payroll Runs table in Feishu before relying on Run Control across restarts.

No mock payroll data is included.
