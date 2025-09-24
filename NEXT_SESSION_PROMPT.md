# Next Session Context - Taco Casa Digital Solution

## Priority Fixes Required

### 1. Ingredients Page - Form Not Working
**Issue**: The ingredients page forms are not rendering properly. The Select component appears to be causing issues.

**Location**: `apps/web/src/app/features/ingredients/ingredients-page.tsx`

**Symptoms**:
- Category select dropdown not rendering correctly
- Form submission blocked
- Likely incompatibility between our Select component and react-hook-form's register

**Fix needed**:
- Check lines 278-282 and 370-374 where Select components are used for category
- Consider using Controller from react-hook-form for Select components
- Ensure the Select component properly forwards refs

### 2. Menu Items Page - Buttons Not Responding
**Issue**: "Add ingredient" and "Update menu item" buttons are not functioning

**Location**: `apps/web/src/app/features/menu-items/menu-items-page.tsx`

**Symptoms**:
- "Add ingredient" button (line 402) does nothing when clicked
- "Update menu item" button in edit form not submitting
- Likely related to form watch dependencies in useMemo hooks

**Fix needed**:
- Check the handleAddRecipeRow function (line 195)
- Review form.watch usage in useMemo (lines 118-128)
- Ensure proper dependency arrays in hooks

## What Was Just Completed

### Recipe Costing System
Successfully implemented dynamic recipe costing with:
- Real-time cost calculation as ingredients are added/modified
- Food cost percentage with color coding (green <30%, yellow 30-35%, red >35%)
- Enhanced recipe tables with unit cost and line total columns
- Recipe total footer rows
- Ingredient categorization (food/paper/other)

### Domain Package Updates
- Added `calculateRecipeCost`, `calculateFoodCostPercentage`, `calculateRecipeCostWithPercentage` functions
- Extended types: MenuItem with sellingPrice, Ingredient with category
- 99% test coverage with 15 new tests

### Firebase Integration
- Updated all services to handle new fields (sellingPrice, category)
- Backward compatible with existing data

## Technical Context

### Key Files Modified
1. `packages/domain/src/types.ts` - Added IngredientCategory type, extended interfaces
2. `packages/domain/src/costing.ts` - New recipe costing functions
3. `apps/web/src/app/features/menu-items/menu-items-page.tsx` - Recipe costing UI
4. `apps/web/src/app/features/ingredients/ingredients-page.tsx` - Category field
5. `apps/web/src/app/services/firestore/*.ts` - Firebase service updates

### Dependencies to Watch
- React Hook Form for form management
- Our custom Select component vs native HTML select
- Form watch() creating new references on each render

## Testing the Fixes

1. Start dev server: `npm run dev`
2. Login as owner: `regan.owner@tacocasa.test` / `OwnerPass123!`
3. Test Ingredients page:
   - Should be able to create new ingredients with category
   - Should be able to edit existing ingredients
4. Test Menu Items page:
   - "Add ingredient" should add new recipe rows
   - Forms should submit properly
   - Recipe costs should update in real-time

## Success Criteria

1. Ingredients page fully functional with category selection
2. Menu items page buttons working (add ingredient, update)
3. No console errors
4. Forms submit and save to Firebase
5. Real-time cost calculations continue working

## Additional Context

- The dev server uses Vite with HMR, no restart needed
- TypeScript build has some errors but dev server works
- Domain package tests all passing
- Firebase is properly configured and seeded
