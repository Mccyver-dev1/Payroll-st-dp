# MAC Feishu Payroll — Production Payroll V1.2

## Scope completed

- 01 Dashboard: system overview only; Employee master removed.
- 02 Employee: live Feishu Employee master.
- 03 Attendance: AttendanceSummary source, XLSX import/validation path.
- 04 KPI / Commission: previous-month performance period, eligibility gate.
- 05 Payroll: monthly run, Prepare → Approve → Lock, two payment groups.
- 06 Payslip: Payroll source.
- 07 Reports: Payroll source/export.
- 08 Settings: read-only production configuration view.

## Payroll rules

- STARLIVE = Starlive + Thaiteli.
- IAMDP = Iamdp + Flying Fish.
- KPI/Commission performance month = payroll month - 1.
- New joiner whose JoinDate day is not 1 is not eligible for that performance month.
- KPI/Commission eligibility also requires 30 workdays in the 1–30 payroll cycle.
- KPI/Commission is paid once in the following payroll month.
- Tax is an accounting-provided input. The engine does not calculate PIT.
- Social Security uses configured SSO rules.
- Employee Welfare Fund is separate from Social Security. Current official rates: 0.25% employee + 0.25% employer from 2026-10-01 through 2031-09-30; 0.50% each from 2031-10-01.

## Important production gate

Payroll write and Attendance import remain disabled unless their explicit server environment flags are enabled. Preview/calculation can run read-only first.
