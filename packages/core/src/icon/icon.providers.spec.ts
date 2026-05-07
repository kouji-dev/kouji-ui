import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  provideIconLoader,
  provideIconResolver,
  provideIcons,
} from './icon.providers';
import {
  KJ_ICON_LOADER,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

describe('provideIcons', () => {
  it('seeds the registry with the given map', () => {
    TestBed.configureTestingModule({
      providers: [provideIcons({ settings: 'url("a")', save: 'url("b")' })],
    });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({ settings: 'url("a")', save: 'url("b")' });
  });

  it('merges multiple provideIcons calls (last wins on collision)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideIcons({ settings: 'url("first")', save: 'url("b")' }),
        provideIcons({ settings: 'url("second")', trash: 'url("c")' }),
      ],
    });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({
      settings: 'url("second")',
      save: 'url("b")',
      trash: 'url("c")',
    });
  });

  it('default registry is empty when no provideIcons is called', () => {
    TestBed.configureTestingModule({ providers: [] });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({});
  });
});

describe('provideIconResolver', () => {
  it('overrides the default resolver', () => {
    TestBed.configureTestingModule({
      providers: [provideIconResolver((n) => `url("/icons/${n}.svg")`)],
    });
    const fn = TestBed.inject(KJ_ICON_RESOLVER);
    expect(fn('settings')).toBe('url("/icons/settings.svg")');
  });
});

describe('provideIconLoader', () => {
  it('registers an async loader', async () => {
    const loader = async (n: string) => `url("loaded:${n}")`;
    TestBed.configureTestingModule({ providers: [provideIconLoader(loader)] });
    const fn = TestBed.inject(KJ_ICON_LOADER);
    expect(fn).not.toBeNull();
    await expect(fn!('x')).resolves.toBe('url("loaded:x")');
  });
});
