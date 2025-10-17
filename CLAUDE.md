# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electric Abacus - A multi-tenant SaaS monorepo for weekly operations management built with React, Firebase, and TypeScript. The system handles business operations including inventory tracking, sales data, ingredient management, recipe costing, and food cost percentage calculations. Each business is fully isolated with its own data and users can belong to multiple businesses with different roles.

## Project Structure

- **apps/web**: React frontend with Vite, TypeScript, and Tailwind CSS
- **packages/domain**: Business logic and costing calculations
- **packages/firebase**: Firestore rules, admin utilities, and seed scripts

## Key Commands

- `npm run dev` – Start dev server at `http://localhost:5173`
- `npm run build` – Build for production
- `npm run lint` – Run ESLint (fails on warnings)
- `npm run test:unit` – Run unit tests with coverage
- `npm run test:e2e` – Run Playwright e2e tests (auto-starts dev server)
- `npm run seed` – Seed Firebase with test data

### Workspace-Specific Commands

- `npm --workspace apps/web run test:watch` – Run unit tests in watch mode
- `npm --workspace packages/domain run test` – Run domain tests only
- `npm --workspace packages/firebase run seed` – Seed Firebase data
- `npm --workspace packages/firebase run migrate` – Migrate existing data to multi-tenant structure

### Firebase Deployment

- `firebase deploy --only functions` – Deploy Cloud Functions
- `firebase deploy --only firestore:rules` – Deploy Firestore security rules
- `firebase deploy` – Deploy all Firebase resources

## Current Features

### Recipe Costing System (Sep 2025)
- **Real-time Cost Calculation**: Dynamic recipe costs update as ingredients are modified
- **Food Cost Percentage**: Live calculation with color-coded thresholds:
  - Green: <30% (excellent margin)
  - Yellow: 30-35% (acceptable margin)
  - Red: >35% (needs adjustment)
- **Ingredient Categories**: food, paper, other
- **Enhanced Tables**: Unit cost and line total columns with recipe totals
- **Batch Ingredients**: Support for batch recipe costing with yield calculations

### Core Functionality
- User authentication with role-based access (owner/teamMember)
- Weekly inventory tracking with usage calculations
- Sales data entry and reporting (food/drink sales with tax/promo deductions)
- Ingredient management with version history
- Menu item recipes with cost analysis
- Week finalization with PDF export

## Architecture Notes

### Multi-Tenant Architecture (Oct 2025)

Electric Abacus uses a multi-tenant SaaS architecture with complete data isolation:

#### Custom Claims Authentication
- Firebase Authentication users have custom claims: `{ businessId, role }`
- Claims are set automatically by Cloud Function (`onUserCreate`) when a user is created
- Claims are read by `BusinessProvider` via `getIdTokenResult()` to provide business context
- All React Query hooks use `useBusiness()` to get current `businessId`

#### Data Isolation
- **Collection Structure**: `/businesses/{businessId}/{collection}/{docId}`
- **Old Structure** (deprecated): `/{collection}/{docId}`
- **Example Paths**:
  - Ingredients: `/businesses/abc123/ingredients/beef`
  - Weeks: `/businesses/abc123/weeks/2025-W39`
  - Menu Items: `/businesses/abc123/menuItems/taco`

#### Security Rules
- Firestore rules enforce tenant isolation using `request.auth.token.businessId`
- Users can only access data belonging to their business
- Write operations restricted by role (owner vs teamMember)
- Global `/users` collection remains for multi-business support (future feature)

#### Cloud Functions
Location: `packages/firebase/functions/`
- **onUserCreate**: Triggered on user creation
  - Creates a new business for the user
  - Sets custom claims: `{ businessId, role: 'owner' }`
  - Creates user profile with businesses map

### Frontend (apps/web)
- **State Management**: React Query for server state, AuthProvider for auth context
- **Business Context**: BusinessProvider reads custom claims and provides businessId to all hooks
- **Routing**: React Router v7 with protected routes and role guards
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom components (Radix UI primitives)
- **File Structure**: Feature-based organization under `src/app/features/`
- **Provider Hierarchy**: QueryClient → AuthProvider → BusinessProvider → App

### Domain Package (packages/domain)
- Pure business logic with no external dependencies
- Core costing functions:
  - `computeUsage()` - Calculate inventory usage (begin + received - end)
  - `computeCostOfSales()` - Calculate cost breakdown by ingredient
  - `calculateRecipeCost()` - Calculate recipe costs with unit conversions
  - `calculateFoodCostPercentage()` - Calculate food cost percentage
  - `calculateBatchIngredientCost()` - Calculate batch ingredient costs
- Unit conversion system via `getConversionFactor()` for standard units

### Firebase Package (packages/firebase)
- Admin SDK utilities for seed scripts and migrations
- Firestore data models and type definitions
- Cloud Functions for user onboarding and custom claims
- Enhanced seed script with realistic demo data (multi-tenant structure):
  - 1 default business
  - 2 users (owner and team member) with custom claims
  - 31 ingredients across 3 categories (food, paper, other)
  - 15 menu items with realistic pricing
  - 6 finalized historical weeks (2025-W33 to W38) with:
    - Realistic daily sales ($4,000-$6,500/week)
    - Complete inventory tracking with usage patterns
    - Generated cost reports and summaries
  - 1 draft week for current operations
- Migration script (`migrate-to-multitenant.ts`) for converting existing single-tenant data

### Key Data Flows
1. **User Onboarding**: User Creation → Cloud Function → Business Creation → Custom Claims Set → User Profile Created
2. **Business Context**: Auth Token → getIdTokenResult() → BusinessProvider → useBusiness() → All Queries/Mutations
3. **Inventory Tracking**: Begin → Received → End → Computed Usage
4. **Cost Calculation**: Ingredient Cost Snapshots + Usage → Cost of Sales
5. **Recipe Costing**: Recipe Ingredients + Ingredient Costs → Total Cost + Food Cost %
6. **Week Finalization**: Inventory + Sales + Costs → PDF Report

### Role-Based Access
- **Owner**: Full access to all features including ingredients, menu items, and week review
- **Team Member**: Access to weeks list, sales entry, and inventory tracking
- Protected routes enforce role restrictions via `RoleGuard` component

## Testing Status

- **Domain Tests**: ✅ 99% coverage on costing functions (15 tests)
- **Unit Tests**: ✅ All passing
- **E2E Tests**: ✅ 9 smoke tests passing
- **Lint**: ✅ No errors or warnings

## Demo Credentials

- **Admin**: `admin@electricabacus.test` / `AdminPass123!`
- **Staff**: `staff@electricabacus.test` / `StaffPass123!`

## Environment Setup

Copy `.env.example` to `.env` and configure Firebase credentials (if example file exists).

## Migration Guide (For Existing Deployments)

If you have existing single-tenant data that needs to be migrated to the multi-tenant structure:

1. **Backup your data** (export from Firebase console)
2. **Deploy Cloud Functions**: `firebase deploy --only functions`
3. **Run migration script**: `npm --workspace packages/firebase run migrate`
4. **Deploy new security rules**: `firebase deploy --only firestore:rules`
5. **Test with existing users** (they may need to refresh their auth tokens by logging out and back in)
6. **Verify data isolation** by checking that businesses cannot access each other's data
7. **Delete old flat collections** manually from Firebase console once verified

## Type Definitions

### Custom Claims Structure
```typescript
{
  businessId: string;  // The business this user belongs to
  role: 'owner' | 'teamMember';  // User's role in this business
}
```

### UserProfile Structure
```typescript
{
  displayName: string;
  role: 'owner' | 'teamMember';
  businesses: Record<string, {
    businessId: string;
    role: 'owner' | 'teamMember';
    joinedAt: Timestamp;
  }>;
  createdAt: Timestamp;
}
```

### BusinessProfile Structure
```typescript
{
  name: string;
  createdAt: Timestamp;
}
```

## Known Issues (Oct 2025)

None currently documented.