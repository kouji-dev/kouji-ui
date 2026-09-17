import { ApplicationRef, EnvironmentInjector, Injector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KJ_ICON_LOADER, KJ_ICON_REGISTRY, injectKjIconResolver } from '@kouji-ui/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLucideIconLoader,
  lucideIconEntries,
  pascalToKebab,
  provideLucideIcons,
} from './provide-lucide-icons';

const SETTINGS = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"/></svg>';
const TRASH = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18"/></svg>';

describe('pascalToKebab', () => {
  it('follows Lucide naming, including grouped digits', () => {
    expect(pascalToKebab('AArrowDown')).toBe('a-arrow-down');
    expect(pascalToKebab('Heading1')).toBe('heading-1');
    expect(pascalToKebab('Clock10')).toBe('clock-10');
    expect(pascalToKebab('AlarmClockCheck')).toBe('alarm-clock-check');
    expect(pascalToKebab('Settings')).toBe('settings');
  });
});

describe('provideLucideIcons(subset) — tree-shaken named imports', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('registers each icon under its kebab name as a CSS url() data URI, synchronously', () => {
    TestBed.configureTestingModule({
      providers: [provideLucideIcons({ Settings: SETTINGS, 'trash-2': TRASH })],
    });
    const registry = TestBed.inject(KJ_ICON_REGISTRY)();
    expect(Object.keys(registry).sort()).toEqual(['settings', 'trash-2']);
    expect(registry['settings']).toMatch(/^url\("data:image\/svg\+xml;utf8,%3Csvg/);
    expect(registry['settings']).toContain('cx=\'12\'');
    // No loader is installed: nothing can trigger a lucide-static import.
    expect(TestBed.inject(KJ_ICON_LOADER)).toBeNull();
  });

  it('normalises export names the way lucideIconEntries does', () => {
    expect(Object.keys(lucideIconEntries({ Trash2: TRASH, AArrowDown: SETTINGS, check: TRASH }))).toEqual([
      'trash-2',
      'a-arrow-down',
      'check',
    ]);
  });

  it('scopes to the injector it is provided in and layers over the parent (route-level icons)', () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons({ Settings: SETTINGS })] });
    const root = TestBed.inject(EnvironmentInjector);
    const route = createEnvironmentInjector(
      [provideLucideIcons({ Settings: TRASH, Trash2: TRASH })],
      root,
    );

    const rootMap = root.get(KJ_ICON_REGISTRY)();
    const routeMap = route.get(KJ_ICON_REGISTRY)();
    expect(Object.keys(rootMap)).toEqual(['settings']);
    expect(Object.keys(routeMap).sort()).toEqual(['settings', 'trash-2']);
    // The route shadows `settings` for its own subtree only.
    expect(routeMap['settings']).not.toBe(rootMap['settings']);
    expect(rootMap['settings']).toContain('circle');

    const resolveInRoute = runInInjectionContext(route, () => injectKjIconResolver());
    expect(resolveInRoute('trash-2')).toBe(routeMap['trash-2']);
  });
});

describe('provideLucideIcons() — the whole set as a lazy chunk', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('installs a loader and an app-level registry, nothing eager', () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons()] });
    expect(TestBed.inject(KJ_ICON_REGISTRY)()).toEqual({});
    expect(TestBed.inject(KJ_ICON_LOADER)).toBeTypeOf('function');
  });

  it('resolves a name once the namespace chunk arrives, and blocks stability meanwhile', async () => {
    let release: (ns: object) => void = () => {};
    const importer = vi.fn(() => new Promise<object>((res) => (release = res)));
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_ICON_LOADER, useValue: createLucideIconLoader(importer) }],
    });
    const resolve = runInInjectionContext(TestBed.inject(Injector), () => injectKjIconResolver());
    const appRef = TestBed.inject(ApplicationRef);

    expect(resolve('settings')).toBeNull();
    expect(resolve('trash-2')).toBeNull();
    expect(importer).toHaveBeenCalledTimes(1);

    let stable = false;
    void appRef.whenStable().then(() => (stable = true));
    await Promise.resolve();
    await Promise.resolve();
    expect(stable, 'a pending icon load holds a pending task').toBe(false);

    release({ Settings: SETTINGS, Trash2: TRASH, default: {} });
    await appRef.whenStable();

    expect(resolve('settings')).toMatch(/^url\("data:image\/svg\+xml;utf8,%3Csvg/);
    expect(resolve('trash-2')).toContain('M3 6h18');
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown name with a message that points at the name list', async () => {
    const loader = createLucideIconLoader(() => Promise.resolve({ Settings: SETTINGS }));
    await expect(loader('not-an-icon')).rejects.toThrow(/"not-an-icon" is not a Lucide icon name/);
  });

  it('names the missing peer and the install command when lucide-static is absent, then retries', async () => {
    let attempts = 0;
    const loader = createLucideIconLoader(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error("Cannot find module 'lucide-static'"))
        : Promise.resolve({ Settings: SETTINGS });
    });
    const failed = loader('settings');
    await expect(failed).rejects.toThrow(/optional peer dependency of @kouji-ui\/components/);
    await expect(failed).rejects.toThrow(/pnpm add lucide-static/);
    await expect(failed).rejects.toMatchObject({ cause: expect.any(Error) });
    // A later request tries the import again instead of caching the failure.
    await expect(loader('settings')).resolves.toContain('circle');
    expect(attempts).toBe(2);
  });

  it('loads the real lucide-static namespace on demand', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons()] });
    const resolve = runInInjectionContext(TestBed.inject(Injector), () => injectKjIconResolver());
    expect(resolve('a-arrow-down')).toBeNull();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(resolve('a-arrow-down')).toMatch(/^url\("data:image\/svg\+xml;utf8,%3Csvg/);
    // Digit-bearing names resolve too (the pascalToKebab contract).
    expect(resolve('heading-1')).toBeNull();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(resolve('heading-1')).toContain('%3Csvg');
  }, 60_000);
});
