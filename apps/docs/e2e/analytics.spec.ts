import { test, expect, type Page } from '@playwright/test';

/**
 * GA4 instrumentation (services/analytics.service.ts).
 *
 * gtag.js is blocked at the network layer; the inline bootstrap in index.html
 * still defines window.gtag and pushes into window.dataLayer, so every event
 * is asserted straight off dataLayer with no Google traffic leaving the box.
 * index.html configures send_page_view:false — page_views must come from
 * AnalyticsTitleStrategy, once per navigation, with the route title applied.
 */

type Ev = [string, Record<string, unknown>];

const events = (page: Page): Promise<Ev[]> =>
  page.evaluate(() =>
    ((window as never as { dataLayer?: IArguments[] }).dataLayer ?? [])
      .filter(a => a[0] === 'event')
      .map(a => [a[1], a[2] ?? {}] as [string, Record<string, unknown>]),
  );

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com/, r => r.fulfill({ status: 204, body: '' }));
});

test('each navigation sends one page_view with the route title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/kouji-ui — Headless Angular UI/);
  await expect.poll(async () => (await events(page)).filter(([n]) => n === 'page_view').length).toBe(1);

  await page.getByRole('link', { name: /^docs$/i }).first().click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect.poll(async () => (await events(page)).filter(([n]) => n === 'page_view').length).toBe(2);

  const views = (await events(page)).filter(([n]) => n === 'page_view');
  expect(views[0][1]['page_title']).toContain('kouji-ui — Headless Angular UI');
  expect(views[1][1]['page_title']).toContain('Docs — kouji-ui');
});

test('component doc page_view carries doc_slug/doc_section; copy fires copy_code', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/components/button');
  await expect(page).toHaveTitle(/Button — kouji-ui/);

  await expect
    .poll(async () => (await events(page)).find(([n]) => n === 'page_view')?.[1])
    .toMatchObject({ doc_slug: 'button', doc_section: 'components' });

  await page.getByRole('button', { name: /copy/i }).first().click();
  await expect
    .poll(async () => (await events(page)).find(([n]) => n === 'copy_code')?.[1]?.['doc_slug'])
    .toBeTruthy();
});

test('outbound links are reported as outbound clicks', async ({ page }) => {
  await page.goto('/');
  // dispatch + read synchronously so the assertion wins any target=_blank race
  const evs = await page.evaluate(() => {
    const a = document.querySelector<HTMLAnchorElement>('a[href^="https://github.com"]');
    a?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return ((window as never as { dataLayer?: IArguments[] }).dataLayer ?? [])
      .filter(x => x[0] === 'event')
      .map(x => [x[1], x[2] ?? {}] as [string, Record<string, unknown>]);
  });
  const out = evs.find(([n, p]) => n === 'click' && p['outbound'] === true);
  expect(out?.[1]).toMatchObject({ link_domain: 'github.com' });
});
