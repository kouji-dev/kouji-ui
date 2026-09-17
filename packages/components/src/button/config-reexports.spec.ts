import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import * as componentsApi from '../public-api';
import { KjButtonComponent } from './button';

/**
 * cust F-19 — `@kouji-ui/components` re-exported a hand-picked set of core
 * classes to satisfy AOT template type-checking, and not one `provideKj*`,
 * `KJ_*_CONFIG` or `KJ_*_DEFAULTS`. A consumer who installed the styled
 * package had to add a second package to their import list to configure the
 * component they had just imported — the discoverability half of "the preset
 * system is the good mechanism".
 */

/** Every `provideKj*` the core package defines, by source-file scan. */
function coreProviderNames(): string[] {
  const root = join(process.cwd(), '..', 'core', 'src');
  const names = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_examples') continue;
        walk(full);
      } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
        const src = readFileSync(full, 'utf8');
        for (const m of src.matchAll(/^export function (provideKj\w+)/gm)) names.add(m[1]);
      }
    }
  };
  walk(root);
  return [...names].sort();
}

describe('@kouji-ui/components surfaces the configuration API', () => {
  it('re-exports every provideKj* that @kouji-ui/core defines', () => {
    const missing = coreProviderNames().filter((name) => !(name in componentsApi));
    expect(missing, `not re-exported from components/public-api.ts: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('re-exports the config token and defaults next to each provider', () => {
    for (const name of [
      'KJ_BUTTON_CONFIG',
      'KJ_BUTTON_DEFAULTS',
      'KJ_ALERT_CONFIG',
      'KJ_ALERT_DEFAULTS',
      'KJ_SPINNER_CONFIG',
      'KJ_SPINNER_DEFAULTS',
      'KJ_TAG_CONFIG',
      'KJ_TAG_DEFAULTS',
      'KJ_PAGINATION_CONFIG',
      'KJ_PAGINATION_DEFAULTS',
      'KJ_BREADCRUMB_CONFIG',
      'KJ_BREADCRUMB_DEFAULTS',
      'KJ_TABS_CONFIG',
      'KJ_TABS_DEFAULTS',
    ]) {
      expect(name in componentsApi, `${name} missing`).toBe(true);
    }
  });

  it('re-exports the build-your-own preset mechanism', () => {
    for (const name of [
      'KjVariant',
      'KjSize',
      'bindPresets',
      'mergeKjConfig',
      'KJ_VARIANT_PRESET',
      'KJ_SIZE_PRESET',
      'KJ_VARIANT_FALLBACK',
      'KJ_SIZE_FALLBACK',
    ]) {
      expect(name in componentsApi, `${name} missing`).toBe(true);
    }
  });

  it('re-exports the i18n surface, the library-wide string contract', () => {
    for (const name of ['EN_CATALOG', 'FR_CATALOG', 'KjTranslateService', 'provideKjTranslations']) {
      expect(name in componentsApi, `${name} missing`).toBe(true);
    }
  });

  it('a provider imported from the components barrel really configures a component', async () => {
    const { provideKjButton, KJ_BUTTON_DEFAULTS } = componentsApi;

    @Component({
      standalone: true,
      imports: [KjButtonComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      providers: [
        ...provideKjButton({
          variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand'],
          defaults: { variant: 'brand' },
        }),
      ],
      template: `<kj-button>Go</kj-button>`,
    })
    class Host {}

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('.kj-button')!;
    expect(button.getAttribute('data-variant')).toBe('brand');
    // Deep merge: naming one default keeps the sibling one.
    expect(button.getAttribute('data-size')).toBe(KJ_BUTTON_DEFAULTS.defaults.size);
  });
});
