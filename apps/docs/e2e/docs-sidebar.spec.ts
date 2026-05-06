import { test, expect } from '@playwright/test';

test('Col A always visible on /docs', async ({ page }) => {
  await page.goto('/docs');
  const nav = page.getByRole('navigation', { name: 'Documentation sections' });
  await expect(nav).toBeVisible();
  for (const label of ['Getting Started', 'Headless', 'Components']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('Col B closed on /docs/getting-started (leaf)', async ({ page }) => {
  await page.goto('/docs/getting-started');
  await expect(page.getByRole('navigation', { name: /headless items/i })).toBeHidden();
  await expect(page.getByRole('navigation', { name: /components items/i })).toBeHidden();
});

test('Col B opens with grouped items when entering /docs/headless', async ({ page }) => {
  await page.goto('/docs/headless');
  await expect(page.getByRole('navigation', { name: /headless items/i })).toBeVisible();
});
