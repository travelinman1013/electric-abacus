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
- `npm run seed` – Seed Firebase with test data

## Current Features

### Recipe Costing System (Sep 2025)
- **Real-time Cost Calculation**: Dynamic recipe costs update as ingredients are modified
- **Food Cost Percentage**: Live calculation with color-coded thresholds:
  - Green: <30% (excellent margin)
  - Yellow: 30-35% (acceptable margin)
  - Red: >35% (needs adjustment)
- **Ingredient Categories**: food, paper, other
- **Enhanced Tables**: Unit cost and line total columns with recipe totals

### Core Functionality
- User authentication with role-based access (owner/teamMember)
- Weekly inventory tracking with usage calculations
- Sales data entry and reporting
- Ingredient management with version history
- Menu item recipes with cost analysis
- Week finalization with PDF export

## Known Issues (Sep 2025)

1. **Ingredients Page**: Select component rendering prevents form submission
2. **Menu Items Page**: "Add ingredient" and "Update menu item" buttons not responding

## Testing Status

- **Domain Tests**: ✅ 99% coverage on costing functions (15 tests)
- **Unit Tests**: ✅ All passing
- **E2E Tests**: ✅ 9 smoke tests passing
- **Lint**: ✅ No errors or warnings

## Demo Credentials

- **Owner**: `regan.owner@tacocasa.test` / `OwnerPass123!`
- **Team Member**: `taylor.team@tacocasa.test` / `TeamPass123!`

## Architecture Notes

- Uses React Query for server state management
- Firebase Authentication for user management
- Firestore for data persistence
- Domain package contains pure business logic
- Strict TypeScript with full type safety
- DON'T  " Now I need to check the development server to see the current
  state:"