# Taco Casa Digital Solution (MVP)

This monorepo hosts the Taco Casa weekly operations MVP built with React, Firebase, and a shared TypeScript domain library. The current sprint delivered the production foundation: authentication shell, routed UI skeletons, and data access layers backed by Firebase.

## Structure

- `apps/web` – Vite + React web app (Tailwind, shadcn-style UI, React Query, Playwright/Vitest setup).
- `packages/domain` – Pure TypeScript costing library with unit tests.
- `packages/firebase` – Client/admin wrappers, seed script, and Firestore rules/tests scaffolding.

## Getting Started

1. Install dependencies: `npm install` (workspace-aware).
2. Copy `.env.example` → `.env` and populate Firebase admin credentials for tooling.
3. For web client environment values, set the `VITE_FIREBASE_*` keys (see `apps/web/src/app/utils/firebaseClient.ts`).
4. Run the dev server: `npm run dev` (proxies to `apps/web`).

Common scripts:

- `npm run lint` – ESLint across workspaces (uses flat config).
- `npm run test:unit` – Domain + web Vitest suites (domain coverage threshold enforced).
- `npm run seed` – Populate Firebase with demo users, ingredients, a draft week.

## What’s Ready

- Firebase auth provider with profile fetch, login form, and guarded routing/layout.
- Week list, sales entry, inventory, ingredients, and menu item pages wired to Firestore services with optimistic React Query hooks.
- Shared domain types + costing math module (usage, cost of sales, report summary) with tests.
- Firestore service layer covering weeks, inventory, sales, ingredient versioning, and menu recipe CRUD.
- Tailwind/shadcn UI primitives and layout shell prepared for role-specific experiences.

## Still in Progress

- Finalize transaction flow (cost snapshots + report persistence) and PDF export stub.
- Firestore rule test expansion, CI workflow, and documentation polish (architecture, deployment runbook).
- Playwright smoke test and additional Vitest coverage for new UI modules.
