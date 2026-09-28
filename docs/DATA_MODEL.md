# Target Feishu Data Model

| Module | Table | Core fields |
|---|---|---|
| Organization | Companies | CompanyID, TaxID, Name, Address |
| Organization | Departments & Positions | DepartmentID, Department, PositionID, Position |
| People | Employees | EmployeeID, Name, Company, Department, Position, Salary, OpenID |
| Attendance | AttendanceSummary | EmployeeID, PayrollMonth, WorkDays, OT_Hours, Leave, Late |
| Payroll | Payroll | EmployeeID, PayrollMonth, Base Salary, Gross, SSO, Tax, Net Pay |
| Payroll | PayrollItems | EmployeeID, ItemType, ItemName, Amount |
| Payslip | Payslips | EmployeeID, PayrollMonth, Gross, SSO, Tax, Net Pay, Status |

Use exact field names in Feishu where possible. If existing field names differ, add aliases in `backend/src/payroll.js`.
