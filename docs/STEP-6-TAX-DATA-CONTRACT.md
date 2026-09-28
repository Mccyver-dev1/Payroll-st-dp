# STEP 6 — Tax Data Contract

STEP 6 does **not** calculate Thai personal income tax.

It defines and audits the data contract required before a production Tax Engine is enabled.

## Required employee data

- EmployeeID
- TaxID
- TaxStatus
- TaxYear
- WithholdingEligible

## Optional inputs

The contract can recognize fields such as:
- spouse status
- child count
- parent count
- disability-related inputs
- insurance premium
- provident/retirement funds
- donations
- other approved allowances
- previous employer income/withholding
- year-to-date income/withholding

The exact applicability and treatment must be confirmed against the company's approved payroll/tax policy and the relevant tax period.

## Payroll outputs

The target Payroll table should have fields for:
- Tax
- TaxableIncome
- YTDIncome
- YTDWithholding

## Versioning requirement

Tax logic must be versioned by effective date. Historical payroll must not silently recalculate under a newer rule set.

## Endpoint

`GET /api/tax-data-contract`

Read-only. No Feishu records are changed.
