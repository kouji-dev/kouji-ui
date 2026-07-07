import { expect, test } from '@playwright/test';

/**
 * i18n E2E — runs against the STATIC prerendered production build (see
 * `playwright.i18n.config.ts`), because `ng serve` does not render doc pages
 * (the docs manifest is prerender-driven). Switches locale and asserts a
 * visible string AND an ARIA label both change.
 */
test('locale switch translates visible text and aria-label', async ({
  page,
}) => {
  await page.goto('/docs/headless/i18n');

  // Live recipe previews render under the "Examples" tab.
  await page.getByRole('tab', { name: /examples/i }).first().click();

  const pageInfo = page.getByTestId('page-info');
  const closeBtn = page.getByTestId('close-btn');
  const localeFr = page.getByTestId('locale-fr');
  const localeEn = page.getByTestId('locale-en');

  // English defaults (prerendered + hydrated).
  await expect(pageInfo).toHaveText('Page 3 of 12');
  await expect(closeBtn).toHaveAttribute('aria-label', 'Close notification');

  // Switch to French.
  await localeFr.click();
  await expect(pageInfo).toHaveText('Page 3 sur 12');
  await expect(closeBtn).toHaveAttribute('aria-label', 'Fermer la notification');

  // Switch back to English.
  await localeEn.click();
  await expect(pageInfo).toHaveText('Page 3 of 12');
  await expect(closeBtn).toHaveAttribute('aria-label', 'Close notification');
});
