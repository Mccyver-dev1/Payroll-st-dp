# STEP 7 — Real Feishu Payroll Transaction

This is the first step that introduces a controlled **real write path** to the Feishu Payroll table.

There is no fake payroll dataset.

## Safety model

Payroll write is fail-closed.

The server must have:

`ENABLE_PAYROLL_WRITE=true`

and:

`PAYROLL_API_KEY=<strong secret>`

The write endpoint also requires:

`X-Payroll-API-Key`

## Transaction flow

1. Read Employees from Feishu.
2. Read AttendanceSummary from Feishu.
3. Read PayrollItems from Feishu.
4. Calculate the selected payroll month.
5. Validate the calculated rows.
6. Read existing Payroll records.
7. Match `EmployeeID + PayrollMonth`.
8. Existing records are never duplicated.
9. New records are sent to the real Feishu Payroll table.
10. Return the created Feishu records.

## Endpoint

Prepare only:

`GET /api/payroll-transaction/prepare?month=YYYY-MM`

Real write:

`POST /api/payroll-transaction/commit`

Body:

`{"month":"YYYY-MM"}`

Header:

`X-Payroll-API-Key: <server configured key>`

## Important

Tax remains `NOT_CONFIGURED` in this stage. Therefore this transaction layer must not be treated as final production payroll until the Tax Engine is approved and enabled.

Do not expose `PAYROLL_API_KEY`, `FEISHU_APP_SECRET`, or other backend secrets to GitHub Pages.
