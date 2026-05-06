import { test, expect } from '@playwright/test';

test('navbar visible on landing and links work', async ({ page }) => {
  await page.goto('/');
  const navbar = page.getByRole('navigation', { name: 'Primary' });
  await expect(navbar).toBeVisible();
  await expect(navbar.getByRole('link', { name: /^docs$/i })).toHaveAttribute('href', '/docs');
  await expect(navbar.getByRole('link', { name: /theme generator/i })).toHaveAttribute('href', '/theme-generator');
});

test('Get started CTA navigates to /docs/getting-started', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
});

test('navbar persists across landing → docs → theme-generator', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^docs$/i }).first().click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.getByRole('link', { name: /theme generator/i }).first().click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
