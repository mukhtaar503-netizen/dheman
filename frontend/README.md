# SMS Frontend

Next.js (App Router) frontend for the Service Management System. See [`../docs/SMS-PRD.md`](../docs/SMS-PRD.md) for the full product specification.

## Stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui-style components (Radix primitives + CVA) · TanStack Query

## Getting Started

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
npm install
npm run dev                   # http://localhost:3000
```

## Project Layout

```
src/
  app/
    login/, register/          Public auth pages
    (dashboard)/                Authenticated shell — sidebar nav, role-aware
      dashboard/                 Role-specific KPI widgets (reports.dashboard)
      customers/                  Customer list (staff)
      service-requests/           Service Request list (staff + customer view)
  components/
    ui/                         shadcn-style primitives (Button, Input, Card, Table, Label)
    providers.tsx                TanStack Query + Auth context
  hooks/use-auth.tsx            Auth state: login/logout, token refresh handled in api-client
  lib/
    api-client.ts                fetch wrapper: attaches Bearer token, auto-refreshes on 401
    utils.ts                     cn() class merge helper
  types/                        Shared TS types mirroring backend DTOs
```

## Conventions

- Every list/detail page fetches through `api` (`src/lib/api-client.ts`) and TanStack Query — no ad hoc `fetch` calls in components.
- Route protection is enforced client-side in `app/(dashboard)/layout.tsx`; each backend endpoint independently enforces RBAC, so this is a UX convenience, not a security boundary.
- New modules should follow the `customers` page as the reference pattern: a typed row interface, a `useQuery`, and the shared `Table` primitives.
- This scaffold covers the read paths needed to prove the architecture end-to-end; build out create/edit forms and the remaining modules (quotations, projects, tasks, invoices, etc.) following the same pattern against the already-complete backend API (see `../backend/README.md`).
