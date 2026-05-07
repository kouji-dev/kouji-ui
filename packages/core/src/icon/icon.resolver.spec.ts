import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideIcons, provideIconLoader, provideIconResolver } from './icon.providers';
import { kjInjectIconResolver } from './icon.resolver';
import { KJ_ICON_REGISTRY } from './icon.tokens';

function makeResolver(providers: any[]) {
  TestBed.configureTestingModule({ providers });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () => kjInjectIconResolver());
}

describe('kjInjectIconResolver', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('registry path', () => {
    it('returns the registry value when name is registered', () => {
      const resolve = makeResolver([
        provideIcons({ settings: 'url("a")' }),
      ]);
      expect(resolve('settings')).toBe('url("a")');
    });
  });

  describe('fallback resolver path (no loader)', () => {
    it('falls back to KJ_ICON_RESOLVER when name is missing', () => {
      const resolve = makeResolver([
        provideIconResolver((n) => `url("/icons/${n}.svg")`),
      ]);
      expect(resolve('missing')).toBe('url("/icons/missing.svg")');
    });

    it('default resolver returns name unchanged', () => {
      const resolve = makeResolver([]);
      expect(resolve('missing')).toBe('missing');
    });
  });

  describe('loader path', () => {
    it('returns null while load is pending, then fills registry on success', async () => {
      let resolveLoad: (v: string) => void;
      const loader = vi.fn(
        (n: string) =>
          new Promise<string>((res) => {
            resolveLoad = (v) => res(v);
          }),
      );
      const resolve = makeResolver([provideIconLoader(loader)]);

      expect(resolve('settings')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(1);

      // Concurrent call must NOT trigger a second load (dedupe).
      expect(resolve('settings')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(1);

      resolveLoad!('url("loaded")');
      await Promise.resolve();
      await Promise.resolve();

      expect(resolve('settings')).toBe('url("loaded")');
    });

    it('on loader rejection, removes pending so a subsequent call retries', async () => {
      let calls = 0;
      const loader = vi.fn(async (n: string) => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return 'url("ok")';
      });
      const resolve = makeResolver([provideIconLoader(loader)]);

      expect(resolve('x')).toBeNull();
      await Promise.resolve();
      await Promise.resolve();
      expect(resolve('x')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(2);
      await Promise.resolve();
      await Promise.resolve();
      expect(resolve('x')).toBe('url("ok")');
    });

    it('loader path takes precedence over fallback resolver', async () => {
      const loader = async () => 'url("from-loader")';
      const resolve = makeResolver([
        provideIconLoader(loader),
        provideIconResolver(() => 'url("from-fallback")'),
      ]);
      expect(resolve('x')).toBeNull();
      await Promise.resolve();
      await Promise.resolve();
      expect(resolve('x')).toBe('url("from-loader")');
    });
  });
});
