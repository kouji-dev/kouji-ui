import { resolve } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import { extractDocsManifest } from './docs-extractor';

const FIXTURE_ROOT = resolve(__dirname, '../../tests/fixtures/extractor');

// extractor caches the manifest; reset between tests if needed.
// (Multiple tests against the same FIXTURE_ROOT produce the same manifest, so caching is fine.)

describe('docs-extractor v2', () => {
  it('emits a page for the public directive (with @doc tags)', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const publicPage = manifest.pages.find(p => p.name === 'public');
    expect(publicPage).toBeDefined();
    const main = publicPage!.items.find(i => i.id === publicPage!.mainItemId);
    expect(main?.symbol).toBe('PublicDirective');
  });

  it('does not include the @internal directive', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const allSymbols = manifest.pages.flatMap(p => p.items.map(i => i.symbol));
    expect(allSymbols).toContain('PublicDirective');
    expect(allSymbols).not.toContain('InternalDirective');
  });

  it('groups provider/inject/function items into a single function-page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'function-page');
    expect(page).toBeDefined();
    const kinds = page!.items.map(i => i.kind);
    expect(kinds).toContain('provider-fn');
    expect(kinds).toContain('inject-fn');
    expect(kinds).toContain('function');
    expect(page!.items[0].id).toBe(page!.mainItemId);
  });

  it('emits a service page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'svc-page');
    expect(page).toBeDefined();
    const main = page!.items.find(i => i.id === page!.mainItemId);
    expect(main?.kind).toBe('service');
    expect(main?.service?.methods.map(m => m.name)).toContain('register');
  });

  it('emits a const page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'const-page');
    expect(page).toBeDefined();
    const main = page!.items.find(i => i.id === page!.mainItemId);
    expect(main?.kind).toBe('const');
  });

  it('resolves hostDirectives-forwarded input types', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const consumer = manifest.pages
      .find(p => p.name === 'consumer')
      ?.items.find(i => i.directive?.className === 'ConsumerDirective');
    expect(consumer).toBeDefined();
    const forwarded = consumer!.directive!.inputs.find(i => i.name === 'kjVariantLike');
    expect(forwarded?.type).toBe('string');
  });
});
