# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taco Casa Digital Solution - A monorepo for weekly operations management built with React, Firebase, and TypeScript. The system handles restaurant operations including inventory tracking, sales data, ingredient management, recipe costing, and food cost percentage calculations.

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

### Frontend (apps/web)
- **State Management**: React Query for server state, AuthProvider for auth context
- **Routing**: React Router v7 with protected routes and role guards
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom components (Radix UI primitives)
- **File Structure**: Feature-based organization under `src/app/features/`

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
- Admin SDK utilities for seed scripts
- Firestore data models and type definitions
- Seed script creates demo users and test data

### Key Data Flows
1. **Inventory Tracking**: Begin → Received → End → Computed Usage
2. **Cost Calculation**: Ingredient Cost Snapshots + Usage → Cost of Sales
3. **Recipe Costing**: Recipe Ingredients + Ingredient Costs → Total Cost + Food Cost %
4. **Week Finalization**: Inventory + Sales + Costs → PDF Report

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

- **Owner**: `regan.owner@tacocasa.test` / `OwnerPass123!`
- **Team Member**: `taylor.team@tacocasa.test` / `TeamPass123!`

## Environment Setup

Copy `.env.example` to `.env` and configure Firebase credentials (if example file exists).

## Known Issues (Sep 2025)

None currently documented.