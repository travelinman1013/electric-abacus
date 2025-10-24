import { test, expect, type Page } from '@playwright/test';

/**
 * Common viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  mobile: {
    small: { width: 375, height: 667 }, // iPhone SE
    medium: { width: 390, height: 844 }, // iPhone 12
    large: { width: 428, height: 926 }, // iPhone 14 Pro Max
  },
  tablet: {
    portrait: { width: 768, height: 1024 }, // iPad
    landscape: { width: 1024, height: 768 }, // iPad landscape
    pro: { width: 1024, height: 1366 }, // iPad Pro
  },
  desktop: {
    small: { width: 1280, height: 720 }, // HD
    medium: { width: 1440, height: 900 }, // MacBook Pro
    large: { width: 1920, height: 1080 }, // Full HD
    xlarge: { width: 2560, height: 1440 }, // 2K
  },
} as const;

/**
 * Test a page at multiple viewports
 * @param testName Name/description for the test
 * @param viewportSizes Array of viewport sizes to test
 * @param testFn Test function to run at each viewport
 * @example
 * ```ts
 * test.describe('Responsive Layout', () => {
 *   testAtViewports(
 *     'landing page',
 *     [VIEWPORTS.mobile.medium, VIEWPORTS.tablet.portrait, VIEWPORTS.desktop.medium],
 *     async ({ page, viewport }) => {
 *       await page.goto('/');
 *       await expect(page.getByRole('heading')).toBeVisible();
 *     }
 *   );
 * });
 * ```
 */
export function testAtViewports(
  testName: string,
  viewportSizes: Array<{ width: number; height: number }>,
  testFn: (args: { page: Page; viewport: { width: number; height: number } }) => Promise<void>
) {
  for (const viewport of viewportSizes) {
    test(`${testName} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await testFn({ page, viewport });
    });
  }
}

/**
 * Helper to check if an element is visible at a specific viewport
 */
export async function expectVisibleAt(
  page: Page,
  selector: string,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Helper to check if an element is hidden at a specific viewport
 */
export async function expectHiddenAt(
  page: Page,
  selector: string,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  await expect(page.locator(selector)).not.toBeVisible();
}

/**
 * Test responsive visibility of an element across viewports
 * @param page Playwright page
 * @param selector Element selector
 * @param visibleAt Viewports where element should be visible
 * @param hiddenAt Viewports where element should be hidden
 */
export async function testResponsiveVisibility(
  page: Page,
  selector: string,
  options: {
    visibleAt?: Array<{ width: number; height: number }>;
    hiddenAt?: Array<{ width: number; height: number }>;
  }
) {
  if (options.visibleAt) {
    for (const viewport of options.visibleAt) {
      await expectVisibleAt(page, selector, viewport);
    }
  }

  if (options.hiddenAt) {
    for (const viewport of options.hiddenAt) {
      await expectHiddenAt(page, selector, viewport);
    }
  }
}

/**
 * Capture and compare screenshots at different viewports
 * @param page Playwright page
 * @param name Screenshot name (without extension)
 * @param viewports Array of viewports to test
 */
export async function compareScreenshotsAtViewports(
  page: Page,
  name: string,
  viewports: Array<{ width: number; height: number; label?: string }>
) {
  const results = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const label = viewport.label || `${viewport.width}x${viewport.height}`;
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
    });
    results.push({
      viewport,
      label,
      screenshot,
    });
  }

  return results;
}

/**
 * Check for layout shifts when resizing viewport
 * @param page Playwright page
 * @param fromViewport Starting viewport
 * @param toViewport Ending viewport
 * @param selector Element to check for position changes
 */
export async function checkLayoutShift(
  page: Page,
  fromViewport: { width: number; height: number },
  toViewport: { width: number; height: number },
  selector: string
) {
  await page.setViewportSize(fromViewport);
  await page.waitForLoadState('networkidle');

  const initialBox = await page.locator(selector).boundingBox();

  await page.setViewportSize(toViewport);
  await page.waitForLoadState('networkidle');

  const finalBox = await page.locator(selector).boundingBox();

  return {
    shifted: initialBox?.x !== finalBox?.x || initialBox?.y !== finalBox?.y,
    initialBox,
    finalBox,
  };
}

/**
 * Test navigation menu responsiveness
 * Checks if navigation collapses to mobile menu on small screens
 */
export async function testNavigationResponsiveness(
  page: Page,
  desktopNavSelector: string,
  mobileMenuSelector: string
) {
  // Desktop: nav visible, mobile menu hidden
  await page.setViewportSize(VIEWPORTS.desktop.medium);
  await expect(page.locator(desktopNavSelector)).toBeVisible();
  await expect(page.locator(mobileMenuSelector)).not.toBeVisible();

  // Mobile: nav hidden, mobile menu visible
  await page.setViewportSize(VIEWPORTS.mobile.medium);
  await expect(page.locator(desktopNavSelector)).not.toBeVisible();
  await expect(page.locator(mobileMenuSelector)).toBeVisible();
}

/**
 * Test table overflow behavior on mobile
 */
export async function testTableOverflow(page: Page, tableSelector: string) {
  await page.setViewportSize(VIEWPORTS.mobile.medium);

  const table = page.locator(tableSelector);
  const tableBox = await table.boundingBox();
  const viewportSize = page.viewportSize();

  if (tableBox && viewportSize) {
    // Table should not exceed viewport width
    expect(tableBox.width).toBeLessThanOrEqual(viewportSize.width);

    // Check if table has horizontal scroll
    const hasOverflow = await table.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    return { hasOverflow, tableWidth: tableBox.width, viewportWidth: viewportSize.width };
  }

  return null;
}

/**
 * Test form layout at different viewports
 */
export async function testFormLayout(
  page: Page,
  formSelector: string,
  options: {
    stacksOnMobile?: boolean; // Forms should stack vertically on mobile
    fullWidthOnMobile?: boolean; // Form inputs should be full width on mobile
  } = {}
) {
  const form = page.locator(formSelector);

  // Desktop: form may have multi-column layout
  await page.setViewportSize(VIEWPORTS.desktop.medium);
  const desktopBox = await form.boundingBox();

  // Mobile: form should adapt
  await page.setViewportSize(VIEWPORTS.mobile.medium);
  const mobileBox = await form.boundingBox();
  const viewportSize = page.viewportSize();

  const results = {
    desktop: desktopBox,
    mobile: mobileBox,
    fitsInViewport: mobileBox && viewportSize ? mobileBox.width <= viewportSize.width : false,
  };

  if (options.stacksOnMobile) {
    // On mobile, form height should be greater (elements stacked)
    if (desktopBox && mobileBox) {
      expect(mobileBox.height).toBeGreaterThan(desktopBox.height);
    }
  }

  if (options.fullWidthOnMobile) {
    // Check if input fields are full width on mobile
    // Only check visible text/email/password inputs (not hidden checkbox inputs)
    const inputs = form.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const isVisible = await input.isVisible();
      if (!isVisible) continue; // Skip hidden inputs

      const inputBox = await input.boundingBox();
      const viewportWidth = viewportSize?.width;

      if (inputBox && viewportWidth) {
        // Input should use most of the viewport width (accounting for form padding)
        // More lenient check: at least 70% of viewport or 80% of available width after padding
        const widthRatio = inputBox.width / viewportWidth;
        expect(widthRatio).toBeGreaterThan(0.7); // At least 70% of viewport width
      }
    }
  }

  return results;
}

/**
 * Test modal/dialog responsiveness
 */
export async function testModalResponsiveness(
  page: Page,
  modalSelector: string,
  options: {
    fullscreenOnMobile?: boolean;
    centered?: boolean;
  } = {}
) {
  const modal = page.locator(modalSelector);

  // Desktop: modal centered and sized appropriately
  await page.setViewportSize(VIEWPORTS.desktop.medium);
  const desktopBox = await modal.boundingBox();
  const desktopViewport = page.viewportSize();

  // Mobile: modal adapts
  await page.setViewportSize(VIEWPORTS.mobile.medium);
  const mobileBox = await modal.boundingBox();
  const mobileViewport = page.viewportSize();

  const results = {
    desktop: {
      box: desktopBox,
      viewport: desktopViewport,
      isCentered: false,
    },
    mobile: {
      box: mobileBox,
      viewport: mobileViewport,
      isFullscreen: false,
    },
  };

  if (options.centered && desktopBox && desktopViewport) {
    const centerX = desktopBox.x + desktopBox.width / 2;
    const viewportCenterX = desktopViewport.width / 2;
    results.desktop.isCentered = Math.abs(centerX - viewportCenterX) < 50; // Within 50px
  }

  if (options.fullscreenOnMobile && mobileBox && mobileViewport) {
    // Modal should take up most of viewport on mobile
    const widthRatio = mobileBox.width / mobileViewport.width;
    const heightRatio = mobileBox.height / mobileViewport.height;
    results.mobile.isFullscreen = widthRatio > 0.9 || heightRatio > 0.9;
  }

  return results;
}
