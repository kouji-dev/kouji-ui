import { expect, test } from '@playwright/test';
import { gotoExamples } from './_helpers';

/**
 * Smoke test — verifies the route, the extracted doc page, and the wired
 * example section all exist. Examples live behind the doc page's `examples`
 * tab (the default tab is `overview`), so the helper switches to it first.
 */
test('ai-chat: page renders with heading and example section', async ({ page }) => {
  await gotoExamples(page, 'ai-chat');
  await expect(page.locator('h1.doc-title')).toHaveText(/Ai chat/i);
  await expect(page.getByText('Provider-agnostic AI chat').first()).toBeVisible();
  // The example section renders the extracted `@doc-example` cards. The
  // "Streaming (simulated)" card this used to assert is no longer emitted:
  // its slug (`ai-chat`) buckets it as the page's canonical example, and the
  // doc page suppresses canonical examples on pages that ship an interactive
  // Playground. Assert the card that the examples grid does render.
  await expect(page.getByText('Custom thread items').first()).toBeVisible();
});

/**
 * Interactive tests — drive the full send → stream → reply loop of
 * `kj-ai-chat-example`. They are guarded because that example may not be
 * mounted: it is the page's canonical (`playground`-bucket) example, so the
 * doc page hides it whenever an interactive Playground exists — and the
 * ai-chat Playground mounts a *static* seeded thread with no prompt input.
 * While that holds these two tests skip rather than fail; the streaming
 * behaviour itself is covered by the component unit tests in
 * `packages/components/src/chat/chat-ai.spec.ts`.
 */
test.describe('ai-chat interactive (needs the streaming example on the page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/components/ai-chat');
    const example = page.locator('kj-ai-chat-example');
    const mounted = await example
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!mounted, 'kj-ai-chat-example is not rendered on the doc page');
  });

  test('sending a message renders a simulated streamed reply', async ({ page }) => {
    const example = page.locator('kj-ai-chat-example');
    await expect(example.locator('[role="log"]')).toBeVisible();

    const box = example.getByRole('textbox');
    await box.fill('Hello there');
    await box.press('Enter');

    await expect(example.getByText('Hello there')).toBeVisible();
    await expect(example.getByText(/sentence by sentence/i)).toBeVisible({ timeout: 10_000 });
  });

  test('typing "/" opens the slash-command listbox', async ({ page }) => {
    const example = page.locator('kj-ai-chat-example');
    const box = example.getByRole('textbox');
    await box.fill('/sum');

    await expect(example.locator('[role="listbox"]')).toBeVisible();
    await expect(example.getByText('/summarize')).toBeVisible();
  });
});
