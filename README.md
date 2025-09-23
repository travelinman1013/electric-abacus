# Taco Casa Digital Solution (MVP)

This monorepo hosts the Taco Casa weekly operations MVP built with React, Firebase, and a shared TypeScript domain library. The current sprint delivered the production foundation—authentication shell, routed UI skeletons, and data access layers backed by Firebase—and now focuses on wiring the week finalization flow and baseline automated tests.

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

## Latest Updates

- **Finalize flow groundwork** – `finalizeWeek` Firestore helper now snapshots inventory cost data, computes the domain report, persists the summary, and marks the week finalized in a single transaction. `WeekReviewPage` pulls live report data, wires owner-only finalization, and shows computed costing metrics instead of placeholders.
- **Testing scaffolding** – Added a Vitest UI spec (`week-list-page.test.tsx`) to verify owner empty states and loading indicators, and introduced a Playwright smoke placeholder (`tests/e2e/finalize-week.spec.ts`). Vite test config now excludes `tests/e2e` from Vitest to avoid cross-runner conflicts.
- **Tooling polish** – Root ESLint flat config now relies on plugin-provided flat presets, allowing `npm run lint` to succeed across workspaces. Path aliases include `@firebase/services` for both TypeScript and Vite.

## What’s Ready

- Firebase auth provider with profile fetch, login form, and guarded routing/layout.
- Week list, sales entry, inventory, ingredients, and menu item pages wired to Firestore services with optimistic React Query hooks.
- Shared domain types + costing math module (usage, cost of sales, report summary) with tests.
- Firestore service layer covering weeks, inventory, sales, ingredient versioning, and menu recipe CRUD, including finalize transaction scaffolding.
- Tailwind/shadcn UI primitives and layout shell prepared for role-specific experiences.
- Baseline Vitest coverage for domain and key UI entry points.

## Still in Progress

- **Finalize UX validation** – Need real Firestore data to verify `finalizeWeek` transaction, flesh out error handling, and surface cost snapshot metadata (e.g., ingredient version provenance) in the UI.
- **Testing follow-through** – Playwright smoke run currently fails (`Symbol($$jest-matchers-object)` redefinion) because Playwright’s expect collides with Vitest globals. Resolve the runner conflict and replace the placeholder spec with a real end-to-end path (seed data, login, finalize week).
- **Expanded coverage** – Add Vitest specs for WeekReview, sales/inventory hooks, and Firebase service helpers. Domain package still enforces ≥90% coverage; web package needs meaningful thresholds once more specs exist.
- **Docs & ops** – Architecture notes, deployment runbook, and GitHub Actions CI remain TODO. Firestore rule tests require pass updates to cover finalize restrictions.
