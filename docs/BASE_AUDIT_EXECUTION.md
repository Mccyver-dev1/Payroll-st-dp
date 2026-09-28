# Base Audit — Pre-AI Work

Feishu Base AI quota is exhausted, so destructive Base changes are paused.

Verified from the current GitHub repository:
- `index.html` contains mock employee data.
- `triggerSync()` only waits and shows a success alert; it does not call Feishu.
- Backend table discovery incorrectly used `Departments & Positions`.
- The actual Base has separate `Departments` and `Positions`.

Prepared here:
1. Correct canonical table discovery for 8 target tables.
2. Add Positions support.
3. Add schema inspection endpoint.
4. Add paginated real record sync.
5. Normalize common Feishu field values.
6. Remove fake frontend sync behavior.
7. Keep FEISHU_APP_SECRET backend-only.

Production gate: do not delete/merge old Base tables until table IDs, field IDs/types, duplicates, orphan links, and Payroll formulas are validated.
