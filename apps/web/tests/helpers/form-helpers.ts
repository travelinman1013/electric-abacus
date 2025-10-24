import type { Page, Locator } from '@playwright/test';

/**
 * Get a form input using multiple fallback selector strategies
 * This is more resilient across different viewports and browsers
 *
 * @param page Playwright page
 * @param field Field identifier (e.g., 'Email', 'Password')
 * @param options Additional options for finding the input
 * @returns Locator for the input element
 *
 * @example
 * ```ts
 * const emailInput = await getFormInput(page, 'Email');
 * await emailInput.fill('test@example.com');
 * ```
 */
export function getFormInput(
  page: Page,
  field: 'Email' | 'Password' | 'Confirm Password' | 'Business Name' | 'Industry' | 'Team Size',
  options: { exact?: boolean } = {}
): Locator {
  // Strategy 1: Try by label (best for accessibility, but may fail on mobile)
  // Strategy 2: Fall back to type + placeholder
  // Strategy 3: Fall back to id selector

  const exact = options.exact ?? false;

  // Map fields to their attributes for resilient selection
  const fieldMap: Record<string, { type?: string; placeholder?: string; id?: string }> = {
    'Email': {
      type: 'email',
      placeholder: 'you@example.com',
      id: 'email'
    },
    'Password': {
      type: 'password',
      placeholder: 'Create a strong password',
      id: 'password'
    },
    'Confirm Password': {
      type: 'password',
      placeholder: 'Re-enter your password',
      id: 'confirmPassword'
    },
    'Business Name': {
      type: 'text',
      placeholder: 'My Restaurant',
      id: 'businessName'
    },
    'Industry': {
      id: 'industry'
    },
    'Team Size': {
      id: 'teamSize'
    },
  };

  const attrs = fieldMap[field];

  if (!attrs) {
    throw new Error(`Unknown field: ${field}`);
  }

  // For mobile compatibility, prioritize direct selectors over label association
  if (attrs.id) {
    return page.locator(`#${attrs.id}`);
  }

  if (attrs.type && attrs.placeholder) {
    return page.locator(`input[type="${attrs.type}"][placeholder*="${attrs.placeholder}"]`).first();
  }

  if (attrs.type) {
    return page.locator(`input[type="${attrs.type}"]`).first();
  }

  // Last resort: try by label
  return page.getByLabel(field, { exact });
}

/**
 * Wait for signup form to be ready
 * Ensures all form elements are loaded and visible
 */
export async function waitForSignupForm(page: Page, step: 1 | 2 | 3 = 1) {
  if (step === 1) {
    // Wait for step 1 (account details) to load
    await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
  } else if (step === 2) {
    // Wait for step 2 (business details) to load
    await page.waitForSelector('#businessName', { state: 'visible', timeout: 10000 });
  } else if (step === 3) {
    // Wait for step 3 (review) to load
    await page.waitForSelector('text=Review Your Information', { state: 'visible', timeout: 10000 });
  }
}

/**
 * Fill signup form step 1 (account details)
 * Handles viewport-specific quirks
 */
export async function fillAccountDetails(
  page: Page,
  data: {
    email: string;
    password: string;
    confirmPassword: string;
  }
) {
  await waitForSignupForm(page, 1);

  await getFormInput(page, 'Email', { exact: true }).fill(data.email);
  await getFormInput(page, 'Password', { exact: true }).fill(data.password);
  await getFormInput(page, 'Confirm Password').fill(data.confirmPassword);

  // Check the terms checkbox
  await page.getByRole('checkbox').check();
}

/**
 * Fill signup form step 2 (business details)
 */
export async function fillBusinessDetails(
  page: Page,
  data: {
    name: string;
    industry: string;
    teamSize: string;
  }
) {
  await waitForSignupForm(page, 2);

  await getFormInput(page, 'Business Name').fill(data.name);
  await getFormInput(page, 'Industry').selectOption(data.industry);
  await getFormInput(page, 'Team Size').selectOption(data.teamSize);
}
