# Next Session Context: Taco Ray v2 Development

## 🎯 **Current Project State (Sep 2025)**

You are continuing development on **Taco Ray v2**, a React + Firebase + TypeScript monorepo for restaurant weekly operations management. The project is on the `main` branch with comprehensive testing infrastructure **recently completed**.

### ✅ **What's Already Working**

1. **Testing Infrastructure** (JUST COMPLETED - Sep 2025)
   - ✅ Playwright E2E tests (9/9 passing) - expect collision RESOLVED
   - ✅ Vitest unit tests (6/6 passing) - domain ≥90% coverage
   - ✅ WeekReviewPage component tests with finalization logic
   - ✅ Firestore security rule tests with finalize behavior coverage
   - ✅ ESLint flat config across all workspaces

2. **Core Architecture**
   - ✅ Firebase auth with role-based guards (owner/teamMember)
   - ✅ React Router with protected routes and layouts
   - ✅ React Query for state management
   - ✅ Tailwind + shadcn UI components
   - ✅ Domain costing library with comprehensive business logic

3. **Finalization Flow**
   - ✅ `finalizeWeek` transaction in `apps/web/src/app/services/firestore/weeks.ts:252-345`
   - ✅ WeekReviewPage UI with owner-only finalize button
   - ✅ Cost snapshot generation and report summary computation
   - ✅ Firestore security rules preventing edits to finalized weeks

4. **Data Management**
   - ✅ Week, sales, inventory, ingredient, and menu item CRUD
   - ✅ Firebase client/admin helpers and seed script
   - ✅ Type-safe domain models and validation

## 🚧 **What Needs Implementation**

### **Priority 1: Finalize UX Validation**
```
TASK: Improve the week finalization user experience
LOCATION: apps/web/src/app/features/weeks/week-review-page.tsx
ISSUES:
- Need real Firestore data testing of finalizeWeek transaction
- Flesh out error handling with user-friendly messages
- Surface cost snapshot metadata (ingredient version provenance) in UI
- Add loading states and better feedback during finalization
- Consider adding confirmation dialog before finalizing
```

### **Priority 2: PDF Export Implementation**
```
TASK: Implement PDF export functionality for finalized weeks
LOCATION: apps/web/src/app/features/weeks/week-review-page.tsx:203-205
STATUS: Button exists but disabled with "Export PDF (coming soon)" text
REQUIREMENTS:
- Use @react-pdf/renderer (already installed)
- Generate PDF with cost breakdown, ingredient usage, and summary data
- Include week metadata (dates, finalized by, etc.)
- Style consistently with existing UI design
- Add download functionality and loading states
```

### **Priority 3: Enhanced Testing**
```
TASK: Add missing test coverage areas
AREAS:
1. Integration tests for finalizeWeek transaction with real Firestore
2. Component tests for sales/inventory hooks and error scenarios
3. E2E test for complete finalize workflow (requires auth setup)
4. Firebase rule tests execution (currently requires emulator setup)
```

### **Priority 4: Operations & Deployment**
```
TASKS:
1. GitHub Actions CI pipeline configuration
2. Firebase deployment automation
3. Environment configuration documentation
4. Architecture documentation and diagrams
```

## 📁 **Key File Locations**

### **Critical Business Logic**
- `packages/domain/src/costing.ts` - Core costing calculations
- `apps/web/src/app/services/firestore/weeks.ts` - Week finalization transaction
- `packages/firebase/firestore.rules` - Security rules with finalize restrictions

### **UI Components**
- `apps/web/src/app/features/weeks/week-review-page.tsx` - Main finalization UI
- `apps/web/src/app/features/weeks/week-list-page.tsx` - Week management
- `apps/web/src/app/hooks/use-weeks.ts` - Week-related React Query hooks

### **Testing**
- `apps/web/tests/e2e/finalize-week.spec.ts` - E2E smoke tests
- `apps/web/src/app/features/weeks/week-review-page.test.tsx` - Component tests
- `packages/firebase/tests/firestore.rules.test.ts` - Security rule tests

## 🔧 **Development Commands**

```bash
# Development server
npm run dev

# Testing
npm run test:unit    # Domain + web unit tests
npm run test:e2e     # Playwright E2E tests (9 tests)
npm run lint         # ESLint across workspaces

# Database
npm run seed         # Populate Firebase with demo data
```

## 🏗️ **Architecture Overview**

```
taco-ray-v2/
├── apps/web/               # React frontend
│   ├── src/app/features/   # Feature-based organization
│   ├── tests/e2e/         # Playwright tests
│   └── playwright.config.ts # E2E test config (JUST ADDED)
├── packages/
│   ├── domain/            # Pure TypeScript business logic
│   └── firebase/          # Client/admin wrappers + rules
└── firestore.rules        # Database security rules
```

## 🎭 **User Roles & Permissions**

- **Owner**: Full access, can finalize weeks, manage ingredients/menu items
- **Team Member**: Can edit sales/inventory for draft weeks only
- **Finalized weeks**: Immutable for all users (enforced by Firestore rules)

## 📊 **Recent Testing Infrastructure Resolution**

**CONTEXT**: The previous session completely resolved a major blocking issue:

- **Problem**: `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`
- **Root Cause**: Playwright and Vitest expect globals collision
- **Solution**: Created isolated `playwright.config.ts` and fixed Vite alias conflicts
- **Result**: All tests now pass, infrastructure is stable

## 🚀 **Recommended Next Steps**

1. **Start with Priority 1** - Improve finalization UX with better error handling
2. **Add real data testing** - Use seed script to test finalization with actual Firebase data
3. **Implement PDF export** - High-value feature that's partially scaffolded
4. **Expand test coverage** - Build on the solid testing foundation

## 💡 **Important Notes**

- **Firebase emulator** required for Firestore rule tests execution
- **Authentication** already implemented but E2E tests need auth setup for full workflow
- **Domain coverage** enforced at ≥90% - maintain this standard
- **ESLint** is strict - some test files may need minor fixes for compliance
- **Pre-commit hooks** run prettier + eslint - ensure code quality

---

## 📋 **Quick Start Checklist for Next Session**

1. ✅ Verify all tests pass: `npm run test:unit && npm run test:e2e && npm run lint`
2. ✅ Start dev server: `npm run dev`
3. ✅ Review finalization flow in WeekReviewPage component
4. ⏳ Choose Priority 1 task and begin implementation
5. ⏳ Add comprehensive error handling to finalization UX
6. ⏳ Consider PDF export implementation planning

The testing infrastructure is solid - focus on building features with confidence! 🎯