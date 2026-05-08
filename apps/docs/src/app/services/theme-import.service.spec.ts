import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeImportService } from './theme-import.service';

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
    expect(svc.detectFormat('[data-theme="x"] { --kj-color-primary: #f00; }')).toBe('css');
  });

  test('parseCss extracts colors and shape', () => {
    const css = `[data-theme="x"] {
      --kj-color-primary: #336699;
      --kj-color-base-100: #ffffff;
      --kj-radius-field: 8;
      --kj-font-sans: "Inter", sans-serif;
    }`;
    const r = svc.parseCss(css);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.colors.primary.toLowerCase()).toBe('#336699');
      expect(r.draft.colors['base-100'].toLowerCase()).toBe('#ffffff');
      expect(r.draft.shape.radiusField).toBe(8);
      expect(r.draft.type.fontSans).toContain('Inter');
    }
  });

  test('rejects empty/garbage CSS', () => {
    expect(svc.parseCss('').ok).toBe(false);
    expect(svc.parseCss('not css').ok).toBe(false);
  });

  test('parseJson rejects malformed JSON', () => {
    expect(svc.parseJson('{ broken').ok).toBe(false);
  });

  test('parseJson accepts a valid theme JSON', () => {
    const draft = {
      name: 'imported',
      colors: { 'base-100':'#fff', primary:'#000', secondary:'#000', accent:'#000', neutral:'#000',
        info:'#000', success:'#000', warning:'#000', destructive:'#000' },
      contentOverrides: {},
      shape: { radiusBox:8, radiusField:6, radiusSelector:4, border:1, depth:1 },
      type: { fontSans:'sans-serif', fontMono:'monospace', fontDisplay:'serif' },
      motion: { transition:'200ms' },
    };
    const r = svc.parseJson(JSON.stringify(draft));
    expect(r.ok).toBe(true);
  });
});
