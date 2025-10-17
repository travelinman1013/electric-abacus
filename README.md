# Electric Abacus

Business operations management system built with React, Firebase, and TypeScript. Features real-time recipe costing, food cost percentage analysis, and comprehensive inventory management.

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
- `npm run deploy` – Build and deploy to Firebase Hosting
- `npm run test:unit` – Run unit tests
- `npm run lint` – Lint all workspaces
- `npm run seed` – Seed Firebase with test data

## Firebase Hosting Deployment

### Initial Setup (One-Time)

1. **Login to Firebase**
   ```bash
   npx firebase login
   ```
   This will open a browser for authentication.

2. **Verify Project Configuration**
   The project is configured for `electric-abacus`. Check `.firebaserc` if needed.

### Deploy to Production

Deploy your application with a single command:

```bash
npm run deploy
```

This will:
1. Build the production version (`tsc -b && vite build`)
2. Deploy to Firebase Hosting
3. Make your app live in ~2-3 minutes

### Access Your Application

**Production URL:** https://electric-abacus.web.app

**Alternative URL:** https://electric-abacus.firebaseapp.com

### Accessing from Tablet/Mobile

1. Open any browser on your device
2. Navigate to the production URL
3. Login with demo credentials (see Demo Accounts section below)
4. **Add to Home Screen** for app-like experience:
   - **iOS**: Tap Share → "Add to Home Screen"
   - **Android**: Tap Menu (⋮) → "Add to Home Screen"

### Firebase Console

View hosting metrics, rollback deployments, and manage settings:
https://console.firebase.google.com/project/electric-abacus/hosting

### Hosting Costs

Current configuration uses Firebase free tier:
- **Hosting**: 10GB storage, 360MB/day bandwidth (free)
- **Firestore**: 50k reads, 20k writes/day (free)
- **Auth**: 10k verifications/month (free)
- **Expected Cost**: $0/month for typical single-location usage

### Advanced Deployment

```bash
# Preview locally before deploying
npm run build
npm run preview  # Opens at http://localhost:4173

# Deploy specific services
npx firebase deploy --only hosting
npx firebase deploy --only firestore:rules

# View deployment history
npx firebase hosting:channel:list
```

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

- Admin: `admin@electricabacus.test` / `AdminPass123!`
- Staff: `staff@electricabacus.test` / `StaffPass123!`

## Environment Setup

Copy `.env.example` to `.env` and configure Firebase credentials.

## Testing

- Domain: 99% coverage on costing functions
- Unit tests: All passing
- E2E: 9 smoke tests passing
- Linting: Clean