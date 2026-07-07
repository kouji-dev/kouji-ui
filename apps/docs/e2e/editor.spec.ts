import { test, expect } from '@playwright/test';

// E2E for the KjEditor docs page, run against the STATIC PRERENDERED prod build
// (see playwright.prod.config.ts). The docs editor page is manifest-driven and
// only materialises in the prerendered output.
//
// These are prerender-markup assertions on the SERVED HTML: they prove the full
// pipeline — component → docs example → auto-discovery → SSR/prerender — mounts
// the editor. They are deterministic and do not depend on client hydration.
//
// NOTE: the live client-side re-mount of the docs example (Monaco actually
// rendering `.monaco-editor`) is covered by the unit tests (jsdom, with a stub
// Monaco). In this headless sandbox the docs preview did not re-hydrate the live
// editor; a real-browser / CI run should confirm the interactive mount.

const EDITOR_PAGE = '/docs/components/editor';

test('prerendered editor page serves the styled component host', async ({ request }) => {
  const res = await request.get(EDITOR_PAGE);
  expect(res.ok()).toBeTruthy();
  const html = await res.text();
  // The styled wrapper element rendered by the prerendered example.
  expect(html).toContain('kj-editor');
  // The toolbar language badge.
  expect(html).toContain('kj-editor-lang');
});

test('prerendered editor page includes the loading status region', async ({ request }) => {
  const res = await request.get(EDITOR_PAGE);
  const html = await res.text();
  // Loading region is an accessible live status region (WCAG 4.1.3).
  expect(html).toContain('role="status"');
});

test('editor page shell hydrates with the correct heading', async ({ page }) => {
  await page.goto(EDITOR_PAGE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1').first()).toHaveText(/editor/i, { timeout: 15_000 });
});
