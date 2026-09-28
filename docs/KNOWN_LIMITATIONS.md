# Known Limitations

1. Tax engine in this starter is a technical placeholder and must be replaced/approved against the company's actual Thai payroll tax policy before production.
2. Payroll writes back to Feishu are intentionally not enabled by default; first validate read/sync and calculations.
3. Payslip Bot currently sends a text notification. PDF/file upload can be added after recipient identity and file permissions are verified.
4. Role-based authorization should be added before exposing payroll data beyond the trusted HR environment.
5. Exact field aliases may need adjustment if the current Base uses different field names.
