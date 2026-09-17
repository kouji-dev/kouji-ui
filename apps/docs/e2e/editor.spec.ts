import { test, expect } from '@playwright/test';

// E2E for the migrated docs, run against the STATIC PRERENDERED prod build
// (see playwright.prod.config.ts). The docs now render every code viewer with
// the library `<kj-editor>` (KjEditorComponent) instead of the retired
// docs-internal editor — so these tests double as proof the library API covers
// the real read-only-viewer use case.

test('getting-started renders live Monaco editors via the library <kj-editor>', async ({
  page,
}) => {
  await page.goto('/docs/getting-started', { waitUntil: 'domcontentloaded' });

  // The page is built out of read-only code viewers, all now <kj-editor>.
  // The exact number grows whenever a code sample is added, so assert a floor
  // rather than pinning a count that turns every doc edit into a test failure.
  const editors = page.locator('kj-editor');
  await expect(editors.first()).toBeAttached({ timeout: 15_000 });
  const editorCount = await editors.count();
  expect(editorCount).toBeGreaterThanOrEqual(6);

  // Monaco actually mounts and highlights (loaded lazily from the CDN) — in
  // EVERY viewer on the page, not just the first one. Comparing against the
  // host count keeps the original "all of them are live" assertion intact
  // while staying independent of how many samples the page carries.
  const monaco = page.locator('kj-editor .monaco-editor');
  await expect(monaco.first()).toBeVisible({ timeout: 30_000 });
  await expect(monaco).toHaveCount(editorCount);

  // The editor host carries the accessible name from kjAriaLabel (AAA 4.1.2).
  const host = page.locator('kj-editor .kj-editor-host').first();
  await expect(host).toHaveAttribute('aria-label', /.+/, { timeout: 10_000 });
});

test('component doc usage walkthrough renders a live <kj-editor>', async ({ page }) => {
  await page.goto('/docs/components/button', { waitUntil: 'domcontentloaded' });
  const monaco = page.locator('kj-editor .monaco-editor').first();
  await expect(monaco).toBeVisible({ timeout: 30_000 });
});

test('editor docs page prerenders the styled component host', async ({ request }) => {
  // The KjEditor component's own examples page is auto-discovered/prerendered.
  // (Its dynamically-created live example previews do not re-hydrate in this
  // headless sandbox — see the design spec — so this asserts the served markup,
  // while the live-mount behaviour is proven by the two tests above.)
  const res = await request.get('/docs/components/editor');
  expect(res.ok()).toBeTruthy();
  const html = await res.text();
  expect(html).toContain('kj-editor');
  expect(html).toContain('role="status"');
});
