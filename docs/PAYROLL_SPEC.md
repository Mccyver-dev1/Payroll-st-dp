# MAC Feishu Payroll — Payroll Specification v1

## Scope

This phase is Payroll only. Other HR modules are future architecture and are not part of the current production scope.

## Source of truth

1. Feishu Base: Employees, Companies, Departments, Positions, AttendanceSummary, PayrollItems, Payroll, Payslips.
2. Feishu Attendance Statistics Report export: Attendance / Leave / OT source.
3. Salary Structure: eligibility and salary-component reference.
4. All KPI: KPI / Commission performance source.
5. Existing payroll-detail and payslip XLSX files: reference for legacy fields and output layout.

## Payroll groups

- STARLIVE = Starlive + Thaiteli
- IAMDP = Iamdp + Flying Fish

Unmapped company names fail payroll validation. No automatic guessing beyond configured company-name hints.

## KPI / Commission

- Calculated once per month.
- Performance month is the month immediately before PayrollMonth.
- Example: June performance is paid in July payroll.
- A new employee whose JoinDate is not day 1 is not eligible for that performance month.
- Employee must have at least 30 recorded work days in the performance-month AttendanceSummary to be eligible.
- KPI and Commission amounts are accepted from verified KPI/Commission source rows; the payroll engine does not invent a score or amount.
- If a source row exists but the employee is not eligible, KPI/Commission is forced to zero.
- KPI/Commission eligibility is retained in the payroll result for auditability.

## OT

The existing production rule is preserved:

OTPay = OT_Hours × (Salary / 240) × 1.5

The current engine reads OT_Hours from AttendanceSummary.

## Social Security

The existing configured rule is preserved:

- rate: 5%
- minimum wage base: 1,650 THB
- maximum wage base: 17,500 THB

The system keeps these as configuration rather than hard-coding them into the UI.

## Employee Welfare Fund

The Department of Labour Protection and Welfare announced collection from 1 October 2026. The announced rate is 0.25% for each of employee and employer from 1 October 2026 through 30 September 2031, then 0.50% each from 1 October 2031.

The payroll engine stores EmployeeWelfareFund and EmployerWelfareFund separately. EmployeeWelfareFund is included in TotalDeduction; EmployerWelfareFund is not deducted from NetPay.

Coverage/eligibility must follow the employer/employee status required by the applicable law and official registration. The implementation exposes an explicit eligibility field so HR can override it when a person is exempt/not covered.

## KPI / Commission source-period fields

`PayrollItems` rows used for KPI/Commission must carry `PerformanceMonth` (YYYY-MM).
They may also carry `PayrollMonth` (YYYY-MM). The engine will not reuse an undated
KPI/Commission row for a later payroll period.

## Fixed payroll export header

The production XLSX exporter uses a fixed canonical header:

Status, EmployeeID, Name, Nickname, Department, Position, Company, PayrollGroup,
JoinDate, PerformanceMonth, PayrollMonth, WorkDays, LeaveDays, AbsentDays,
LateMinutes, BaseSalary, Allowances, Bonus, OnlineCommission, OfflineCommission,
Commission, FixedKPI, VariableKPI, KPI, OT_Hours, OTPay, GrossPay, Tax,
SocialSecurity, EmployeeWelfareFund, OtherDeduction, TotalDeduction, NetPay,
EmployerWelfareFund, KPIEligible, CommissionEligible, EligibilityStatus,
EligibilityReason, BankAccount

The month is a filter/period, not a separate database table.

## Payroll run control

DRAFT -> VALIDATED -> APPROVED -> LOCKED -> COMMITTED

No live write is allowed unless the existing production-readiness, go-live, data-integrity and write-key gates all pass.

## Tax

The current legacy workbooks contain manually supplied tax/withholding values. The Payroll Engine therefore preserves imported Tax values but does not invent a Thai PIT calculation. A dedicated tax-rule specification must be added before the system claims automated tax calculation.

## Export

The backend exposes:

GET /api/payroll-run/:month/export.xlsx
GET /api/payroll-run/:month/export.xlsx?group=STARLIVE
GET /api/payroll-run/:month/export.xlsx?group=IAMDP

All exports are generated from live Feishu-backed payroll inputs and contain no mock rows.
