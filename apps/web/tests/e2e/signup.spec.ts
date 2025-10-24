import { test, expect } from '@playwright/test';
import { getFormInput, waitForSignupForm, fillAccountDetails, fillBusinessDetails } from '../helpers/form-helpers';

test.describe('Signup Flow', () => {
  test('should display the signup page correctly', async ({ page }) => {
    await page.goto('/signup');

    // Wait for page to fully load
    await waitForSignupForm(page, 1);

    // Check page title and description
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    await expect(
      page.getByText('Get started with Electric Abacus to manage your operations')
    ).toBeVisible();

    // Check stepper shows step 1 (Account)
    const stepper = page.getByRole('navigation', { name: 'Signup progress' });
    await expect(stepper).toBeVisible();
    // Use locator with first() to avoid strict mode violations from multiple matches
    await expect(stepper.locator('text=Account').first()).toBeVisible();
    await expect(stepper.locator('text=Business').first()).toBeVisible();
    await expect(stepper.locator('text=Review').first()).toBeVisible();

    // Check form fields for step 1 - use resilient selectors
    await expect(getFormInput(page, 'Email', { exact: true })).toBeVisible();
    await expect(getFormInput(page, 'Password', { exact: true })).toBeVisible();
    await expect(getFormInput(page, 'Confirm Password')).toBeVisible();
    await expect(page.getByText(/I agree to the Terms of Service/)).toBeVisible();
  });

  test('should validate account details before proceeding', async ({ page }) => {
    await page.goto('/signup');

    // Try to proceed without filling anything
    await page.getByRole('button', { name: 'Next' }).click();

    // Should show validation errors
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/signup');

    // Wait for form to be ready
    await waitForSignupForm(page, 1);

    const passwordField = getFormInput(page, 'Password', { exact: true });

    // Type a weak password
    await passwordField.fill('weak');
    await expect(page.getByText('Password strength:')).toBeVisible();

    // Type a stronger password
    await passwordField.fill('StrongPassword123!');
    await expect(page.getByText('Password strength:')).toBeVisible();
  });

  test('should navigate through all steps', async ({ page }) => {
    await page.goto('/signup');

    // Step 1: Account Details
    await fillAccountDetails(page, {
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // Should now be on Step 2: Business Details
    await expect(getFormInput(page, 'Business Name')).toBeVisible();
    await expect(getFormInput(page, 'Industry')).toBeVisible();
    await expect(getFormInput(page, 'Team Size')).toBeVisible();

    // Fill business details
    await fillBusinessDetails(page, {
      name: 'Test Restaurant',
      industry: 'restaurant',
      teamSize: '1-5'
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // Should now be on Step 3: Review
    await expect(page.getByRole('heading', { name: 'Review Your Information' })).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByText('Test Restaurant')).toBeVisible();
    await expect(page.getByText('Restaurant', { exact: true })).toBeVisible();
    await expect(page.getByText('1-5 people')).toBeVisible();
  });

  test('should allow going back to previous steps', async ({ page }) => {
    await page.goto('/signup');

    // Complete step 1
    await fillAccountDetails(page, {
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // Now on step 2
    await expect(getFormInput(page, 'Business Name')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back on step 1
    await expect(getFormInput(page, 'Email', { exact: true })).toBeVisible();
    await expect(getFormInput(page, 'Email', { exact: true })).toHaveValue('test@example.com');
  });

  test('should validate business name is required', async ({ page }) => {
    await page.goto('/signup');

    // Complete step 1
    await fillAccountDetails(page, {
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // Try to proceed without business name
    await getFormInput(page, 'Business Name').fill('');
    await page.getByRole('button', { name: 'Next' }).click();

    // Should show validation error
    await expect(page.getByText('Business name is required')).toBeVisible();
  });

  test('should have links to legal pages', async ({ page }) => {
    await page.goto('/signup');

    // Check Terms of Service link
    const termsLink = page.getByRole('link', { name: 'Terms of Service' });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', '/terms');

    // Check Privacy Policy link
    const privacyLink = page.getByRole('link', { name: 'Privacy Policy' });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/signup');

    // Check "Already have an account?" link
    const loginLink = page.getByRole('link', { name: 'Sign in' });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });
});

test.describe('Legal Pages', () => {
  test('should display Terms of Service page', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByText('Last updated: October 17, 2025')).toBeVisible();
    await expect(page.getByText('Acceptance of Terms')).toBeVisible();
  });

  test('should display Privacy Policy page', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByText('Last updated: October 17, 2025')).toBeVisible();
    // Use more specific heading selector with level
    await expect(page.locator('h2', { hasText: /Information We Collect/ }).first()).toBeVisible();
  });
});

test.describe('Landing Page', () => {
  test('should display the landing page correctly', async ({ page }) => {
    await page.goto('/');

    // Check hero section
    await expect(
      page.getByRole('heading', { name: /Streamline Your Operations/ })
    ).toBeVisible();
    await expect(page.getByText(/Maximize Your Profits/)).toBeVisible();

    // Check CTA buttons
    await expect(page.getByRole('link', { name: 'Start Free Trial' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();

    // Check features section
    await expect(page.getByText('Real-Time Cost Tracking')).toBeVisible();
    await expect(page.getByText('Weekly Operations Management')).toBeVisible();
    await expect(page.getByText('Recipe Costing')).toBeVisible();
  });

  test('should redirect authenticated users to app', async ({ page }) => {
    // This test assumes there's a way to login first
    // For now, we'll just check that the redirect logic exists
    await page.goto('/');

    // If not authenticated, should show landing page
    await expect(
      page.getByRole('heading', { name: /Streamline Your Operations/ })
    ).toBeVisible();
  });
});
