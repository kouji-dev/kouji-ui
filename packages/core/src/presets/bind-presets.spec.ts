import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Directive, InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KJ_VARIANT_PRESET, KjVariant } from './variant';
import { KJ_SIZE_PRESET, KjSize } from './size';
import { type KjBindablePresetConfig, bindPresets } from './bind-presets';
import { type KjDeepPartial, mergeKjConfig } from './merge-config';
import type { KjExtensible } from './preset-value';

interface DummyConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

const DUMMY_CONFIG = new InjectionToken<DummyConfig>('dummy.config');

describe('bindPresets', () => {
  it('translates a config token into KJ_VARIANT_PRESET', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DUMMY_CONFIG,
          useValue: {
            variants: ['a', 'b'],
            sizes: ['s', 'm'],
            defaults: { variant: 'b', size: 'm' },
          },
        },
        ...bindPresets(DUMMY_CONFIG),
      ],
    });
    expect(TestBed.inject(KJ_VARIANT_PRESET)).toEqual({ values: ['a', 'b'], default: 'b' });
  });

  it('translates a config token into KJ_SIZE_PRESET', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DUMMY_CONFIG,
          useValue: {
            variants: ['a'],
            sizes: ['s', 'm', 'l'],
            defaults: { variant: 'a', size: 'l' },
          },
        },
        ...bindPresets(DUMMY_CONFIG),
      ],
    });
    expect(TestBed.inject(KJ_SIZE_PRESET)).toEqual({ values: ['s', 'm', 'l'], default: 'l' });
  });
});

describe('the preset system is supported public API (cust F-11)', () => {
  // The extension points were exported *and* tagged `@internal` with "App code
  // does not import this directly", while `bindPresets`' own docstring said
  // "spread into a consumer directive's providers". `stripInternal` is not set,
  // so they shipped in the .d.ts either way — the tag only told consumers not
  // to use the one mechanism they need.
  it('no preset symbol is still tagged @internal', () => {
    const dir = join(process.cwd(), 'src', 'presets');
    for (const file of ['variant.ts', 'size.ts', 'bind-presets.ts', 'preset-value.ts', 'merge-config.ts']) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src, `${file} still marks a preset export @internal`).not.toContain('@internal');
    }
  });

  it('a third-party directive composes the same mechanism end to end', async () => {
    // A downstream library's own config: the generic shape plus whatever
    // extra fields it needs.
    interface AcmeChipConfig extends KjBindablePresetConfig {
      tones: string[];
    }
    const ACME_CHIP_DEFAULTS: AcmeChipConfig = {
      tones: ['quiet', 'loud'],
      variants: ['default', 'brand'],
      sizes: ['sm', 'md'],
      defaults: { variant: 'default', size: 'md' },
    };
    const ACME_CHIP_CONFIG = new InjectionToken<AcmeChipConfig>('acme.chip.config', {
      factory: () => ACME_CHIP_DEFAULTS,
    });
    function provideAcmeChip(config: KjDeepPartial<AcmeChipConfig>) {
      return [
        { provide: ACME_CHIP_CONFIG, useValue: mergeKjConfig(ACME_CHIP_DEFAULTS, config) },
      ];
    }

    @Directive({
      // eslint-disable-next-line @angular-eslint/directive-selector -- stands in for a downstream library's own prefix
      selector: '[acmeChip]',
      standalone: true,
      hostDirectives: [
        { directive: KjVariant, inputs: ['kjVariant'] },
        { directive: KjSize, inputs: ['kjSize'] },
      ],
      providers: [...bindPresets(ACME_CHIP_CONFIG)],
    })
    class AcmeChip {}

    TestBed.configureTestingModule({
      providers: [...provideAcmeChip({ defaults: { variant: 'brand' } })],
    });
    const { container } = await render(`<span acmeChip></span><span acmeChip kjSize="sm"></span>`, {
      imports: [AcmeChip],
    });
    const [a, b] = Array.from(container.querySelectorAll('[acmeChip]'));
    // Configured default flows in; the untouched sibling default survives.
    expect(a.getAttribute('data-variant')).toBe('brand');
    expect(a.getAttribute('data-size')).toBe('md');
    expect(b.getAttribute('data-size')).toBe('sm');
  });

  it('an extensible union accepts a consumer value while keeping the literals', () => {
    // Compile-time assertion: `KjExtensible<'a' | 'b'>` must accept both.
    const shipped: KjExtensible<'a' | 'b'> = 'a';
    const custom: KjExtensible<'a' | 'b'> = 'brand';
    expect([shipped, custom]).toEqual(['a', 'brand']);
  });
});
