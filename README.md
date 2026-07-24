# dheman — Service Management System (SMS)

Enterprise Service Management System for an installation-and-maintenance
business (Furniture, Aluminum, CCTV, PVC Ceiling, PVC Wall Panel). See
[`docs/SMS-PRD.md`](docs/SMS-PRD.md) for the full Product Requirements
Document this implementation follows.

## Structure

```
docs/SMS-PRD.md   Product Requirements Document
backend/          Node.js + Express + TypeScript + Prisma API (see backend/README.md)
frontend/         Next.js + TypeScript + Tailwind + shadcn/ui client (see frontend/README.md)
nginx/            Reverse proxy config for the combined deployment
docker-compose.yml Local/staging orchestration: postgres + backend + frontend + nginx
```

## Build Roadmap

The codebase was built phase-by-phase per PRD Section 18.3, and every phase
is complete:

| Phase | Scope | Status |
|---|---|---|
| 1 — Foundation | Auth/RBAC, Users, Customers, Company Settings | Done |
| 2 — Pre-Sales | Service Catalog, Service Requests, Site Inspection, Quotations | Done |
| 3 — Delivery | Projects, Tasks, Technicians, Scheduling | Done |
| 4 — Finance | Materials, Expenses, Invoices, Payments | Done |
| 5 — Insight & Polish | Notifications, Reports, Audit Log, Dashboards | Done |
| Frontend | Next.js app shell, auth, and reference pages against the full API | Scaffolded — extend page-by-page |

## Quick Start (local development)

```bash
# Backend
cd backend
cp .env.example .env   # set DATABASE_URL to your Supabase/Postgres instance
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev             # http://localhost:4000, Swagger at /docs

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

## Containerized Deployment (Docker + PM2 + Nginx)

```bash
cp backend/.env.example backend/.env   # fill in real secrets
docker compose up --build
```

This starts a local Postgres (dev only — point `DATABASE_URL` at Supabase for
staging/production instead), the backend under PM2 cluster mode, the Next.js
frontend, and Nginx reverse-proxying `/` to the frontend and `/api`, `/docs`,
`/health` to the backend.
