# Taco Casa Digital Solution

Restaurant operations management system built with React, Firebase, and TypeScript. Features real-time recipe costing, food cost percentage analysis, and comprehensive inventory management.

## Quick Start

```bash
npm install
npm run dev  # Start dev server at http://localhost:5173
```

## Key Features

- **Recipe Costing**: Real-time cost calculation with food cost percentage
- **Inventory Management**: Track weekly usage with automatic calculations
- **Sales Tracking**: Daily sales entry and reporting
- **Menu Management**: Recipe builder with ingredient costs
- **User Roles**: Owner and team member access levels
- **Week Finalization**: PDF export with cost analysis

## Project Structure

```
├── apps/web/          # React frontend (Vite + TypeScript)
├── packages/domain/   # Business logic and calculations
└── packages/firebase/ # Firestore rules and admin tools
```

## Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run test:unit` – Run unit tests
- `npm run lint` – Lint all workspaces
- `npm run seed` – Seed Firebase with test data

## Recent Updates (Sep 2025)

### Recipe Costing System
- Dynamic recipe cost calculation
- Food cost percentage with color-coded thresholds
- Ingredient categorization (food/paper/other)
- Enhanced recipe tables with cost breakdowns

### Known Issues
- Ingredients page: Form submission blocked
- Menu items: Button interactions not working

## Demo Accounts

- Owner: `regan.owner@tacocasa.test` / `OwnerPass123!`
- Team: `taylor.team@tacocasa.test` / `TeamPass123!`

## Environment Setup

Copy `.env.example` to `.env` and configure Firebase credentials.

## Testing

- Domain: 99% coverage on costing functions
- Unit tests: All passing
- E2E: 9 smoke tests passing
- Linting: Clean