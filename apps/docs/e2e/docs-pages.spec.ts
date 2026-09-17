import { test, expect } from '@playwright/test';

/**
 * Guards the prerender fallback on the parameterised doc routes.
 *
 * `app.routes.server.ts` declares `docs/components/:slug` and
 * `docs/headless/:slug` as `RenderMode.Prerender` with
 * `fallback: PrerenderFallback.Server`. Prerendering is a build-time step, so
 * under `ng serve` — which is what drives these tests — no path is prerendered
 * and every request takes the fallback. With the server fallback the dev server
 * renders the page, which runs `ServerDocsManifestProvider` and puts the docs
 * manifest in TransferState. Switch it to `PrerenderFallback.Client` and the
 * dev server returns the bare CSR shell instead: TransferState is empty,
 * `DocsService.loadManifest()` falls back to an HTTP fetch nothing answers, and
 * the page sits on its "Loading…" branch forever.
 *
 * That regression shipped once and was invisible to every existing test, because
 * the whole app still builds, lints and typechecks — the page just never
 * resolves its data. These assertions fail loudly instead.
 */
test.describe('documentation pages resolve their content', () => {
  for (const path of ['/docs/components/button', '/docs/headless/button']) {
    test(`${path} renders its title, not a loading state`, async ({ page }) => {
      await page.goto(path);

      // The page title comes from the manifest, so it is present only once the
      // manifest resolved. Waiting on it is the real assertion.
      const title = page.locator('h1.doc-title');
      await expect(title).toBeVisible({ timeout: 60_000 });
      await expect(title).not.toBeEmpty();

      // And the loading branch must be gone rather than merely overlapped.
      await expect(page.getByText('Loading…', { exact: true })).toHaveCount(0);
    });
  }

  test('a doc page reaches the browser with its manifest already embedded', async ({ page }) => {
    await page.goto('/docs/components/button');
    await expect(page.locator('h1.doc-title')).toBeVisible({ timeout: 60_000 });

    // No request for the manifest should be needed: the server render embeds it
    // in TransferState. If this starts failing, the fallback was changed and the
    // page is limping along on an HTTP round trip that production cannot serve.
    const transferState = await page.evaluate(
      () => !!document.getElementById('ng-state')?.textContent?.includes('docs-manifest'),
    );
    expect(transferState).toBe(true);
  });
});
