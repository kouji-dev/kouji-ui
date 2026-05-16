import { test, expect } from '@playwright/test';

test('roadmap renders all four columns with correct counts', async ({ page }) => {
  await page.goto('/roadmap');

  await expect(page.getByRole('heading', { name: 'roadmap.' })).toBeVisible();
  await expect(page.locator('kj-roadmap-column')).toHaveCount(4);
  await expect(page.locator('.rm-stat')).toHaveCount(5);
});

test('clicking a category chip filters cards', async ({ page }) => {
  await page.goto('/roadmap');

  const before = await page.locator('kj-roadmap-card').count();
  expect(before).toBeGreaterThan(0);

  // Filter chips are kj-tag selectable elements — find by text.
  const a11yChip = page.locator('kj-tag', { hasText: /^\s*a11y/ }).first();
  await a11yChip.click();
  await expect(a11yChip).toHaveAttribute('aria-pressed', 'true');

  const after = await page.locator('kj-roadmap-card').count();
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);

  // The clear control is rendered as a kj-button with "clear · showing N" text.
  const clear = page.getByRole('button', { name: /^clear/i });
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(a11yChip).toHaveAttribute('aria-pressed', 'false');
});

/**
 * Wait for client hydration: the RoadmapPage publishes `--rm-chrome-h` on
 * its host after Angular's afterNextRender hook fires. That happens AFTER
 * event listeners are wired, so it's a reliable "interactive" marker.
 */
async function waitForRoadmapHydrated(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const host = document.querySelector('kj-roadmap-page') as HTMLElement | null;
    return !!host && host.style.getPropertyValue('--rm-chrome-h').length > 0;
  });
}

test('clicking a card expands its details', async ({ page }) => {
  await page.goto('/roadmap');
  await waitForRoadmapHydrated(page);

  const card = page.locator('kj-roadmap-card').first();
  await expect(card).toHaveAttribute('aria-expanded', 'false');
  // Dispatch click directly on the host element. Avoids landing on child
  // components (kj-link / kj-progress-bar) whose own handlers can swallow the
  // event before it bubbles to the host's (click) listener.
  await card.evaluate(el => (el as HTMLElement).click());
  await expect(card).toHaveAttribute('aria-expanded', 'true');
});

test('Enter key activates a focused card', async ({ page }) => {
  await page.goto('/roadmap');
  await waitForRoadmapHydrated(page);
  const card = page.locator('kj-roadmap-card').first();
  // `locator.press` focuses the element and dispatches the key on it — more
  // reliable than focus()+page.keyboard.press when child kj components can
  // steal focus.
  await card.press('Enter');
  await expect(card).toHaveAttribute('aria-expanded', 'true');
});

test('roadmap link in navbar navigates and marks active', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^roadmap$/i }).first().click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('link', { name: /^roadmap$/i }).first()).toHaveClass(/active/);
});
