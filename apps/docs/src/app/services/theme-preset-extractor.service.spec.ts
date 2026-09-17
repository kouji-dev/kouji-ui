import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemePresetExtractor } from './theme-preset-extractor.service';

/**
 * The extractor reads live CSS custom properties. In a document where the
 * theme stylesheets are not loaded — jsdom here, but equally a blocked or
 * not-yet-arrived stylesheet in a browser — `getComputedStyle()` answers `''`
 * for every `--kj-*` slot. Returning that as a `DraftTheme` produced a theme
 * of empty strings that crashed `deriveFromSeed('')` inside culori; `null`
 * lets `ThemeDraftService` fall back to the hardcoded snapshot instead.
 */
describe('ThemePresetExtractor', () => {
  let svc: ThemePresetExtractor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemePresetExtractor);
  });

  test('returns null when no theme stylesheet declares the tokens', () => {
    expect(svc.extract('kouji')).toBeNull();
  });

  test('leaves no probe element behind', () => {
    // Scoped to <body>: this pool runs `isolate: false`, and ThemeService
    // legitimately leaves `data-theme` on <html> from another spec file.
    const probes = () =>
      document.body.querySelectorAll('div[data-theme="kouji"][aria-hidden="true"]').length;
    expect(probes()).toBe(0);
    svc.extract('kouji');
    expect(probes()).toBe(0);
  });

  test('extracts a complete theme once the tokens resolve', () => {
    const style = document.createElement('style');
    style.textContent = `[data-theme="kouji"] {
      --kj-bg-body:#fff; --kj-bg-surface:#fff; --kj-bg-field:#fff; --kj-bg-elevated:#fff;
      --kj-bg-primary:#c4ff3d; --kj-bg-accent:#0af; --kj-bg-info:#06c;
      --kj-bg-success:#0a0; --kj-bg-warning:#fa0; --kj-bg-danger:#c00;
      --kj-fg-default:#111; --kj-fg-on-primary:#111; --kj-fg-on-accent:#111;
      --kj-fg-on-info:#fff; --kj-fg-on-success:#fff; --kj-fg-on-warning:#111;
      --kj-fg-on-danger:#fff;
    }`;
    document.head.appendChild(style);
    try {
      const theme = svc.extract('kouji');
      expect(theme).not.toBeNull();
      expect(theme!.bg['bg-primary']).toBe('#c4ff3d');
      expect(theme!.fg['fg-on-danger']).toBe('#fff');
    } finally {
      style.remove();
    }
  });
});
