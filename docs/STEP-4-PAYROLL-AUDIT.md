# STEP 4 — Payroll Formula Audit

This step fixes the existing configuration gap where `payroll.js` referenced OT/SSO settings that were not present in `config.js`.

## Configurable rules

- `OT_DIVISOR` default `240`
- `OT_MULTIPLIER` default `1.5`
- `SSO_RATE` default `0.05`
- `SSO_WAGE_CAP` default `17500`
- `SSO_MINIMUM_WAGE_BASE` default `1650`

## Formulas

OT:

`OT_Hours × (Salary / OT_DIVISOR) × OT_MULTIPLIER`

Social security:

`ROUND(MIN(SSO_WAGE_CAP, MAX(SSO_MINIMUM_WAGE_BASE, WageBase)) × SSO_RATE, 0)`

Gross:

`BaseSalary + OTPay + Allowances + Bonus + Commission + KPI`

Net before tax:

`Gross - SocialSecurity - Deductions`

## Tax

Tax is deliberately NOT calculated in STEP 4. A placeholder tax function in the old code was removed from the production calculation path.

Before production payroll, the approved company tax policy and required tax inputs must be specified and validated for the relevant payroll period.

## Test endpoint

`GET /api/payroll-audit`

The endpoint runs deterministic test vectors and does not modify Feishu.
