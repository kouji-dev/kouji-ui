import { expect, type Page } from '@playwright/test';

/**
 * Opens a component documentation page and switches to its **examples** tab.
 *
 * The doc page is a four-tab layout (`overview` / `api` / `examples` / `a11y`)
 * and `overview` is the default, so every rendered example — the `recipe-card`
 * articles carrying `data-toc-entry="<label>"` — lives inside a panel that is
 * not shown on load. A spec that navigates and immediately looks for an example
 * finds nothing.
 *
 * The tab state is not mirrored in the URL, so there is no query parameter to
 * deep-link with; clicking the tab is the only way in. Prefer this helper over
 * hand-rolling the click so a future URL-deep-link makes every spec shorter at
 * once.
 */
export async function gotoExamples(page: Page, slug: string, track = 'components'): Promise<void> {
  await page.goto(`/docs/${track}/${slug}`);
  await openExamplesTab(page);
}

/** Switches an already-open component doc page to its examples tab. */
export async function openExamplesTab(page: Page): Promise<void> {
  // Wait for the page to resolve its manifest — the tab strip is rendered from
  // it, so clicking earlier races the content in.
  await expect(page.locator('h1.doc-title')).toBeVisible({ timeout: 60_000 });

  const tab = page.getByRole('tab', { name: /examples/i });
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await tab.click();

  // The panel is the thing specs then query into; wait for it rather than for a
  // fixed delay so slow first-compile runs in dev do not flake.
  await expect(page.locator('.recipes-grid').first()).toBeVisible({ timeout: 30_000 });
}

/** Switches an already-open component doc page to its **api** tab. */
export async function openApiTab(page: Page): Promise<void> {
  // ts-morph extraction on a cold server is slow; the title gates on it.
  await expect(page.locator('h1.doc-title')).toBeVisible({ timeout: 90_000 });

  const tab = page.getByRole('tab', { name: /^api/i });
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await tab.click();
  // Gate on the tab's own state: what the api panel contains varies by page
  // (a directive-only page has Inputs, a token-only page does not), so there is
  // no single element to wait for.
  await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 });
}

/** Opens a component doc page and switches to its api tab. */
export async function gotoApi(page: Page, slug: string, track = 'components'): Promise<void> {
  await page.goto(`/docs/${track}/${slug}`);
  await openApiTab(page);
}
