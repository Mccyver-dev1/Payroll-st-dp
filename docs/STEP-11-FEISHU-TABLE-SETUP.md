# STEP 11 — Feishu Table Setup

Create these two REAL tables in the existing Feishu Base.

## PayrollRuns

Use exact field names for the required fields:

| Field | Suggested Type |
|---|---|
| PayrollRunID | Text |
| PayrollMonth | Text |
| Status | Single Select |
| PreparedHash | Text |
| RowCount | Number |
| NewRecordCount | Number |
| DuplicateCount | Number |
| PreparedBy | Text |
| ValidatedAt | DateTime |
| ApprovedBy | Text |
| ApprovedAt | DateTime |
| LockedBy | Text |
| LockedAt | DateTime |
| CommittedAt | DateTime |
| UpdatedAt | DateTime |

Status options:

`DRAFT`, `VALIDATED`, `APPROVED`, `LOCKED`, `COMMITTED`

## PayrollAudit

| Field | Suggested Type |
|---|---|
| EventID | Text |
| PayrollRunID | Text |
| PayrollMonth | Text |
| Action | Text |
| User | Text |
| EventAt | DateTime |
| Details | Text |

Do not add sample rows.

After creating the real tables, copy their table IDs into backend environment variables:

`FEISHU_TABLE_PAYROLL_RUNS=<real table id>`

`FEISHU_TABLE_PAYROLL_AUDIT=<real table id>`

Do not put those secrets/credentials into frontend code. Table IDs alone are not substitutes for the backend app credentials.
