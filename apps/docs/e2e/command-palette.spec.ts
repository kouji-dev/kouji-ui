import { expect, test } from '@playwright/test';
import { openExamplesTab } from './_helpers';

/**
 * Where the demos live on the doc page (since the 2026-05-14 redesign):
 *
 * - the canonical **Default** example is represented by the interactive
 *   Playground on the Overview tab (`.playground-stage`), which mounts the
 *   very same `<kj-command-palette>` with a trigger button, so the old
 *   `kj-command-palette-example` element no longer exists;
 * - every other example is a recipe card on the **Examples** tab, which is not
 *   the default tab — `openExamplesTab()` clicks into it.
 */
test('command-palette examples each render a trigger button + closed modal', async ({ page }) => {
  await page.goto('/docs/components/command-palette');

  // The Default demo — now the Overview playground stage.
  const stage = page.locator('.playground-stage');
  await expect(stage).toBeVisible({ timeout: 60_000 });
  await expect(stage.locator('kj-button').first()).toBeVisible();
  // The panel is rendered in place but closed, so it is out of layout and
  // still inside the demo (it only portals into the overlay container
  // while open).
  await expect(stage.locator('.kj-command-palette__dialog')).toHaveCount(1);
  await expect(stage.locator('.kj-command-palette__dialog[data-state="open"]')).toHaveCount(0);

  await openExamplesTab(page);

  for (const sel of [
    'kj-command-palette-dialog-example',
    'kj-command-palette-groups-example',
    'kj-command-palette-async-example',
    'kj-command-palette-fuzzy-example',
  ]) {
    const root = page.locator(sel);
    await expect(root).toBeVisible();
    await expect(root.locator('kj-button').first()).toBeVisible();
    await expect(root.locator('.kj-command-palette__dialog')).toHaveCount(1);
    await expect(root.locator('.kj-command-palette__dialog[data-state="open"]')).toHaveCount(0);
  }
});

test('clicking the trigger opens the modal with backdrop, dialog, and footer', async ({ page }) => {
  await page.goto('/docs/components/command-palette');

  const stage = page.locator('.playground-stage');
  await expect(stage).toBeVisible({ timeout: 60_000 });
  await stage.locator('kj-button button').first().click();

  // Open, the palette is an overlay: the panel and its scrim live in the
  // shared overlay container, not in the example.
  const container = page.locator('.kj-overlay-container');
  const dialog = container.locator('.kj-command-palette__dialog[data-state="open"]');
  await expect(dialog).toBeVisible();
  await expect(container.locator('kj-backdrop')).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.locator('.kj-command-palette__footer')).toBeVisible();
  await expect(dialog.locator('input.kj-command-palette__input')).toBeFocused();
});

test('Ctrl+K opens the docs search palette via kjHotkey', async ({ page }) => {
  await page.goto('/docs/components/command-palette');
  // The hotkey is bound by the docs shell, so wait for the page to settle
  // before pressing it rather than racing hydration.
  await expect(page.locator('h1.doc-title')).toBeVisible({ timeout: 60_000 });

  await page.keyboard.press('Control+k');

  const shell = page.locator('.kj-overlay-container .kj-command-palette__dialog[data-state="open"]');
  await expect(shell).toBeVisible();
  await expect(shell.locator('.kj-command-palette__esc-kbd')).toHaveText('esc');

  // Type a query — items render via the kjItems + itemTemplate path.
  await shell.locator('input.kj-command-palette__input').fill('button');
  await expect(shell.locator('kj-command-item').first()).toBeVisible();
});
