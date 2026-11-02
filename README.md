# Shree Jewellers ERP UI

React 19 + TypeScript + Vite login page for the standalone Auth Service.

## Start
```bash
git clone https://github.com/nileshmaske/shree-jewellers-ui.git
cd shree-jewellers-ui
npm install
npm run dev
```
Open http://localhost:5173. Run Auth Service at http://localhost:8081.

Vite proxies `/api` to the Auth Service in local development, avoiding a cross-origin browser request.

## Login flow
- POST `/api/auth/login` using username/password.
- GET `/api/auth/me` with the JWT bearer token.
- Show the dashboard placeholder on success.
- Token is kept only in React memory; a page refresh signs the user out. This avoids persisting bearer tokens in browser storage, but is not a full production session-management implementation.

## Production work remaining
Use a same-origin reverse proxy/API Gateway, HTTPS, secure refresh/session flow, CSP, and server-side authorization for all business APIs. Never put secrets in frontend environment variables.
