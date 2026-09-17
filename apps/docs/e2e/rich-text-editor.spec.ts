import { expect, test, type Page } from '@playwright/test';
import { gotoExamples } from './_helpers';

/**
 * E2E coverage for the KjRichTextEditor docs page: the accessible toolbar, the
 * contenteditable textbox, and a formatting round-trip.
 *
 * The doc page is a four-tab layout and the live demos are split across two of
 * them, so the specs are too:
 *
 *   • the full-featured interactive **playground** sits in the default
 *     `overview` panel — `page.locator('kj-rich-text-editor').first()` used to
 *     resolve to it by accident; it is now addressed by name;
 *   • the per-feature examples (minimal / custom node) live in the `examples`
 *     panel, which is not rendered until its tab is clicked — see
 *     {@link gotoExamples}.
 */

/** The full-toolbar editor driven by the overview tab's playground. */
function playground(page: Page) {
  return page.locator('kj-rich-text-editor-playground kj-rich-text-editor');
}

test.describe('rich-text-editor playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/components/rich-text-editor');
    await expect(page.locator('h1.doc-title')).toBeVisible({ timeout: 60_000 });
    await expect(playground(page)).toBeVisible({ timeout: 30_000 });
  });

  test('renders an accessible toolbar and textbox', async ({ page }) => {
    const editor = playground(page);
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
    const editor = playground(page);
    const textbox = editor.locator('[role="textbox"]');
    await textbox.click();
    // The playground starts empty (the seeded-content example this test used to
    // land on is no longer rendered on the page), so type the content that then
    // gets selected — "bold applies to a selection" is vacuous on an empty
    // document, where the command produces no element at all.
    await textbox.pressSequentially('formatted');

    // Select all existing content and toggle bold via the toolbar.
    await page.keyboard.press('ControlOrMeta+A');
    const bold = editor.locator('button[aria-label="Bold"]');
    await bold.click();

    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await expect(textbox.locator('b, strong')).toHaveCount(1);
    await expect(textbox.locator('b, strong')).toHaveText('formatted');
  });

  test('keyboard shortcut toggles italic', async ({ page }) => {
    const editor = playground(page);
    const textbox = editor.locator('[role="textbox"]');
    await textbox.click();
    await textbox.pressSequentially('formatted');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('ControlOrMeta+I');

    const italic = editor.locator('button[aria-label="Italic"]');
    await expect(italic).toHaveAttribute('aria-pressed', 'true');
    await expect(textbox.locator('i, em')).toHaveCount(1);
  });

  test('opens the link overlay dialog from the toolbar', async ({ page }) => {
    const editor = playground(page);
    const textbox = editor.locator('[role="textbox"]');
    await textbox.click();
    await textbox.pressSequentially('linked');
    await page.keyboard.press('ControlOrMeta+A');
    await editor.locator('button[aria-label="Link"]').click();

    const dialog = editor.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-label', /link/i);
  });
});

test.describe('rich-text-editor examples', () => {
  test.beforeEach(async ({ page }) => {
    await gotoExamples(page, 'rich-text-editor');
  });

  test('a minimal feature subset renders only its toolbar controls', async ({ page }) => {
    const example = page.locator('kj-rich-text-editor-minimal-example');
    await expect(example).toBeVisible();
    // Enabled features render.
    await expect(example.locator('button[aria-label="Bold"]')).toBeVisible();
    await expect(example.locator('button[aria-label="Italic"]')).toBeVisible();
    await expect(example.locator('button[aria-label="Link"]')).toBeVisible();
    // Disabled features contribute nothing to the toolbar.
    await expect(example.locator('button[aria-label="Undo"]')).toHaveCount(0);
    await expect(example.locator('button[aria-label="Heading 1"]')).toHaveCount(0);
    await expect(example.locator('button[aria-label="Bullet list"]')).toHaveCount(0);
  });

  // Exercises the feature framework: a custom feature contributing its own
  // toolbar button + Angular-rendered decorator node.
  test('a custom feature inserts a badge decorator node from its toolbar button', async ({
    page,
  }) => {
    const example = page.locator('kj-rich-text-editor-custom-node-example');
    await expect(example).toBeVisible();

    await example.getByRole('button', { name: 'Insert badge' }).click();

    // The badge chip component mounts inside the editable surface.
    await expect(example.locator('kj-badge-chip')).toHaveCount(1);
    await expect(example.locator('.kj-badge-chip')).toHaveText('New');
  });
});
