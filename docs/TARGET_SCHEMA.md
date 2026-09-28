# Target Payroll Schema

Canonical tables:
Companies
Departments
Positions
Employees
AttendanceSummary
Payroll
PayrollItems
Payslips

Rules:
- Employees is the only employee master.
- EmployeeID is the business key.
- AttendanceSummary is the monthly payroll attendance source.
- Payroll is the payroll calculation master.
- PayrollItems is the normalized variable income/deduction layer.
- Payslips references Payroll and Employee.
- Duplicate legacy tables remain untouched until migration validation is complete.
