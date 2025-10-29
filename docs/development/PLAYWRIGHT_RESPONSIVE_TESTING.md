# Playwright Multi-Viewport Testing Guide

## Overview

Electric Abacus now has comprehensive Playwright testing infrastructure for debugging and optimizing UI across mobile, tablet, and desktop viewports. This setup enables automated visual regression testing, interactive debugging, and responsive behavior validation.

## What's Been Set Up

### 1. Enhanced Playwright Configuration

**File**: `apps/web/playwright.config.ts`

The Playwright config now includes:

- **10 different viewport configurations** covering mobile, tablet, and desktop sizes
- **Screenshot and video capture** on test failures for debugging
- **Cross-browser testing** (Chromium, Firefox, WebKit)

#### Configured Viewports:

| Category | Device | Viewport Size |
|----------|--------|---------------|
| Desktop | Chrome (default) | 1280x720 |
| Desktop | Firefox (default) | 1280x720 |
| Desktop | Safari (default) | 1280x720 |
| Mobile | Pixel 5 | 393x851 |
| Mobile | iPhone 12 | 390x844 |
| Tablet | iPad | 768x1024 |
| Tablet | iPad Pro | 1024x1366 |
| Desktop | Small | 1280x720 |
| Desktop | Medium | 1440x900 |
| Desktop | Large | 1920x1080 |

### 2. Interactive Debugging Scripts

**File**: `apps/web/package.json` and root `package.json`

New npm scripts for viewport-specific testing:

```bash
# Run from project root or apps/web directory

# Test specific viewports
npm run test:e2e:mobile     # Test on mobile devices (Pixel 5, iPhone 12)
npm run test:e2e:tablet     # Test on tablets (iPad, iPad Pro)
npm run test:e2e:desktop    # Test on desktop sizes (Small, Medium, Large)

# Interactive debugging modes
npm run test:e2e:ui         # Open Playwright UI (time-travel debugging)
npm run test:e2e:headed     # Run tests in headed mode (watch browser)
npm run test:e2e:debug      # Run tests in debug mode (breakpoints)

# Run all tests
npm run test:e2e            # Run all tests across all viewports
```

### 3. Viewport Testing Utilities

**File**: `apps/web/tests/helpers/viewport-testing.ts`

A comprehensive suite of helper functions for responsive testing:

#### Available Utilities:

**`VIEWPORTS`** - Predefined viewport constants:
```typescript
VIEWPORTS.mobile.small      // 375x667 (iPhone SE)
VIEWPORTS.mobile.medium     // 390x844 (iPhone 12)
VIEWPORTS.mobile.large      // 428x926 (iPhone 14 Pro Max)
VIEWPORTS.tablet.portrait   // 768x1024 (iPad)
VIEWPORTS.tablet.landscape  // 1024x768 (iPad landscape)
VIEWPORTS.tablet.pro        // 1024x1366 (iPad Pro)
VIEWPORTS.desktop.small     // 1280x720 (HD)
VIEWPORTS.desktop.medium    // 1440x900 (MacBook Pro)
VIEWPORTS.desktop.large     // 1920x1080 (Full HD)
VIEWPORTS.desktop.xlarge    // 2560x1440 (2K)
```

**`testAtViewports()`** - Test a page at multiple viewports:
```typescript
testAtViewports(
  [VIEWPORTS.mobile.medium, VIEWPORTS.tablet.portrait, VIEWPORTS.desktop.medium],
  async ({ page, viewport }) => {
    await page.goto('/');
    await expect(page.getByRole('heading')).toBeVisible();
  }
);
```

**`testResponsiveVisibility()`** - Test element visibility across viewports:
```typescript
await testResponsiveVisibility(page, '.desktop-only', {
  visibleAt: [VIEWPORTS.desktop.medium],
  hiddenAt: [VIEWPORTS.mobile.medium],
});
```

**`testTableOverflow()`** - Test table overflow behavior:
```typescript
const result = await testTableOverflow(page, 'table.data-table');
console.log(result.hasOverflow); // true if table scrolls horizontally
```

**`testFormLayout()`** - Test form responsiveness:
```typescript
await testFormLayout(page, 'form', {
  stacksOnMobile: true,
  fullWidthOnMobile: true,
});
```

**`testModalResponsiveness()`** - Test modal/dialog behavior:
```typescript
await testModalResponsiveness(page, '.modal', {
  fullscreenOnMobile: true,
  centered: true,
});
```

**`compareScreenshotsAtViewports()`** - Visual regression testing:
```typescript
const results = await compareScreenshotsAtViewports(page, 'landing-page', [
  { ...VIEWPORTS.mobile.medium, label: 'Mobile' },
  { ...VIEWPORTS.desktop.medium, label: 'Desktop' },
]);
```

**`checkLayoutShift()`** - Detect layout shifts during resize:
```typescript
const result = await checkLayoutShift(
  page,
  VIEWPORTS.desktop.medium,
  VIEWPORTS.mobile.medium,
  '.main-content'
);
console.log(result.shifted); // true if element moved
```

### 4. Responsive Layout Test Suite

**File**: `apps/web/tests/e2e/responsive-layout.spec.ts`

Comprehensive test suite covering:

- **Landing Page**: Hero section, CTA buttons, features grid
- **Signup Page**: Multi-step form, stepper, mobile navigation
- **App Layout**: Header, navigation, font sizes
- **Tables**: Overflow handling on mobile/tablet
- **Forms**: Stacking, full-width inputs, touch-friendly buttons
- **Legal Pages**: Content readability, no overflow
- **Viewport Extremes**: Very small (320px) and ultra-wide (2560px)
- **Touch Targets**: Adequate size and spacing on mobile
- **Performance**: Load time and resource optimization

## Usage Guide

### Quick Start

1. **Run all tests across all viewports:**
   ```bash
   npm run test:e2e
   ```

2. **Test only mobile viewports:**
   ```bash
   npm run test:e2e:mobile
   ```

3. **Open interactive UI for debugging:**
   ```bash
   npm run test:e2e:ui
   ```

### Interactive Debugging Workflow

**Playwright UI Mode** (Recommended for debugging):
```bash
npm run test:e2e:ui
```

This opens a visual interface where you can:
- Step through tests line by line
- Time-travel through test execution
- See screenshots and videos
- Inspect DOM at any point
- Re-run tests interactively

**Headed Mode** (Watch browser execution):
```bash
npm run test:e2e:headed
```

Runs tests in visible browser windows so you can watch what happens.

**Debug Mode** (Playwright Inspector):
```bash
npm run test:e2e:debug
```

Opens Playwright Inspector for setting breakpoints and stepping through code.

### Writing New Responsive Tests

#### Example 1: Test Element Visibility

```typescript
import { test, expect } from '@playwright/test';
import { VIEWPORTS, testResponsiveVisibility } from '../helpers/viewport-testing';

test('navigation should adapt to viewport', async ({ page }) => {
  await page.goto('/app');

  await testResponsiveVisibility(page, '.desktop-nav', {
    visibleAt: [VIEWPORTS.desktop.medium],
    hiddenAt: [VIEWPORTS.mobile.medium],
  });

  await testResponsiveVisibility(page, '.mobile-menu-button', {
    visibleAt: [VIEWPORTS.mobile.medium],
    hiddenAt: [VIEWPORTS.desktop.medium],
  });
});
```

#### Example 2: Test Multiple Viewports

```typescript
import { testAtViewports, VIEWPORTS } from '../helpers/viewport-testing';

test.describe('Ingredient Table', () => {
  testAtViewports(
    [VIEWPORTS.mobile.medium, VIEWPORTS.tablet.portrait, VIEWPORTS.desktop.large],
    async ({ page, viewport }) => {
      await page.goto('/app/ingredients');

      // Table should be visible at all viewports
      await expect(page.getByRole('table')).toBeVisible();

      // On mobile, check for horizontal scroll
      if (viewport.width < 768) {
        const tableContainer = page.locator('.table-container');
        const hasScroll = await tableContainer.evaluate(el =>
          el.scrollWidth > el.clientWidth
        );
        expect(hasScroll).toBeTruthy();
      }
    }
  );
});
```

#### Example 3: Screenshot Comparison

```typescript
import { test } from '@playwright/test';
import { compareScreenshotsAtViewports, VIEWPORTS } from '../helpers/viewport-testing';

test('week review page visual regression', async ({ page }) => {
  await page.goto('/app/weeks/2025-W39');

  const screenshots = await compareScreenshotsAtViewports(page, 'week-review', [
    { ...VIEWPORTS.mobile.medium, label: 'Mobile' },
    { ...VIEWPORTS.tablet.portrait, label: 'Tablet' },
    { ...VIEWPORTS.desktop.medium, label: 'Desktop' },
  ]);

  // Playwright will automatically compare screenshots on subsequent runs
  // and flag visual differences
});
```

## Testing Best Practices

### 1. Test Breakpoints

Always test at Tailwind's breakpoints:
- Mobile: `< 640px` (sm)
- Tablet: `768px - 1024px` (md, lg)
- Desktop: `> 1280px` (xl, 2xl)

### 2. Touch Targets

Ensure buttons and links are at least 44x44px on mobile (Apple HIG recommendation).

### 3. No Horizontal Overflow

Pages should never scroll horizontally on mobile. Test with:
```typescript
const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
const viewportWidth = page.viewportSize()?.width || 0;
expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
```

### 4. Text Readability

Font sizes should be at least 16px on mobile:
```typescript
const fontSize = await element.evaluate(el =>
  window.getComputedStyle(el).fontSize
);
expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
```

### 5. Form Usability

- Form inputs should be full-width on mobile
- Fields should stack vertically
- Buttons should be touch-friendly (40-44px height)

## Debugging Common Issues

### Issue: Tests failing on specific viewport

**Solution**: Run tests in headed mode for that viewport:
```bash
npm run test:e2e:headed -- --project="Mobile Chrome"
```

### Issue: Layout looks wrong

**Solution**: Use Playwright UI to inspect at specific point:
```bash
npm run test:e2e:ui
```

Then click through test steps and use the "Pick Locator" tool.

### Issue: Need to see what's happening

**Solution**: Add screenshots to your test:
```typescript
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
```

### Issue: Elements not visible when expected

**Solution**: Check if element is hidden by viewport or CSS:
```typescript
await page.locator(selector).evaluate(el => ({
  display: getComputedStyle(el).display,
  visibility: getComputedStyle(el).visibility,
  opacity: getComputedStyle(el).opacity,
}));
```

## CI/CD Integration

The configuration already includes CI optimizations:

- **Retries**: 2 retries on CI (0 locally)
- **Workers**: Sequential execution on CI (parallel locally)
- **Server**: Reuses existing dev server locally

### GitHub Actions Example:

```yaml
- name: Run Playwright tests
  run: npm run test:e2e

- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: apps/web/playwright-report/
```

## File Structure

```
apps/web/
├── playwright.config.ts              # Main Playwright configuration
├── tests/
│   ├── e2e/
│   │   ├── signup.spec.ts           # Existing signup tests
│   │   ├── finalize-week.spec.ts    # Existing week tests
│   │   └── responsive-layout.spec.ts # New responsive tests
│   └── helpers/
│       └── viewport-testing.ts       # Viewport utilities
└── package.json                      # New test scripts
```

## Viewport Coverage Summary

✅ **Mobile Devices**: iPhone SE, iPhone 12, Pixel 5
✅ **Tablets**: iPad (portrait/landscape), iPad Pro
✅ **Desktops**: Small (1280), Medium (1440), Large (1920), XL (2560)
✅ **Browsers**: Chrome, Firefox, Safari (WebKit)

## Next Steps

1. **Run initial test suite**: `npm run test:e2e:mobile` to find mobile issues
2. **Review screenshots**: Check `test-results/` directory for failure screenshots
3. **Fix responsive issues**: Use UI mode for interactive debugging
4. **Add project-specific tests**: Write tests for authenticated pages and complex components
5. **Set up visual regression**: Configure screenshot baselines for critical pages

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright UI Mode](https://playwright.dev/docs/test-ui-mode)
- [Emulation & Viewports](https://playwright.dev/docs/emulation)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Debugging Tests](https://playwright.dev/docs/debug)

## Tailwind Breakpoints Reference

For reference, your Tailwind breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (custom in your config)

Match your tests to these breakpoints for consistency with your CSS.

## Common Test Patterns

### Pattern: Mobile-First Testing
```typescript
test('feature works on mobile first', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile.medium);
  // Test mobile layout

  await page.setViewportSize(VIEWPORTS.desktop.medium);
  // Test desktop enhancements
});
```

### Pattern: Cross-Viewport Consistency
```typescript
const viewports = [
  VIEWPORTS.mobile.medium,
  VIEWPORTS.tablet.portrait,
  VIEWPORTS.desktop.medium,
];

for (const viewport of viewports) {
  test(`works at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Run same test at each viewport
  });
}
```

### Pattern: Responsive Component Testing
```typescript
test('component adapts to viewport', async ({ page }) => {
  await page.goto('/component');

  // Mobile: component should be simplified
  await page.setViewportSize(VIEWPORTS.mobile.medium);
  await expect(page.locator('.mobile-view')).toBeVisible();

  // Desktop: component shows full features
  await page.setViewportSize(VIEWPORTS.desktop.medium);
  await expect(page.locator('.desktop-view')).toBeVisible();
});
```

---

**Questions or issues?** Check the Playwright docs or run tests in UI mode for interactive debugging.
