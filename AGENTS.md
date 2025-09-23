# Repository Guidelines

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
- Step 2 in progress: routed UI, auth guards, and CRUD screens ship; week finalize transaction added (`finalizeWeek`) but requires end-to-end verification, better error messaging, and PDF export stub.
- Step 3 pending: PDF export placeholder, GitHub Actions CI, deployment runbooks, architecture docs, and seed + Firestore rule coverage.

### Latest Session Highlights (Feb 2025)

- Root ESLint flat config updated to use plugin-provided flat presets so `npm run lint` succeeds without compat errors.
- Added `finalizeWeek` Firestore helper and wired WeekReviewPage to live domain summaries with owner-only finalize CTA.
- Extended Vite/TS path aliases to include `@firebase/services`; Week list gained a co-located Vitest UI spec; Playwright smoke file scaffolded under `apps/web/tests/e2e`.

### Outstanding Issues

- Playwright CLI fails immediately (`TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`) due to expect globals collision; needs runtime isolation (e.g., avoid importing Vitest expect helpers) before real smoke coverage can land.
- WeekReview finalization flow lacks integration tests and real Firestore verification; add mocked hooks tests plus manual/automated flow once expect conflict resolved.
- UI shows computed costing but omits ingredient version labels and variance highlights; design decisions pending.
- Firestore rule tests still missing finalize prohibitions; update `packages/firebase/tests` once finalize semantics confirmed.

## Security & Configuration Tips

- Never commit `.env` files; keep secrets in Firebase console or GitHub Actions secrets.
- Rotate Firebase API keys regularly and restrict admin credentials to seed tooling.
- Review `firestore.rules` and its tests for RBAC changes—regressions must be covered by new tests.

## Sprint Progress (Feb 2025)

- Monorepo scaffolding in place with shared linting, prettier, and Husky (needs GH Actions wiring).
- Firebase client/admin helpers, seed script, and Firestore rules drafted with unit tests pending polish.
- Auth provider + login form complete; React Router shell enforces auth + owner guards.
- Week list, sales, inventory, ingredient, and menu-item screens now backed by Firebase services with React Query state.
- Domain costing library implemented with tests; finalize flow + PDF/export still to build.
