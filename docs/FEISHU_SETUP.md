# Feishu Setup Checklist

1. Open Feishu Developer Console.
2. Open the payroll application.
3. Confirm App ID.
4. Keep App Secret only in backend environment variables.
5. Add Bitable read permissions required for Companies, Employees, AttendanceSummary, PayrollItems and Payroll.
6. If sending Bot messages, enable Bot capability and message permissions.
7. Confirm the Feishu Base is shared with the application/data scope.
8. Create a version and publish it.
9. Verify the Web App URL.
10. Test backend `/api/health`.
11. Test `/api/feishu/tables`.
12. Test `/api/payroll/sync`.
13. Only after sync succeeds, enable payroll calculation and payslip delivery.

The app must be published for the configured API permissions to become effective in production. Feishu community guidance also demonstrates obtaining tenant_access_token server-side and then calling Bitable APIs with the token.
