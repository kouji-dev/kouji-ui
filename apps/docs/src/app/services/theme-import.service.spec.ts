import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeImportService } from './theme-import.service';
import { ThemeDraftService } from './theme-draft.service';
import { BG_SLOTS, FG_SLOTS } from '../lib/theme/types';

/** A payload matching the current `DraftThemeSchema` (17-slot bg/fg model). */
function validDraftJson(overrides: Record<string, unknown> = {}) {
  return {
    name: 'imported',
    bg: Object.fromEntries(BG_SLOTS.map(s => [s, '#ffffff'])),
    fg: Object.fromEntries(FG_SLOTS.map(s => [s, '#000000'])),
    shape: { radiusBox: 8, radiusField: 6, radiusSelector: 4, border: 1, depth: 1 },
    type: { fontSans: 'sans-serif', fontMono: 'monospace', fontDisplay: 'serif' },
    typography: { bodyRem: 1, smallRem: 0.875 },
    motion: { transition: '200ms' },
    ...overrides,
  };
}

describe('ThemeImportService', () => {
  let svc: ThemeImportService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeImportService);
  });

  test('detects JSON by leading {', () => {
    expect(svc.detectFormat('{"name":"x"}')).toBe('json');
    expect(svc.detectFormat('  \n{"name":"x"}')).toBe('json');
  });

  test('detects CSS by --kj-* properties', () => {
    expect(svc.detectFormat('[data-theme="x"] { --kj-bg-primary: #f00; }')).toBe('css');
  });

  test('parseCss extracts bg / fg slots, shape and fonts', () => {
    const css = `[data-theme="x"] {
      --kj-bg-primary: #336699;
      --kj-bg-body: #ffffff;
      --kj-fg-default: #101010;
      --kj-radius-field: 8;
      --kj-font-sans: "Inter", sans-serif;
    }`;
    const r = svc.parseCss(css);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.bg['bg-primary'].toLowerCase()).toBe('#336699');
      expect(r.draft.bg['bg-body'].toLowerCase()).toBe('#ffffff');
      expect(r.draft.fg['fg-default'].toLowerCase()).toBe('#101010');
      expect(r.draft.shape.radiusField).toBe(8);
      expect(r.draft.type.fontSans).toContain('Inter');
    }
  });

  test('parseCss leaves slots the CSS does not mention at their seed value', () => {
    const r = svc.parseCss('[data-theme="x"] { --kj-bg-primary: #336699; }');
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Every slot is still populated — an import never yields a half theme.
      for (const slot of BG_SLOTS) expect(r.draft.bg[slot]).toBeTruthy();
      for (const slot of FG_SLOTS) expect(r.draft.fg[slot]).toBeTruthy();
    }
  });

  test('rejects empty/garbage CSS', () => {
    expect(svc.parseCss('').ok).toBe(false);
    expect(svc.parseCss('not css').ok).toBe(false);
  });

  test('parseJson rejects malformed JSON', () => {
    expect(svc.parseJson('{ broken').ok).toBe(false);
  });

  test('parseJson rejects the pre-migration `colors` shape', () => {
    const legacy = { name: 'old', colors: { primary: '#000' }, contentOverrides: {} };
    const r = svc.parseJson(JSON.stringify(legacy));
    expect(r.ok).toBe(false);
  });

  test('parseJson accepts a valid theme JSON', () => {
    const r = svc.parseJson(JSON.stringify(validDraftJson()));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.draft.bg['bg-primary']).toBe('#ffffff');
  });

  test('apply pushes the parsed draft into the draft service', () => {
    const r = svc.parseJson(JSON.stringify(validDraftJson({ name: 'applied' })));
    expect(r.ok).toBe(true);
    if (r.ok) {
      svc.apply(r.draft);
      expect(TestBed.inject(ThemeDraftService).draft().name).toBe('applied');
    }
  });
});
