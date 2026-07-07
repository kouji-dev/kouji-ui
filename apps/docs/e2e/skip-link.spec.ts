import { test, expect } from '@playwright/test';

/**
 * WCAG 2.4.1 Bypass Blocks — the shell-level "skip to main content" link.
 *
 * Run against the STATIC prerendered prod build (see playwright.static.config.ts).
 * `ng serve` does not prerender doc pages, so the static server is the faithful
 * target for verifying the shell markup + hydrated focus behaviour.
 */
test.describe('skip-to-content link', () => {
  test('Tab reveals the skip link; Enter moves focus to main content', async ({ page }) => {
    await page.goto('/docs');
    await page.waitForLoadState('networkidle');

    // Wait until the app is hydrated and the loading overlay has cleared, so the
    // shell content is actually visible + focusable.
    await expect(page.locator('kj-navbar')).toBeVisible();

    const skip = page.locator('a.kj-skip-link');
    await expect(skip).toHaveAttribute('href', '#main-content');
    await expect(skip).toHaveText(/skip to main content/i);

    // The first Tab from the top of the page lands on the skip link (it is the
    // first focusable element in the shell).
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    // Revealed on focus: once the slide-in transition settles, the link must
    // sit within the viewport (not parked above it).
    await expect
      .poll(async () => (await skip.boundingBox())?.y ?? Number.NEGATIVE_INFINITY)
      .toBeGreaterThanOrEqual(0);

    // Activating it moves keyboard focus to the main-content landmark.
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
