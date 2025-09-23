# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taco Casa Digital Solution - A monorepo for weekly operations management built with React, Firebase, and TypeScript. The system handles restaurant operations including inventory tracking, sales data, ingredient management, and cost calculations.

## Project Structure & Module Organization

- Root `package.json` defines workspace for `apps/web`, `packages/domain`, and `packages/firebase`.
- Frontend lives in `apps/web/src` with feature folders under `app/` and shared UI in `app/components`.
- Domain logic sits in `packages/domain/src`; Firestore rules, admin utilities, and seed scripts reside in `packages/firebase`.
- Tests: domain unit tests in `packages/domain/src/__tests__`, Firestore rule tests in `packages/firebase/tests`, UI/unit specs in `apps/web/src`, and Playwright E2E specs in `apps/web/tests/e2e`.

## Build, Test, and Development Commands

- `npm run dev` – start the Vite dev server at `http://localhost:5173`.
- `npm run build` – type-check and produce production build for web app.
- `npm run lint` – run ESLint across workspaces (fails on warnings).
- `npm run test:unit` – run Vitest coverage for domain + web unit suites.
- `npm run test:e2e` – execute Playwright smoke tests (ensure dev server or `npm run build && npm run preview`).
- `npm run seed` – execute Firebase admin seeding; requires `.env` values.

## Coding Style & Naming Conventions

- TypeScript everywhere; strict mode enabled via `tsconfig.base.json`.
- Run `npm run format` after edits; Prettier enforces 2-space indent, 100-char line width.
- Favor functional React components, hooks prefixed with `use*`, and files using kebab-case (`week-picker.tsx`).
- Tailwind classes ordered by utility groups; keep shared styles via helpers in `app/lib`.

## Testing Guidelines

- Unit tests use Vitest + React Testing Library; co-locate UI tests beside components with `.test.tsx` suffix.
- Domain module requires ≥90% line coverage (`packages/domain/vitest.config.ts` enforces thresholds).
- Firestore rules validated with `@firebase/rules-unit-testing`; run `npm run test --workspace packages/firebase` before pushing security changes.
- Playwright smoke spec (`apps/web/tests/e2e/finalize-week.spec.ts`) must pass prior to release.

## Commit & Pull Request Guidelines

- Commit messages follow conventional, action-oriented verbs (e.g., `feat: add finalize flow transaction`).
- Scope commits narrowly; include updated tests and docs.
- PRs should describe user impact, testing evidence (`npm run test:unit`, `npm run test:e2e`), and reference related issues.
- Attach screenshots or recordings for UI-facing changes and note required environment variables if deployment blocking.

## Remaining Development Notes

- Step 1 polish mostly complete: workspace scripts vetted, Tailwind/shadcn scaffolded, README refreshed. Vitest UI suite now includes a WeekList smoke test; Playwright placeholder exists but needs real coverage and runner fix.
- Step 2 complete: routed UI, auth guards, CRUD screens, enhanced finalization flow with confirmation dialog, comprehensive error handling, and full PDF export functionality.
- Step 3 remaining: GitHub Actions CI, deployment runbooks, architecture docs, and Firebase emulator documentation.

### Latest Session Highlights (Feb 2025)

- Root ESLint flat config updated to use plugin-provided flat presets so `npm run lint` succeeds without compat errors.
- Added `finalizeWeek` Firestore helper and wired WeekReviewPage to live domain summaries with owner-only finalize CTA.
- Extended Vite/TS path aliases to include `@firebase/services`; Week list gained a co-located Vitest UI spec; Playwright smoke file scaffolded under `apps/web/tests/e2e`.
- **RESOLVED**: Playwright expect collision issue completely fixed by creating isolated `playwright.config.ts` and removing conflicting @firebase alias
- **COMPLETED**: WeekReviewPage comprehensive component tests with role-based finalization logic, error states, and business rule validation
- **COMPLETED**: Real E2E smoke tests covering navigation, authentication flows, and basic application functionality (9 tests passing)
- **COMPLETED**: Expanded Firestore security rule tests with 10 new finalize behavior tests covering cost snapshots, reports, sales, and inventory restrictions

### Testing Infrastructure Status

- **Lint**: ✅ All workspaces passing with ESLint flat config
- **Unit Tests**: ✅ Domain (≥90% coverage) + Web component tests (6/6 passing)
- **E2E Tests**: ✅ Playwright smoke suite (9/9 passing across browsers)
- **Firestore Rules**: ✅ Comprehensive security tests written (requires emulator setup)
- **WeekReviewPage**: ✅ Component tests cover finalization, auth, loading, and error states

### Outstanding Issues

- **COMPLETED**: Enhanced finalization UX with confirmation dialog and comprehensive error handling
- **COMPLETED**: Full PDF export functionality with professional layouts and ingredient version tracking
- Firestore rule tests require Firebase emulator to be running locally for execution
- GitHub Actions CI pipeline not yet configured for automated testing

## Security & Configuration Tips

- Never commit `.env` files; keep secrets in Firebase console or GitHub Actions secrets.
- Rotate Firebase API keys regularly and restrict admin credentials to seed tooling.
- Review `firestore.rules` and its tests for RBAC changes—regressions must be covered by new tests.

## Sprint Progress (Feb 2025)

- Monorepo scaffolding in place with shared linting, prettier, and Husky (needs GH Actions wiring).
- Firebase client/admin helpers, seed script, and Firestore rules drafted with unit tests pending polish.
- Auth provider + login form complete; React Router shell enforces auth + owner guards.
- Week list, sales, inventory, ingredient, and menu-item screens now backed by Firebase services with React Query state.
- Domain costing library implemented with tests; enhanced finalization flow with confirmation dialog, comprehensive error handling, ingredient version tracking, and full PDF export functionality now complete.