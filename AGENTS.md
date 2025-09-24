# Repository Guidelines

## Project Structure & Module Organization
- `apps/web` contains the React frontend, organized under `src/app` with feature folders in `features/` and shared UI in `components/`.
- `packages/domain` holds pure TypeScript domain logic and coverage-driven unit tests in `src/__tests__`.
- `packages/firebase` provides Firestore helpers, rules, and seed scripts; tests live under `tests/`.
- Playwright E2E specs reside in `apps/web/tests/e2e`; shared configs sit at the repo root (`eslint.config.js`, `prettier.config.cjs`, `tsconfig.base.json`).

## Build, Test, and Development Commands
- `npm run dev` – start the Vite dev server on http://localhost:5173.
- `npm run build` – type-check and produce the production bundle.
- `npm run lint` – run ESLint across all workspaces; warnings fail the check.
- `npm run format` – apply Prettier’s 2-space, 100-column formatting.
- `npm run test:unit` – execute Vitest suites for domain and web packages.
- `npm run test:e2e` – run the Playwright smoke suite (dev server or preview required).
- `npm run seed` – populate Firestore via admin SDK using `.env` secrets.

## Coding Style & Naming Conventions
- TypeScript everywhere with strict settings inherited from `tsconfig.base.json`.
- Prefer functional React components; hooks use the `use*` prefix.
- Files follow kebab-case (`menu-items-page.tsx`); colocate component tests with `.test.tsx` suffix.
- Tailwind utilities should be grouped logically; share tokens through helpers in `apps/web/src/app/lib`.
- Always run `npm run format` before committing; ESLint enforces accessibility and domain-specific rules.

## Testing Guidelines
- Vitest + React Testing Library drive unit tests; ensure domain code keeps ≥90% line coverage (`packages/domain/vitest.config.ts`).
- Firestore rule tests depend on the emulator: `npm run test --workspace packages/firebase`.
- Playwright smoke specs cover auth and menu flows; execute before releases.
- New features should add targeted unit or component tests touching edge cases.

## Commit & Pull Request Guidelines
- Use action-oriented Conventional Commit messages (`feat: add menu item editor guard`).
- Scope commits narrowly; update or add tests alongside functional changes.
- PRs must describe user impact, list executed checks (e.g., `npm run test:unit`), link relevant issues, and attach UI screenshots or recordings when visuals change.
- Note environment variables or migration steps in the PR description when deployment-impacting.

## Security & Configuration Tips
- Do not commit `.env` or service account files; rotate Firebase keys regularly.
- Review `firestore.rules` with every RBAC change and cover regressions with new rule tests.
- Seed and admin scripts require restricted credentials—limit access to trusted maintainers.
