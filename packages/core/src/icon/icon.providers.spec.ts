import { EnvironmentInjector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  provideIconLoader,
  provideIconResolver,
  provideIcons,
} from './icon.providers';
import { injectKjIconResolver } from './icon.resolver';
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

describe('provideIcons — hierarchical registries', () => {
  beforeEach(() => TestBed.resetTestingModule());

  function rootWith(map: Record<string, string>): EnvironmentInjector {
    TestBed.configureTestingModule({ providers: [provideIcons(map)] });
    return TestBed.inject(EnvironmentInjector);
  }

  it('a child environment injector layers its icons over the parent and can shadow a name', () => {
    const root = rootWith({ settings: 'url("root")', save: 'url("root-save")' });
    const child = createEnvironmentInjector(
      [provideIcons({ settings: 'url("child")', trash: 'url("child-trash")' })],
      root,
    );

    expect(child.get(KJ_ICON_REGISTRY)()).toEqual({
      settings: 'url("child")',
      save: 'url("root-save")',
      trash: 'url("child-trash")',
    });
    // The parent never sees the child's entries — nothing is page-global.
    expect(root.get(KJ_ICON_REGISTRY)()).toEqual({ settings: 'url("root")', save: 'url("root-save")' });
  });

  it('two sibling injectors each resolve their own icons', () => {
    const root = rootWith({ shared: 'url("shared")' });
    const a = createEnvironmentInjector([provideIcons({ close: 'url("a-close")' })], root);
    const b = createEnvironmentInjector([provideIcons({ close: 'url("b-close")' })], root);

    const resolveA = runInInjectionContext(a, () => injectKjIconResolver());
    const resolveB = runInInjectionContext(b, () => injectKjIconResolver());
    expect(resolveA('close')).toBe('url("a-close")');
    expect(resolveB('close')).toBe('url("b-close")');
    expect(resolveA('shared')).toBe('url("shared")');
    expect(resolveB('shared')).toBe('url("shared")');
  });

  it('a child registry follows later writes to the parent and keeps its own loader results', () => {
    const root = rootWith({ settings: 'url("root")' });
    const child = createEnvironmentInjector([provideIcons({ local: 'url("local")' })], root);
    const rootRegistry = root.get(KJ_ICON_REGISTRY);
    const childRegistry = child.get(KJ_ICON_REGISTRY);

    // A loader result written into the child (what injectKjIconResolver does).
    childRegistry.update((m) => ({ ...m, loaded: 'url("loaded")' }));
    // The parent learns a new icon afterwards.
    rootRegistry.update((m) => ({ ...m, later: 'url("later")' }));

    expect(childRegistry()).toEqual({
      settings: 'url("root")',
      local: 'url("local")',
      loaded: 'url("loaded")',
      later: 'url("later")',
    });
    expect(rootRegistry()).toEqual({ settings: 'url("root")', later: 'url("later")' });
  });

  it('a child that provides no icons of its own shares the parent registry', () => {
    const root = rootWith({ settings: 'url("root")' });
    const child = createEnvironmentInjector([], root);
    expect(child.get(KJ_ICON_REGISTRY)).toBe(root.get(KJ_ICON_REGISTRY));
  });
});
