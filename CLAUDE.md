# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taco Casa Digital Solution - A monorepo for weekly operations management built with React, Firebase, and TypeScript. The system handles restaurant operations including inventory tracking, sales data, ingredient management, and cost calculations.

## Core Commands

### Development
```bash
npm run dev              # Start Vite dev server for web app (port 5173)
npm run build            # Build all workspaces
npm run preview          # Preview production build
```

### Testing
```bash
npm run test             # Run all tests across workspaces
npm run test:unit        # Run domain and web unit tests with coverage
npm run test:e2e         # Run Playwright E2E tests
npm run test:watch       # Run Vitest in watch mode (from apps/web)
```

### Code Quality
```bash
npm run lint             # ESLint across all workspaces (flat config, max-warnings=0)
npm run format           # Format all files with Prettier
npm run typecheck        # Type-check without emitting (from apps/web)
```

### Firebase Operations
```bash
npm run seed             # Populate Firebase with demo data (users, ingredients, draft week)
npm run deploy           # Build and deploy to Firebase hosting
```

## Architecture

### Monorepo Structure
- **NPM Workspaces**: Manages three packages with shared dependencies
- **apps/web**: Vite + React SPA with Tailwind CSS and shadcn-style components
- **packages/domain**: Pure TypeScript library for business logic and types
- **packages/firebase**: Firebase client/admin wrappers and Firestore services

### Key Architectural Patterns

#### State Management
- **React Query (TanStack Query)**: Manages server state with optimistic updates
- **Firebase Auth Provider**: Context-based authentication with profile fetching
- **Custom hooks**: `use-ingredients`, `use-menu-items`, `use-weeks` for data fetching

#### Data Flow
1. **Firestore Services** (`apps/web/src/app/services/firestore/`): Direct Firebase operations
2. **React Query Hooks**: Wrap services with caching, mutations, and optimistic updates
3. **UI Components**: Consume hooks for real-time data synchronization

#### Type Safety
- Shared types in `packages/domain/src/types.ts` used across all packages
- Zod schemas for runtime validation
- TypeScript strict mode with comprehensive ESLint rules

#### Routing & Auth
- React Router v7 with protected routes via `ProtectedRoute` component
- Role-based access control through `RoleGuard` component
- Authentication state managed by `AuthProvider` context

### Firebase Integration

#### Environment Configuration
- Root `.env`: Firebase admin credentials for tooling
- `apps/web/.env`: Client-side Firebase config with `VITE_FIREBASE_*` keys

#### Firestore Collections
- `users`: User profiles with roles (owner/teamMember)
- `ingredients`: Master ingredient list with versioning support
- `ingredientVersions`: Historical pricing data
- `menuItems`: Menu items with recipe ingredients
- `weeks`: Weekly operation periods
- `weeklySales`: Sales data per week
- `weeklyInventory`: Inventory tracking per week
- `weeklyCostSnapshot`: Cost data frozen at week finalization

### Domain Logic
The `packages/domain` package contains critical business calculations:
- **Costing**: Usage calculations, cost of sales computations
- **Report Generation**: Summary statistics and cost breakdowns
- **Type Definitions**: Shared across entire application

## Development Notes

### Pre-commit Hooks
- Husky runs lint-staged on commit
- ESLint and Prettier auto-fix on staged files
- Use `--no-verify` to bypass when necessary

### Testing Strategy
- Domain package has coverage thresholds enforced
- Web app uses Vitest for unit tests and Playwright for E2E
- Firestore rules tested with `@firebase/rules-unit-testing`

### Current State
- Authentication, routing, and UI shell complete
- CRUD operations for ingredients, menu items, and weeks functional
- React Query hooks provide optimistic updates
- Transaction flow and PDF exports in progress