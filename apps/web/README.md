# Electric Abacus Web App

The web workspace hosts the Electric Abacus MVP frontend built with React, Vite, Tailwind, and shadcn-inspired primitives. The app consumes Firebase Auth/Firestore and the shared `@domain/costing` library.

## Available Scripts

- `npm run dev` – Start the Vite dev server at <http://localhost:5173>.
- `npm run build` – Type-check and build for production (`dist/`).
- `npm run lint` – ESLint (flat config).
- `npm run test:unit` – Vitest with coverage.
- `npm run test:e2e` – Playwright smoke tests (requires dev server or `npm run preview`).

## Feature Checklist (Foundation)

- Auth provider + login form (email/password) with role-based routing guards.
- Layout shell with navigation badges and sign-out handling.
- Week list with creation flow (owners), sales and inventory forms, owner review stub.
- Ingredient CRUD + version history viewer, menu item recipe builder placeholder tied to Firestore services.

See the root `README.md` for repo-wide setup, next steps, and remaining sprint goals.
