import { expect, test } from '@playwright/test';
import { gotoExamples } from './_helpers';

test('loading button announces busy and suppresses clicks', async ({ page }) => {
  await gotoExamples(page, 'button');

  const example = page.locator('[data-toc-entry="Loading"]');
  await expect(example).toBeVisible();

  const button = example.locator('button.kj-button');
  await expect(button).toHaveText(/save/i);
  await expect(button).not.toHaveAttribute('aria-busy', 'true');

  await button.click();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toHaveAttribute('aria-disabled', 'true');

  await button.click({ force: true });
  // The click is suppressed, so the button stays in-flight. `kj-button` now
  // swaps the projected label for a spinner while loading (see the
  // "spinner placeholder" refactor), so "still busy" is asserted on the
  // spinner + aria-busy instead of the old "Saving…" label.
  await expect(button.locator('.kj-button__spinner')).toBeVisible();
  await expect(button).toHaveAttribute('aria-busy', 'true');

  await expect(button).toHaveText(/save/i, { timeout: 3000 });
  await expect(button).not.toHaveAttribute('aria-busy', 'true');
});
