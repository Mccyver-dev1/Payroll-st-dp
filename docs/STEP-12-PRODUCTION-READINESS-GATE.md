# STEP 12 — Production Readiness Gate

STEP 12 makes the final commit path fail closed unless the real Feishu Run/Audit tables are configured correctly.

## Gate checks

1. `FEISHU_TABLE_PAYROLL_RUNS` exists.
2. PayrollRuns has required fields:
   - PayrollRunID
   - PayrollMonth
   - Status
3. `FEISHU_TABLE_PAYROLL_AUDIT` exists.
4. PayrollAudit has required fields:
   - EventID
   - PayrollMonth
   - Action
   - EventAt
5. Field types are compatible.
6. `ENABLE_PAYROLL_WRITE=true` is explicitly set.

Commit endpoint checks the gate again immediately before writing Payroll.

If any check fails, commit returns HTTP 409 and no Payroll write is attempted.

No mock records are created.
