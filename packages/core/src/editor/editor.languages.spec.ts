import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { KjEditorLoader } from './editor.loader';
import { normalizeLanguage, provideMonacoLanguages } from './editor.languages';

describe('normalizeLanguage', () => {
  it('maps short aliases to canonical Monaco ids', () => {
    expect(normalizeLanguage('ts')).toBe('typescript');
    expect(normalizeLanguage('js')).toBe('javascript');
    expect(normalizeLanguage('md')).toBe('markdown');
    expect(normalizeLanguage('yml')).toBe('yaml');
    expect(normalizeLanguage('sh')).toBe('shell');
  });

  it('lower-cases and passes through unknown/canonical ids', () => {
    expect(normalizeLanguage('HTML')).toBe('html');
    expect(normalizeLanguage('python')).toBe('python');
  });

  it('falls back to plaintext for empty/nullish', () => {
    expect(normalizeLanguage('')).toBe('plaintext');
    expect(normalizeLanguage(null)).toBe('plaintext');
    expect(normalizeLanguage(undefined)).toBe('plaintext');
  });
});

describe('KjEditorLoader.ensureLanguage (provideMonacoLanguages)', () => {
  it('runs a registered loader once, on demand, and no-ops for unregistered ids', async () => {
    const python = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [provideMonacoLanguages({ python })],
    });
    const loader = TestBed.inject(KjEditorLoader);

    // Alias resolves to the registered canonical id.
    await loader.ensureLanguage('py');
    expect(python).toHaveBeenCalledTimes(1);

    // Memoised — a second request does not reload.
    await loader.ensureLanguage('python');
    expect(python).toHaveBeenCalledTimes(1);

    // Unregistered language resolves without throwing (built-in fallback).
    await expect(loader.ensureLanguage('typescript')).resolves.toBeUndefined();
  });
});
