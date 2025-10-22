# Project Context

## Purpose

Electric Abacus is a multi-tenant SaaS application for weekly operations management in the food service industry. The system provides comprehensive business operations tools including:

- Real-time recipe costing with dynamic ingredient price tracking
- Food cost percentage analysis with color-coded thresholds
- Weekly inventory tracking with usage calculations
- Sales data entry and reporting (food/drink sales with tax/promo deductions)
- Ingredient management with version history
- Menu item recipes with cost analysis
- Week finalization with PDF export capabilities

The application emphasizes complete data isolation between businesses, with users able to belong to multiple businesses with different roles.

## Tech Stack

### Frontend
- **React 19.1** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 7.1** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Tailwind CSS 3.4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **TanStack Query (React Query) v5** - Server state management
- **Lucide React** - Icon library
- **@react-pdf/renderer** - PDF generation

### Backend & Infrastructure
- **Firebase 12.3**
  - Authentication (with custom claims)
  - Firestore (NoSQL database)
  - Cloud Functions (user onboarding)
  - Hosting (static site deployment)
- **Firebase Admin SDK** - Server-side operations

### Testing
- **Vitest 3.2** - Unit testing framework
- **Playwright 1.55** - E2E testing
- **Testing Library** - React component testing
- **jsdom** - DOM simulation

### Development Tools
- **ESLint 9** - Linting (with TypeScript and React plugins)
- **Prettier 3.2** - Code formatting
- **npm workspaces** - Monorepo management
- **tsx** - TypeScript execution

### Monorepo Structure
- `apps/web` - React frontend application
- `packages/domain` - Pure business logic (no dependencies)
- `packages/firebase` - Firestore rules, admin utilities, seed scripts

## Project Conventions

### Code Style

**TypeScript Configuration:**
- Strict mode enabled
- ESNext module system with bundler resolution
- Path aliases: `@/` prefix for absolute imports
- Verbatim module syntax for better ESM compatibility
- No emit (handled by Vite)

**Naming Conventions:**
- Components: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`, `useBusiness.ts`)
- Utilities: camelCase (`formatCurrency.ts`)
- Types/Interfaces: PascalCase (`MenuItemRecipe`, `WeekData`)
- Constants: UPPER_SNAKE_CASE or camelCase depending on context
- Feature directories: kebab-case (`menu-items/`, `week-review/`)

**File Organization:**
- Feature-based structure under `src/app/features/`
- Each feature contains: components, hooks, types, utilities
- Shared components in `src/app/components/`
- Global types in `src/app/types/`
- Providers in `src/app/providers/`

**Code Formatting:**
- Prettier for consistent formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline structures
- Max line length: 100 characters (soft limit)

**ESLint Rules:**
- Zero warnings policy (`--max-warnings=0`)
- React hooks rules enforced
- TypeScript strict rules
- Tailwind CSS plugin for class name validation
- Prettier integration (no conflicts)

### Architecture Patterns

**Multi-Tenant Architecture:**
- Custom claims-based authentication: `{ businessId, role }`
- Complete data isolation per business
- Collection structure: `/businesses/{businessId}/{collection}/{docId}`
- Firestore security rules enforce tenant boundaries
- Cloud Functions set custom claims on user creation

**Frontend Architecture:**
- Provider hierarchy: QueryClient → AuthProvider → BusinessProvider → App
- React Query for all server state (no local state for Firestore data)
- Optimistic updates for better UX
- Protected routes with role-based guards
- Feature-based code organization

**State Management:**
- Server state: React Query (Firestore operations)
- Auth state: AuthProvider context (Firebase Auth)
- Business context: BusinessProvider (custom claims from token)
- Form state: React Hook Form (with Zod validation)
- No global UI state management (React Context sufficient)

**Domain Package Philosophy:**
- Pure functions with no external dependencies
- Business logic separated from framework code
- Unit testable with 99% coverage requirement
- Core functions:
  - `computeUsage()` - Inventory calculations
  - `computeCostOfSales()` - Cost breakdowns
  - `calculateRecipeCost()` - Recipe costing with unit conversions
  - `calculateFoodCostPercentage()` - Margin analysis
  - `calculateBatchIngredientCost()` - Batch recipe costs

**Component Patterns:**
- Composition over inheritance
- Compound components for complex UI (using Radix primitives)
- Custom hooks for reusable logic
- Props interfaces exported alongside components
- Controlled components for forms (React Hook Form)

**Styling Approach:**
- Tailwind utility classes (primary method)
- CSS variables for theming (HSL color system)
- `cn()` utility for conditional classes (clsx + tailwind-merge)
- Dark mode support via class-based strategy
- Responsive-first design (mobile → desktop)

### Testing Strategy

**Unit Testing (Vitest):**
- Domain package: 99% coverage requirement
- Pure function testing with comprehensive edge cases
- Component testing with Testing Library
- Mock Firebase services for frontend tests
- Coverage reporting with v8

**E2E Testing (Playwright):**
- 9 critical user flow smoke tests
- Auth flows (login, signup, role-based access)
- CRUD operations (ingredients, menu items, weeks)
- Report generation and PDF export
- Auto-start dev server for test runs

**Testing Commands:**
- `npm run test:unit` - Run all unit tests with coverage
- `npm run test:watch` - Watch mode for TDD
- `npm run test:e2e` - Full E2E test suite
- `npm run lint` - Zero warnings enforcement

**Test Organization:**
- Domain tests: Co-located with functions (`*.test.ts`)
- Component tests: Co-located with components (`*.test.tsx`)
- E2E tests: `apps/web/tests/` directory
- Setup files: `vitest.setup.ts`, `playwright.config.ts`

### Git Workflow

**Branching Strategy:**
- Main branch: `main` (production-ready)
- Feature branches: `feat/descriptive-name`
- Bug fixes: `fix/issue-description`
- Performance: `perf/optimization-name`
- No direct commits to main

**Commit Conventions:**
- Semantic commit messages (loosely following Conventional Commits)
- Common prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `perf:`
- Concise subject line (1-2 sentences)
- Focus on "why" rather than "what"
- Examples:
  - `feat: add comprehensive user preferences and theming system`
  - `fix: rebuild recipe table with proper column alignment`
  - `perf: optimize Firebase instance management`

**Pre-Deployment Checks:**
- Linting must pass (zero warnings)
- Unit tests must pass with coverage
- E2E tests should pass for critical flows
- Build must succeed without errors
- TypeScript compilation must succeed

## Domain Context

### Restaurant/Food Service Operations

**Weekly Operations Cycle:**
1. **Week Start**: Create new week with beginning inventory
2. **Daily Operations**: Record sales, track inventory received
3. **Week End**: Final inventory count, usage calculations
4. **Week Finalization**: Cost analysis, PDF report generation

**Food Cost Management:**
- Target food cost percentage: <30% (excellent), 30-35% (acceptable), >35% (needs adjustment)
- Cost of sales = beginning inventory + received - ending inventory
- Food cost % = (cost of sales / net sales) × 100
- Ingredient categorization: food, paper, other (only food counts toward food cost)

**Recipe Costing:**
- Recipes contain multiple ingredients with quantities
- Each ingredient has: unit cost, measurement unit, category
- Recipe total cost = sum of (ingredient cost × quantity × conversion factor)
- Batch ingredients: Pre-made components with their own recipes
- Unit conversions: Standard units (oz, lb, gal, qt, pt, cup, etc.)

**Inventory Tracking:**
- Three snapshots per week: beginning, received, ending
- Usage = beginning + received - ending
- Cost = usage × unit cost (from ingredient snapshot)
- Snapshots preserve ingredient prices at time of week start

**User Roles:**
- **Owner**: Full access (ingredients, menu items, week review, settings)
- **Team Member**: Limited access (weeks list, sales entry, inventory tracking)

### Business Rules

- Each business is completely isolated (no data sharing)
- Ingredient prices frozen at week start (snapshot-based)
- Weeks can be finalized only once (immutable after finalization)
- PDF reports generated on finalization
- Historical data preserved via ingredient version history
- Food cost percentage excludes paper and other categories

## Important Constraints

### Technical Constraints

**Firebase Free Tier Limits:**
- Hosting: 10GB storage, 360MB/day bandwidth
- Firestore: 50k reads, 20k writes, 1GB storage per day
- Authentication: 10k verifications/month
- Design for efficiency (minimize redundant queries, use pagination)

**Performance Requirements:**
- Page load: <3 seconds on 3G connection
- Recipe cost updates: Real-time (<100ms)
- PDF generation: <5 seconds for typical week
- Optimistic UI updates for better perceived performance

**Browser Support:**
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- Mobile Safari and Chrome (iOS/Android)
- No IE11 support required
- Progressive Web App capabilities (add to home screen)

### Business Constraints

**Data Integrity:**
- Finalized weeks are immutable (prevent historical data corruption)
- Ingredient version history must be maintained
- Cost snapshots must be accurate at week creation time
- User permissions strictly enforced via Firestore rules

**Regulatory:**
- User data privacy (no PII sharing between businesses)
- Password strength requirements enforced
- Secure authentication (Firebase Auth handles compliance)

**Operational:**
- Single-location usage expected (free tier sufficient)
- Designed for weekly operational cadence
- PDF reports for record-keeping and audits

## External Dependencies

### Firebase Services

**Authentication:**
- Email/password authentication
- Custom claims for multi-tenancy: `{ businessId, role }`
- Token refresh for claims updates
- User profile management

**Firestore Database:**
- NoSQL document database
- Real-time listeners for live updates
- Security rules for tenant isolation
- Subcollection structure: `/businesses/{businessId}/{collections}`
- Key collections: `ingredients`, `menuItems`, `weeks`, `users`, `businesses`

**Cloud Functions:**
- `onUserCreate`: Sets up new business and custom claims
- Deployed region: us-central1
- Node.js runtime

**Hosting:**
- Static site hosting for React SPA
- Production URL: https://electric-abacus.web.app
- Automatic SSL/CDN
- Deploy via: `npm run deploy`

### External Libraries

**UI Components:**
- Radix UI: Accessible primitives (dialogs, checkboxes, progress bars)
- Class Variance Authority: Component variant management
- Tailwind Merge: Conflict-free class merging

**Utilities:**
- zxcvbn-typescript: Password strength estimation
- date-fns (via domain package): Date manipulation
- PDF generation: @react-pdf/renderer

**Development:**
- Firebase Tools CLI: Deployment and emulator
- TypeScript: Type checking and compilation
- Vite: Dev server and production builds

### Integration Points

**Firebase Console:**
- https://console.firebase.google.com/project/electric-abacus
- Monitoring, user management, database queries
- Deployment history and rollbacks

**Package Manager:**
- npm 10.5.0 (specified in package.json)
- Workspace-aware commands
- Shared dependencies hoisted to root

**Deployment Pipeline:**
1. `npm run build` → TypeScript compilation + Vite build
2. `firebase deploy --only hosting` → Upload to Firebase CDN
3. Live in ~2-3 minutes
