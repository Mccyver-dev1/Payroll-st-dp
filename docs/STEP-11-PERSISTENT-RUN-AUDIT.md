# STEP 11 — Persistent Payroll Run & Audit in Feishu

STEP 11 removes the in-memory Run Control dependency.

Production requires two real Feishu Base tables.

## 1. PayrollRuns

Required fields:
- PayrollRunID
- PayrollMonth
- Status

Recommended fields:
- PreparedHash
- RowCount
- NewRecordCount
- DuplicateCount
- PreparedBy
- ValidatedAt
- ApprovedBy
- ApprovedAt
- LockedBy
- LockedAt
- CommittedAt
- UpdatedAt

## 2. PayrollAudit

Required fields:
- EventID
- PayrollMonth
- Action
- EventAt

Recommended:
- PayrollRunID
- User
- Details

The backend does not create fake tables or fake records. It validates the real tables and fails closed when they are absent.

## Readiness endpoint

`GET /api/production-readiness`

This reports:
- whether PayrollRuns exists and has required fields
- whether PayrollAudit exists and has required fields
- whether payroll write is explicitly enabled

Controlled payroll is ready only when all required conditions are true.

## State

`DRAFT → VALIDATED → APPROVED → LOCKED → COMMITTED`

Every transition writes a persistent audit record to Feishu.

## Important

Do not enable `ENABLE_PAYROLL_WRITE=true` until `/api/production-readiness` reports ready.
