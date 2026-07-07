import { expect, test } from '@playwright/test';

/**
 * E2E coverage for the KjRichTextEditor docs page. Exercises the live example:
 * the accessible toolbar, the contenteditable textbox, and a formatting round-trip.
 */
test.describe('rich-text-editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/components/rich-text-editor');
  });

  test('renders an accessible toolbar and textbox', async ({ page }) => {
    const editor = page.locator('kj-rich-text-editor').first();
    await expect(editor).toBeVisible();

    const toolbar = editor.locator('[role="toolbar"]');
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveAttribute('aria-label', /.+/);

    const textbox = editor.locator('[role="textbox"]');
    await expect(textbox).toHaveAttribute('aria-multiline', 'true');

    // Bold control starts unpressed.
    const bold = toolbar.locator('button[aria-label="Bold"]');
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
  });

  test('applies bold formatting to a selection', async ({ page }) => {
    const editor = page.locator('kj-rich-text-editor').first();
    const textbox = editor.locator('[role="textbox"]');
    await textbox.click();

    // Select all existing content and toggle bold via the toolbar.
    await page.keyboard.press('ControlOrMeta+A');
    const bold = editor.locator('button[aria-label="Bold"]');
    await bold.click();

    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await expect(textbox.locator('b, strong')).toHaveCount(1);
  });

  test('keyboard shortcut toggles italic', async ({ page }) => {
    const editor = page.locator('kj-rich-text-editor').first();
    const textbox = editor.locator('[role="textbox"]');
    await textbox.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('ControlOrMeta+I');

    const italic = editor.locator('button[aria-label="Italic"]');
    await expect(italic).toHaveAttribute('aria-pressed', 'true');
  });

  // Exercises the extension framework: a custom Angular-rendered decorator node
  // registered from outside the engine via [kjRichTextExtension].
  test('inserts a custom badge decorator node via the extension framework', async ({ page }) => {
    const example = page.locator('kj-rich-text-editor-custom-node-example');
    await expect(example).toBeVisible();

    const insert = example.getByRole('button', { name: 'Insert badge' });
    await insert.click();

    // The badge chip component mounts inside the editable surface.
    await expect(example.locator('kj-badge-chip')).toHaveCount(1);
    await expect(example.locator('.kj-badge-chip')).toHaveText('New');
  });
});
