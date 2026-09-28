# Mac Feishu Payroll — Production Starter

ระบบ Web Payroll ที่แยก Frontend (GitHub Pages) ออกจาก Backend Proxy เพื่อไม่เปิดเผย Feishu App Secret

## Architecture

GitHub Pages → Backend API → Feishu Open Platform → Bitable

## Modules

1. Dashboard
2. Companies
3. Departments & Positions
4. Employees
5. AttendanceSummary
6. Payroll Engine
7. PayrollItems
8. Payslips
9. Feishu Sync
10. Bot Notification
11. Audit / Health
12. Security & Configuration

## Repository

https://github.com/Mccyver-dev1/Payroll-st-dp

## Frontend

`frontend/index.html`

## Backend

`backend/`

Run:

```bash
cd backend
npm install
copy .env.example .env
npm start
```

The frontend uses `API_BASE_URL` in `frontend/config.js`.

## Important

Do not put `FEISHU_APP_SECRET` in GitHub Pages, HTML, JavaScript, or any public repository file.

The current bundle intentionally contains no secret.

## Feishu

The backend obtains `tenant_access_token` server-side and calls Bitable APIs. The application must have the required Bitable permissions and a published version before production API use.

## Deployment

Recommended simple deployment:
- Frontend: GitHub Pages
- Backend: Render / Railway / Fly.io / VPS
- Secrets: backend environment variables

See `docs/DEPLOYMENT.md`.
