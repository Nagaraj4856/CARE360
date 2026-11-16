# CARE360

CARE360 is a React/Vite elderly-care dashboard with an Express API and PostgreSQL/Prisma backend. Explore Demo works without PostgreSQL and uses fictional sample data stored separately from signed-in account data.

## Requirements

- Windows 10/11, Node.js 20+ and npm
- PostgreSQL 14+ for real registration, login, and persistent patient data

## Install (PowerShell)

Run from the CARE360 project root:

```powershell
npm install
npm install --prefix "client CARE360"
npm install --prefix server

# With npm 11, approve the package install scripts needed for Vite and Prisma:
npm --prefix "client CARE360" install-scripts approve esbuild
npm --prefix "client CARE360" rebuild esbuild
npm --prefix server install-scripts approve @prisma/client prisma @prisma/engines
npm --prefix server rebuild @prisma/client prisma @prisma/engines

Copy-Item server/.env.example server/.env
notepad server/.env

# Configure the database and JWT secret in server/.env, then run:
npm run db:validate
npm run db:generate
npm --prefix server run db:migrate -- --name initial
```

Use a reachable PostgreSQL URL in `DATABASE_URL` and a private random `JWT_SECRET` of at least 32 characters. The example values are placeholders. Do not commit `server/.env`. Migrations run only when you invoke the migration command; CARE360 does not modify a database automatically.

## Start both services

```powershell
npm.cmd run dev
```

Open http://localhost:5173/. The API runs on http://localhost:4000. The root Node launcher starts the API and Vite by their actual working directories, including the space in `client CARE360`; it reports a child startup failure and stops the other service. Use Ctrl+C to stop both. If a port is occupied, inspect it with `Get-NetTCPConnection -State Listen -LocalPort 4000,5173 | Select-Object LocalPort,OwningProcess`. Stop only a process you recognize as a stale CARE360 server/client, then rerun the command.

Start either service separately if needed:

```powershell
npm.cmd run dev:client
npm.cmd run dev:server
```

## Demo and real accounts

On the login screen choose **Explore Demo**. It opens a labeled fictional patient dashboard with sample medication/prescription information, appointments, wellness values, sample medical documents, activities, and reminders. Demo edits remain in `localStorage.care360Demo`; account records are fetched from the API and are not written to that demo key. The browser demo does not need a login or database.

For real registration and login, set up PostgreSQL and edit `server/.env`. Registration creates a patient account, hashes the password with bcrypt, and returns an expiring JWT. Login uses the same API. The client keeps the session for the browser tab and uses patient-authorized routes. The database status is reported by `GET /api/health`; the health response does not claim a connection until a query succeeds.

The current schema supports PATIENT, FAMILY, CARETAKER and ADMIN roles. The self-registration screen creates patient accounts only. Admin login requires a provisioned database account. Doctor role/login is not implemented. Family/caretaker consent management UI is incomplete.

## Tests and production build

```powershell
npm run build
npm test
npm run db:validate
```

Tests cover database-free health status, protected route behavior, invalid login input, missing database configuration and safe 404 responses. Full account CRUD and migration checks need a reachable PostgreSQL instance.

## Current limits

Server-backed medication and appointment reads/creation and dose confirmation are available. Wellness, assistant interactions, document metadata and demo notifications are local demo features. Secure file storage, OCR, email reminders, password reset, external AI, SOS notification delivery and wearable integrations are not configured. SOS records an event only; it does not notify contacts or emergency services. Do not enter real patient information in demo mode.

## Deployment

Build with `npm run build` and deploy `client CARE360/dist` to Vercel. Deploy the API from `server` to Render or a similar Node.js host. Set `DATABASE_URL`, a private random `JWT_SECRET`, and `CLIENT_ORIGIN` in host secret settings. Apply migrations with `npx prisma migrate deploy` from `server`. Use HTTPS and private file storage before handling real health records.
