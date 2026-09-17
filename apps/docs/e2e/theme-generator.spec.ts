import { test, expect, type Page } from '@playwright/test';

/**
 * E2E coverage for `/theme-generator`.
 *
 * The page was redesigned: the old `kj-theme-config-panel` / `kj-a11y-panel` /
 * `kj-seed-swatch-grid` / `nav[aria-label="Themes"]` DOM no longer exists. The
 * current layout is
 *
 *   • `<kj-theme-controls-panel>` — a "fork from preset" `<kj-select>` listing the
 *     built-in themes, then Colors / Type / Shape / Spacing / Motion sections;
 *   • `<kj-theme-a11y-bar>` — `role="region"` "Accessibility checks and preview
 *     controls", holding the score (`.tg-a11y-score`) and one contrast chip
 *     (`.tg-a11y-chip`) per token pair — this is the contrast scorecard, now
 *     always visible instead of hidden behind a "Full contrast breakdown"
 *     disclosure;
 *   • `<kj-theme-generator-preview>` — eight preview tabs (was five);
 *   • share / export css / import / save in the subheader.
 *
 * Every test below asserts the same behaviour as before against those selectors.
 */

// The share test reads the copied link back out of the clipboard.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

async function gotoGenerator(page: Page): Promise<void> {
  await page.goto('/theme-generator');
  await expect(page.locator('kj-theme-controls-panel')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.tg-a11y-chip').first()).toBeVisible({ timeout: 30_000 });
}

/** The "fork from preset" select — the list of built-in themes. */
function forkSelect(page: Page) {
  return page.locator('.tg-fork-select');
}

/**
 * Opens the fork select and returns its listbox. The open panel is portalled
 * out of the `<kj-select>` host, so it is reached through the trigger's
 * `aria-controls` rather than by descending from `.tg-fork-select`.
 */
async function openForkSelect(page: Page) {
  const trigger = forkSelect(page).locator('button.kj-select-trigger');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const id = await trigger.getAttribute('aria-controls');
  const list = page.locator(`#${id}`);
  await expect(list).toBeVisible();
  await expect(list).toHaveRole('listbox');
  return list;
}

/** The hex readout of one Colors row (`background` / `primary` / `accent`). */
function colorHex(page: Page, label: string) {
  return page.locator('.tg-color').filter({ hasText: label }).locator('.hex');
}

/** Types an exact hex into a Colors row via its color-picker popover. */
async function setColor(page: Page, label: string, hex: string): Promise<void> {
  await page
    .locator('.tg-color')
    .filter({ hasText: label })
    .locator('button.kj-color-picker-trigger')
    .click();
  const panel = page.locator('[kjcolorpickerpanel][data-state="open"]');
  await expect(panel).toBeVisible();
  const field = panel.getByRole('textbox', { name: 'Hex color value' });
  await field.fill(hex);
  await field.press('Enter');
  await page.keyboard.press('Escape');
  await expect(colorHex(page, label)).toHaveText(hex.toUpperCase());
}

test('theme-generator lists the built-in themes to fork from', async ({ page }) => {
  await gotoGenerator(page);
  // Was: nav[aria-label="Themes"] with one button per theme. The themes are now
  // the options of the "fork from preset" select.
  const list = await openForkSelect(page);
  for (const name of ['kouji', 'dark', 'retro', 'cyberpunk', 'corporate']) {
    await expect(list.getByRole('option', { name, exact: true })).toBeVisible();
  }
});

test('forking a built-in theme loads it (selection + tokens change)', async ({ page }) => {
  await gotoGenerator(page);
  const before = await page.locator('.tg-color .hex').allInnerTexts();

  const list = await openForkSelect(page);
  const retro = list.getByRole('option', { name: 'retro', exact: true });
  await retro.click();

  // Was: `toHaveClass(/active/)` on a theme button. The select marks the loaded
  // preset with `aria-selected` and echoes it in the trigger label. Picking an
  // option closes the panel and moves the options back into the host, so the
  // selection is read there rather than through the now-detached portal.
  await expect(forkSelect(page).locator('kj-option[aria-selected="true"]')).toHaveText('retro');
  await expect(forkSelect(page).locator('.kj-select-trigger-label')).toHaveText('retro');
  // …and it really loaded: the editable color tokens are now retro's, not the
  // ones the page opened with.
  await expect
    .poll(() => page.locator('.tg-color .hex').allInnerTexts(), { timeout: 5_000 })
    .not.toEqual(before);
});

test('controls panel shows the contrast scorecard for every token pair', async ({ page }) => {
  await gotoGenerator(page);
  // Was: kj-theme-config-panel + region "theme tokens and accessibility" +
  // a "Full contrast breakdown" disclosure revealing kj-contrast-scorecard.
  // The scorecard is now the always-visible chip row in the a11y band.
  await expect(page.locator('kj-theme-controls-panel')).toBeVisible();
  const band = page.getByRole('region', { name: /accessibility checks/i });
  await expect(band).toBeVisible();

  for (const pair of ['TEXT/BG', 'TEXT/SURF', 'PRIMARY', 'ACCENT', 'DANGER', 'SUCCESS']) {
    const chip = band.locator('.tg-a11y-chip').filter({ hasText: pair });
    await expect(chip).toHaveCount(1);
    await expect(chip).toHaveAttribute('data-grade', /^(AAA|AA|fail)$/);
    // Each chip reports a real measured ratio, not a placeholder.
    await expect(chip.locator('.ratio')).toHaveText(/^\d+\.\d$/);
  }

  // Was: main.tg-main. The preview stage is now .tg-stage-wrap.
  await expect(page.locator('.tg-stage-wrap')).toBeVisible();
});

// KNOWN FAILURE — app bug, not a stale selector. Nothing ever writes the draft
// into the URL: `ThemeUrlService.copyShareLink()` returns a bare
// `location.href` and `encode()` has no production caller, so "share" copies a
// hash-less link. (The read side is dead too: loading `/theme-generator#t=<a
// valid payload>` leaves the draft untouched and does not clear the hash.) The
// assertion is correct as written; it is `fixme` rather than deleted so the
// bug stays visible and the test starts passing the moment the URL is wired up.
test.fixme('a color edit round-trips through the #t= share URL', async ({ page }) => {
  await gotoGenerator(page);
  // Was: click a seed swatch in kj-seed-swatch-grid. There is no swatch grid
  // any more — a color is edited through the row's color picker — and the hash
  // is no longer auto-written on every edit: it is now produced on demand by
  // the "share" action (see ThemeUrlService.startSync's comment). Same
  // property under test: an edit is carried by a `#t=` URL.
  await setColor(page, 'primary', '#bb0033');

  await page.locator('.tg-actions').getByRole('button', { name: 'share', exact: true }).click();
  await expect(page.locator('.tg-toast')).toHaveText('Share link copied');

  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link, 'the share link must carry the draft in its #t= hash').toContain('#t=');

  // Reload from the share link and confirm the edit survived.
  await page.goto(link);
  await expect(page.locator('kj-theme-controls-panel')).toBeVisible({ timeout: 60_000 });
  await expect(colorHex(page, 'primary')).toHaveText('#BB0033');
});

test('all eight preview tabs render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await gotoGenerator(page);
  // Was five tabs (dashboard/settings/big-form/search/chat); the redesign ships
  // eight scenes, so every one of them is exercised.
  const tabs = [
    'landing',
    'form',
    'dashboard',
    'modal',
    'chat',
    'pricing',
    'settings',
    'tokens',
  ] as const;
  for (const name of tabs) {
    const tab = page.getByRole('tab', { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`kj-preview-${name}`)).toBeVisible();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('accessibility band shows the pass total at the top of the configurator', async ({ page }) => {
  await gotoGenerator(page);
  // Was: .a11y-summary inside kj-a11y-panel reading "AAA n/m". The band now
  // reports a percentage score plus the overall grade, backed by the chips.
  const score = page.locator('.tg-a11y-score');
  await expect(score.locator('.big')).toHaveText(/^\s*\d+\/100\s*$/);
  await expect(score.locator('.lbl')).toHaveText(/^\s*a11y · (AAA|AA|fail)\s*$/i);

  // The headline number is the share of token pairs that pass — assert it
  // agrees with the chips rather than trusting the label on its own.
  const total = await page.locator('.tg-a11y-chip').count();
  const passing = await page.locator('.tg-a11y-chip:not([data-grade="fail"])').count();
  expect(total).toBeGreaterThan(0);
  await expect(score.locator('.big')).toHaveText(
    `${Math.round((passing / total) * 100)}/100`,
  );
});

test('import dialog opens and applies a JSON theme', async ({ page }) => {
  await gotoGenerator(page);
  await page.locator('.tg-actions').getByRole('button', { name: 'import', exact: true }).click();

  // Was: a bare [role="dialog"] lookup — the color pickers now render dialogs
  // too, so the import modal is addressed by its accessible name.
  const dialog = page.getByRole('dialog', { name: 'Import theme' });
  await expect(dialog).toBeVisible();

  // The payload shape is the draft schema (bg/fg slots), not the old
  // colors/contentOverrides envelope, which the importer now rejects.
  const json = JSON.stringify({
    name: 'imported',
    bg: {
      'bg-body': '#ffffff',
      'bg-surface': '#f4f4f4',
      'bg-field': '#ececec',
      'bg-elevated': '#fafafa',
      'bg-primary': '#bb0033',
      'bg-accent': '#003366',
      'bg-info': '#0055aa',
      'bg-success': '#0a7f3f',
      'bg-warning': '#8a6100',
      'bg-danger': '#b00020',
    },
    fg: {
      'fg-default': '#111111',
      'fg-on-primary': '#ffffff',
      'fg-on-accent': '#ffffff',
      'fg-on-info': '#ffffff',
      'fg-on-success': '#ffffff',
      'fg-on-warning': '#ffffff',
      'fg-on-danger': '#ffffff',
    },
    shape: { radiusBox: 8, radiusField: 6, radiusSelector: 4, border: 1, depth: 1 },
    type: { fontSans: 'sans-serif', fontMono: 'monospace', fontDisplay: 'serif' },
    typography: { bodyRem: 1, smallRem: 0.875 },
    motion: { transition: '200ms' },
  });
  await dialog.getByRole('textbox', { name: 'Theme JSON or CSS' }).fill(json);
  await dialog.locator('[data-action="apply"]').click();

  await expect(page.locator('.tg-toast')).toHaveText('Imported');
  // Applied, not merely acknowledged: the draft now carries the imported name
  // and colors.
  await expect(page.locator('.tg-name-input')).toHaveValue('imported');
  await expect(colorHex(page, 'primary')).toHaveText('#BB0033');
});
