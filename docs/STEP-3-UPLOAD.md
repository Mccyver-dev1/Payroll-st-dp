# STEP 3 Upload

Upload these files to the existing repository:

- `backend/src/schema-audit.js` — NEW
- `backend/src/server.js` — REPLACE
- `frontend/schema-audit.html` — NEW
- `docs/STEP-3-SCHEMA-AUDIT.md` — NEW
- `docs/STEP-3-UPLOAD.md` — NEW

Do not delete other project files.

Suggested commit message:

`STEP 3: Add Feishu schema and payroll readiness audit`

After deployment, the new endpoint is:

`/api/schema-audit`

If using GitHub Pages for the frontend, remember that the Node/Express backend must be hosted separately. Do not put FEISHU_APP_SECRET in frontend code.
