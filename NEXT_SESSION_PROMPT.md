# Next Session: Post-Login UI Testing & Validation

## Current Status
✅ Firebase infrastructure is fully operational - Authentication and Firestore services enabled
✅ Seed script runs successfully and populates database with test data
✅ Core codebase issues resolved (path resolution, SDK configuration)
✅ Documentation updated with current project state

## Demo Credentials (Seeded in Firestore)
- **Owner**: `regan.owner@tacocasa.test` / `OwnerPass123!`
- **Team Member**: `taylor.team@tacocasa.test` / `TeamPass123!`

## Primary Objectives

### 1. **Login & Authentication Flow Testing**
- Start dev server with `npm run dev` and test login with both demo accounts
- Verify authentication state management and role-based routing works correctly
- Ensure profile data loads properly from Firestore after successful login
- Test logout functionality and auth state persistence

### 2. **Post-Login UI Functionality Validation**
Systematically test each authenticated screen with seeded data:

**Week Management**
- Week list page should show `2025-W39` (draft status) from seed data
- Week selection and navigation should work smoothly
- Verify role-based permissions (owner vs team member access)

**Sales Entry**
- Sales page should load with current week's sales structure
- Test daily sales input (Mon-Sun) with form validation
- Verify data persistence to Firestore `weeks/{weekId}/sales/daily`

**Inventory Tracking**
- Inventory page should display seeded ingredients: seasoned-beef, cheddar-cheese, flour-tortillas
- Test inventory input forms (begin/received/end values)
- Verify calculations and data persistence

**Ingredient Management**
- Ingredients page should list seeded ingredients with pricing/units
- Test CRUD operations on ingredients
- Verify ingredient versioning system works correctly

**Week Finalization (Owner Only)**
- Week review page should show cost calculations and summary
- Test finalization workflow with confirmation dialog
- Verify PDF export functionality
- Ensure proper role restrictions (team members cannot finalize)

### 3. **Data Integration & State Management**
- Verify React Query hooks are working correctly with live Firestore data
- Test optimistic updates and error handling in forms
- Ensure data consistency across different screens when navigating
- Check loading states and error boundaries are functioning

### 4. **UI/UX Polish**
- Verify Tailwind styling and shadcn components render correctly
- Test responsive design across different screen sizes
- Ensure consistent navigation and user feedback
- Validate form validation messages and user guidance

## Technical Notes

### Key Files to Monitor:
- `apps/web/src/app/components/auth/` - Authentication components
- `apps/web/src/app/(authenticated)/` - Protected route pages
- `packages/firebase/src/client.ts` - Firestore service layer
- `apps/web/src/app/hooks/` - React Query hooks

### Expected Behavior:
- All authenticated pages should load without console errors
- Data should be fetched correctly from seeded Firestore collections
- Form submissions should update Firestore in real-time
- Role-based access controls should be enforced on frontend and backend

### If Issues Are Found:
1. Check browser console for JavaScript errors
2. Verify Firestore security rules in Firebase Console
3. Test network requests in browser dev tools
4. Confirm React Query cache behavior and data flow

## Success Criteria
- [ ] Both demo accounts can log in successfully
- [ ] All authenticated pages render without errors
- [ ] Seeded data displays correctly throughout the application
- [ ] Form inputs successfully update Firestore
- [ ] Role-based permissions work as expected
- [ ] Week finalization flow (owner only) functions correctly
- [ ] No critical console errors or broken functionality

## Next Steps After Testing
Once UI validation is complete, the remaining tasks are:
- GitHub Actions CI pipeline setup
- Firebase emulator documentation for local development
- Production deployment preparation

---
*Generated after successful Firebase seed script resolution - ready for comprehensive post-login testing*