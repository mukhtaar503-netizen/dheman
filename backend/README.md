# SMS Backend

REST API for the Service Management System. See [`../docs/SMS-PRD.md`](../docs/SMS-PRD.md) for the full product specification this implementation follows.

## Stack

Node.js · Express.js · TypeScript · Prisma ORM · Supabase PostgreSQL · JWT (access + refresh) · RBAC · Swagger/OpenAPI

## Getting Started

```bash
cp .env.example .env      # fill in DATABASE_URL (Supabase) and JWT secrets
npm install
npm run prisma:migrate    # creates the schema in your database
npm run prisma:seed       # seeds Super Admin user + service catalog
npm run dev                # http://localhost:4000
```

API docs: `http://localhost:4000/docs` (Swagger UI), raw spec at `/docs.json`.

Health check: `GET /health`.

## Project Layout

```
src/
  app.ts / server.ts     Express app wiring and entry point
  routes.ts               Mounts every module's router under /api/v1
  config/                 env, swagger
  lib/prisma.ts           Prisma client singleton
  middleware/              auth (JWT), RBAC, validation, error handling
  utils/                   password hashing, tokens, numbering, audit logging
  modules/<name>/
    <name>.routes.ts       Express router + Swagger JSDoc annotations
    <name>.controller.ts   Thin HTTP layer
    <name>.service.ts      Business logic, Prisma queries, business rules
    <name>.schema.ts        Zod request validation schemas
```

Each module maps directly to a section of the PRD's Functional Requirements
(Section 8) and is delivered phase-by-phase per the roadmap in PRD Section 18.3:

| Phase | Modules |
|---|---|
| 1 — Foundation | auth, users, customers, settings |
| 2 — Pre-Sales | service-categories, service-requests, inspections, quotations |
| 3 — Delivery | projects, tasks, technicians |
| 4 — Finance | materials, expenses, invoices, payments |
| 5 — Insight & Polish | notifications, reports, audit |

## Conventions

- All protected routes require `Authorization: Bearer <accessToken>`; RBAC is enforced via `requireRole(...)` middleware per PRD Section "Role Definitions".
- Business rules from PRD Section 10 are enforced in the service layer, not the controller.
- Every create/update on a financially or operationally sensitive entity writes an `AuditLog` row (PRD Section 9.13).
- Money fields use Prisma `Decimal` — never plain `number` — to avoid floating-point rounding errors.
