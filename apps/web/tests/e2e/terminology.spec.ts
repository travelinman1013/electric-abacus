import { test, expect } from '@playwright/test';

/**
 * E2E tests for business terminology customization feature
 *
 * Tests verify that:
 * 1. Owners can customize terminology and see changes reflected across the app
 * 2. Owners can reset terminology to defaults
 * 3. Team members are blocked from accessing terminology settings
 */

test.describe('Business Terminology Customization', () => {
  test.describe('Owner: Customize and verify terminology', () => {
    test('Owner can navigate to terminology settings and customize terms', async ({ page }) => {
      // Login as owner
      await page.goto('/');
      await page.getByLabel('Email').fill('admin@electricabacus.test');
      await page.getByLabel('Password').fill('AdminPass123!');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Wait for authentication and redirect to dashboard
      await expect(page).toHaveURL(/\/app\/weeks/);

      // Navigate to Settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page).toHaveURL(/\/app\/settings/);

      // Navigate to Business Terminology settings
      await page.getByRole('link', { name: /terminology/i }).click();
      await expect(page).toHaveURL(/\/app\/settings\/terminology/);

      // Verify we're on the terminology settings page
      await expect(page.getByRole('heading', { name: /business terminology/i })).toBeVisible();

      // Change 'Ingredients' to 'Stock Items'
      const ingredientsInput = page.getByLabel(/^Ingredients \(plural\)/i);
      await ingredientsInput.clear();
      await ingredientsInput.fill('Stock Items');

      // Change 'Ingredient' (singular) to 'Stock Item'
      const ingredientInput = page.getByLabel(/^Ingredient \(singular\)/i);
      await ingredientInput.clear();
      await ingredientInput.fill('Stock Item');

      // Save the changes
      await page.getByRole('button', { name: /save/i }).click();

      // Wait for success message
      await expect(page.getByText(/terminology updated successfully/i)).toBeVisible();

      // Navigate to ingredients page
      await page.getByRole('link', { name: /stock items/i }).click();
      await expect(page).toHaveURL(/\/app\/ingredients/);

      // Verify the page heading uses the custom term
      await expect(page.getByRole('heading', { name: /stock item catalog/i })).toBeVisible();

      // Verify the button uses custom term
      await expect(page.getByRole('button', { name: /create stock item/i })).toBeVisible();

      // Verify the table header uses custom term
      await expect(page.getByRole('table')).toContainText(/current stock items/i);
    });
  });

  test.describe('Owner: Reset terminology to defaults', () => {
    test('Owner can reset customized terminology back to defaults', async ({ page }) => {
      // Login as owner
      await page.goto('/');
      await page.getByLabel('Email').fill('admin@electricabacus.test');
      await page.getByLabel('Password').fill('AdminPass123!');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Wait for authentication
      await expect(page).toHaveURL(/\/app\/weeks/);

      // First, customize the terminology
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.getByRole('link', { name: /terminology/i }).click();
      await expect(page).toHaveURL(/\/app\/settings\/terminology/);

      // Change 'Menu Items' to 'Products'
      const menuItemsInput = page.getByLabel(/^Menu Items \(plural\)/i);
      await menuItemsInput.clear();
      await menuItemsInput.fill('Products');

      const menuItemInput = page.getByLabel(/^Menu Item \(singular\)/i);
      await menuItemInput.clear();
      await menuItemInput.fill('Product');

      // Save
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(/terminology updated successfully/i)).toBeVisible();

      // Verify the change took effect in navigation
      await expect(page.getByRole('link', { name: /^products$/i })).toBeVisible();

      // Now reset to defaults
      await page.getByRole('button', { name: /reset to defaults/i }).click();

      // Confirm the reset dialog
      page.once('dialog', dialog => {
        expect(dialog.message()).toContain('reset all terminology to defaults');
        dialog.accept();
      });

      // Wait for success message
      await expect(page.getByText(/terminology reset to defaults/i)).toBeVisible();

      // Verify fields are back to defaults
      await expect(menuItemsInput).toHaveValue('Menu Items');
      await expect(menuItemInput).toHaveValue('Menu Item');

      // Verify navigation shows default term
      await expect(page.getByRole('link', { name: /^menu items$/i })).toBeVisible();

      // Navigate to menu items page and verify heading is back to default
      await page.getByRole('link', { name: /^menu items$/i }).click();
      await expect(page).toHaveURL(/\/app\/menu-items/);
      await expect(page.getByRole('heading', { name: /menu items & recipes/i })).toBeVisible();
    });
  });

  test.describe('Team Member: Access control', () => {
    test('Team member is redirected or blocked from accessing terminology settings', async ({ page }) => {
      // Login as team member
      await page.goto('/');
      await page.getByLabel('Email').fill('staff@electricabacus.test');
      await page.getByLabel('Password').fill('StaffPass123!');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Wait for authentication
      await expect(page).toHaveURL(/\/app\/weeks/);

      // Try to directly navigate to terminology settings
      await page.goto('/app/settings/terminology');

      // Should be redirected away from the terminology settings page
      // RoleGuard should redirect to default authenticated path (weeks page)
      await expect(page).toHaveURL(/\/app\/weeks/);

      // Verify we're NOT on the terminology settings page
      await expect(page.getByRole('heading', { name: /business terminology/i })).not.toBeVisible();

      // Verify we're back on the weeks page
      await expect(page.getByRole('heading', { name: /weekly operations/i })).toBeVisible();
    });
  });
});
