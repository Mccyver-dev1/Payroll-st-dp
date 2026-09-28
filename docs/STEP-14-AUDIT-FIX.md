# STEP 14 — Correct Read-Only Audit Semantics

STEP 13 was uploaded successfully, but its read-only Go-Live Audit incorrectly included `ENABLE_PAYROLL_WRITE=true` as a prerequisite for the audit itself.

That would make a read-only verification report `ready=false` while write is intentionally disabled.

STEP 14 corrects this.

## Correct behavior

### Read-only audit
`GET /api/go-live-audit`

Must be able to return `ready=true` when:

- real Feishu tables exist
- required fields exist
- PayrollRuns schema exists
- PayrollAudit schema exists
- duplicate guards pass

It reports `writeEnabled` separately.

### Production write gate
`GET /api/production-readiness`

Still requires:

- persistent Run schema
- persistent Audit schema
- compatible field types
- `ENABLE_PAYROLL_WRITE=true`

The Commit endpoint must pass both gates before any Payroll write.

## No demo behavior

No sample records are created.
No fake Feishu response is returned.
No write flag is changed by this step.
