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
- `npm run test:e2e` – Execute Playwright E2E smoke tests across browsers.
- `npm run seed` – Populate Firebase with demo users, ingredients, a draft week.

## Latest Updates

- **Testing Infrastructure Complete** – Fixed Playwright expect collision with isolated `playwright.config.ts`, resolved Vite alias conflicts, and implemented comprehensive test coverage across all layers.
- **WeekReviewPage Testing** – Added 4 focused component tests covering finalization logic, authentication guards, loading states, and error scenarios with proper mocking.
- **E2E Coverage** – Replaced placeholder Playwright tests with 9 real smoke tests covering navigation, authentication flows, and basic functionality across all browsers.
- **Firestore Security** – Extended rule tests with 10 new scenarios covering finalize behavior restrictions for cost snapshots, reports, sales, and inventory data.
- **Finalize flow groundwork** – `finalizeWeek` Firestore helper now snapshots inventory cost data, computes the domain report, persists the summary, and marks the week finalized in a single transaction. `WeekReviewPage` pulls live report data, wires owner-only finalization, and shows computed costing metrics instead of placeholders.

## What’s Ready

- Firebase auth provider with profile fetch, login form, and guarded routing/layout.
- Week list, sales entry, inventory, ingredients, and menu item pages wired to Firestore services with optimistic React Query hooks.
- Shared domain types + costing math module (usage, cost of sales, report summary) with tests.
- Firestore service layer covering weeks, inventory, sales, ingredient versioning, and menu recipe CRUD, including finalize transaction scaffolding.
- Tailwind/shadcn UI primitives and layout shell prepared for role-specific experiences.
- Comprehensive testing infrastructure: Domain ≥90% coverage, WeekReviewPage component tests, E2E smoke suite, and Firestore security rules validation.

## Testing Status

- **Unit Tests**: ✅ Domain (≥90% coverage) + Web component tests (6/6 passing)
- **E2E Tests**: ✅ Playwright smoke suite (9/9 passing across browsers)
- **Firestore Rules**: ✅ Comprehensive security tests (requires emulator setup)
- **Linting**: ✅ ESLint flat config across all workspaces

## Still in Progress

- **Finalize UX validation** – Need real Firestore data to verify `finalizeWeek` transaction, flesh out error handling, and surface cost snapshot metadata (e.g., ingredient version provenance) in the UI.
- **PDF Export** – Export functionality remains placeholder (button disabled, awaiting implementation).
- **Docs & ops** – Architecture notes, deployment runbook, and GitHub Actions CI remain TODO.
