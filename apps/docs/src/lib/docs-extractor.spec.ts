import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractDocsManifest } from './docs-extractor';

const FIXTURE_ROOT = resolve(__dirname, '../../tests/fixtures/extractor');

describe('docs-extractor @internal filter', () => {
  it('does not include @internal classes in the manifest', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const directiveNames = manifest.components.flatMap(c => c.directives.map(d => d.className));
    expect(directiveNames).toContain('PublicDirective');
    expect(directiveNames).not.toContain('InternalDirective');
  });

  it('does not include @internal inputs of a public class', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const directives = manifest.components.flatMap(c => c.directives);
    const publicDir = directives.find(d => d.className === 'PublicDirective');
    expect(publicDir).toBeDefined();
    const inputNames = (publicDir!.inputs ?? []).map(i => i.name);
    expect(inputNames).toContain('publicInput');
    expect(inputNames).not.toContain('internalInput');
  });

  it('does not include @internal injection tokens', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const tokenNames = manifest.components.flatMap(c => (c.tokens ?? []).map(t => t.name));
    expect(tokenNames).toContain('PUBLIC_TOKEN');
    expect(tokenNames).not.toContain('INTERNAL_TOKEN');
  });

  it('resolves hostDirectives-forwarded input types from the source directive', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const directives = manifest.components.flatMap(c => c.directives);
    const consumer = directives.find(d => d.className === 'ConsumerDirective');
    expect(consumer).toBeDefined();
    const forwarded = consumer!.inputs.find(i => i.name === 'kjVariantLike');
    expect(forwarded).toBeDefined();
    // The type was unwrapped from `InputSignal<string>` on `InternalDirective`
    // and copied across via the registry — not left as the 'unknown' placeholder.
    expect(forwarded!.type).toBe('string');
    // Resolution metadata is stripped from the public manifest.
    expect(forwarded).not.toHaveProperty('sourceDirective');
  });
});
