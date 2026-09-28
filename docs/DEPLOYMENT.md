# Deployment

## A. GitHub Pages Frontend

1. Upload this project to `Mccyver-dev1/Payroll-st-dp`.
2. GitHub Settings → Pages → Source: GitHub Actions.
3. The workflow deploys `frontend/`.
4. Update `frontend/config.js` so `API_BASE_URL` points to the deployed backend.

## B. Backend

Deploy `backend/` to Render/Railway/Fly.io/VPS.

Required environment:
- FEISHU_APP_ID
- FEISHU_APP_SECRET
- FEISHU_APP_TOKEN
- FRONTEND_ORIGIN

Optional exact table IDs can be supplied. Otherwise the backend discovers tables by name.

## C. Never do this

Do not put App Secret in:
- frontend/config.js
- index.html
- browser JavaScript
- GitHub Actions logs
- README
- public GitHub repository

## D. Smoke test

GET /api/health
GET /api/feishu/tables
GET /api/payroll/sync
POST /api/payroll/calculate
POST /api/payslips/send
